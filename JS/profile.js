// ========================================
// PROFILE PAGE - OPTIPLAY
// ========================================

class ProfileManager {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.purchases = [];
    this.isUploading = false;
    this.init();
  }

  async init() {
    await this.waitForSupabase();
    await this.loadUserData();
    await this.loadPurchases();
    this.attachEventListeners();
  }

  // Attendre que Supabase soit disponible
  async waitForSupabase() {
    return new Promise((resolve) => {
      const checkSupabase = () => {
        if (window.OptiPlayConfig?.supabaseClient) {
          this.supabase = window.OptiPlayConfig.supabaseClient;
          resolve();
        } else {
          setTimeout(checkSupabase, 100);
        }
      };
      checkSupabase();
    });
  }

  // Charger les données de l'utilisateur
  async loadUserData() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error || !user) {
        window.location.href = '../HTML/login.html';
        return;
      }

      this.currentUser = user;

      // Charger le profil depuis la base de données
      let profile = null;
      try {
        const { data } = await this.supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        profile = data;
      } catch (profileError) {
        console.log('Profil non trouvé, utilisation des données user_metadata');
      }

      // Charger le plan d'abonnement
      await this.loadUserSubscription();

      this.updateProfileUI(user, profile);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      // Charger quand même avec les données de base
      if (this.currentUser) {
        this.updateProfileUI(this.currentUser, null);
      }
    }
  }

  // Charger l'abonnement de l'utilisateur
  async loadUserSubscription() {
    try {
      const { data, error } = await this.supabase
        .from('subscriptions')
        .select('plan_type, billing_type, status, current_period_end')
        .eq('user_id', this.currentUser.id)
        .eq('status', 'active')
        .gte('current_period_end', new Date().toISOString())
        .single();

      if (error || !data) {
        this.updateSubscriptionUI('free');
        return;
      }

      this.updateSubscriptionUI(data.plan_type);
    } catch (error) {
      console.error('Erreur chargement abonnement:', error);
      this.updateSubscriptionUI('free');
    }
  }

  // Mettre à jour l'UI de l'abonnement
  updateSubscriptionUI(planType) {
    const planNames = {
      'free': 'Gratuit',
      'beginner': 'Débutant',
      'advanced': 'Avancé',
      'premium': 'Premium'
    };

    const planColors = {
      'free': '#10b981',
      'beginner': '#3b82f6',
      'advanced': '#8b5cf6',
      'premium': '#f59e0b'
    };

    const currentPlanElement = document.getElementById('currentPlan');
    const subscriptionCard = document.getElementById('subscriptionCard');
    
    if (currentPlanElement) {
      currentPlanElement.textContent = planNames[planType] || 'Gratuit';
    }

    if (subscriptionCard) {
      subscriptionCard.setAttribute('data-plan', planType);
      const icon = subscriptionCard.querySelector('.stat-icon-plan');
      if (icon) {
        icon.style.background = `linear-gradient(135deg, ${planColors[planType]}22, ${planColors[planType]}44)`;
        icon.style.color = planColors[planType];
      }
    }
  }

  // Mettre à jour l'interface avec les données du profil
  updateProfileUI(user, profile) {
    try {
      // Récupérer le pseudo depuis user_metadata ou profile
      const metadata = user.user_metadata || {};
      const pseudo = metadata.pseudo || profile?.pseudo || user.email.split('@')[0];
      
      // Nom d'utilisateur (afficher le pseudo)
      const nameElement = document.getElementById('profileName');
      if (nameElement) {
        nameElement.textContent = pseudo;
      }
      
      // Afficher le pseudo au lieu de l'email
      const emailElement = document.getElementById('profileEmail');
      if (emailElement) {
        emailElement.textContent = `@${pseudo}`;
      }

      // Afficher le badge de rôle
      this.updateRoleBadge(profile?.app_role || 'user');
      
      // Date d'inscription
      const joinDate = new Date(user.created_at).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric'
      });
      const memberSinceElement = document.getElementById('memberSince');
      if (memberSinceElement) {
        memberSinceElement.innerHTML = `
          <i class="fas fa-calendar"></i>
          Membre depuis ${joinDate}
        `;
      }

      // Avatar - Charger UNIQUEMENT depuis la base de données OptiPlay
      const avatar = document.getElementById('profileAvatar');
      if (avatar) {
        // Utiliser UNIQUEMENT l'avatar de la table profiles (pas Discord)
        const avatarUrl = profile?.avatar_url;
        
        if (avatarUrl) {
          // Si c'est un chemin Supabase Storage (avatars/UUID.ext)
          if (avatarUrl.startsWith('avatars/')) {
            // Extraire juste le nom du fichier
            const fileName = avatarUrl.replace('avatars/', '');
            const { data } = this.supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);
            
            if (data?.publicUrl) {
              avatar.innerHTML = `<img src="${data.publicUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
              this.setDefaultAvatar(avatar, pseudo);
            }
          } else {
            // URL complète
            avatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
          }
        } else {
          this.setDefaultAvatar(avatar, pseudo);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'UI:', error);
    }
  }

  // Définir l'avatar par défaut avec les initiales
  setDefaultAvatar(avatarElement, pseudo) {
    const initials = pseudo.substring(0, 2).toUpperCase();
    avatarElement.innerHTML = initials;
    avatarElement.style.display = 'flex';
    avatarElement.style.alignItems = 'center';
    avatarElement.style.justifyContent = 'center';
    avatarElement.style.fontSize = '2rem';
    avatarElement.style.fontWeight = 'bold';
  }

  // Upload avatar vers Supabase Storage
  async uploadAvatar(file) {
    if (this.isUploading) return false;
    
    this.isUploading = true;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${this.currentUser.id}.${fileExt}`;
      const filePath = fileName; // Pas de préfixe, le bucket est déjà 'avatars'

      // Upload vers Supabase Storage
      const { data, error } = await this.supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (error) throw error;

      // Mettre à jour la table profiles (prioritaire)
      const { error: profileError } = await this.supabase
        .from('profiles')
        .update({ avatar_url: `avatars/${filePath}` })
        .eq('id', this.currentUser.id);

      if (profileError) {
        console.error('Erreur mise à jour profil:', profileError);
      }

      // Mettre à jour user_metadata aussi (pour compatibilité)
      const { error: updateError } = await this.supabase.auth.updateUser({
        data: {
          avatar_url: `avatars/${filePath}`
        }
      });

      if (updateError) throw updateError;

      // Attendre un peu que le fichier soit bien disponible
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mettre à jour l'avatar directement sans recharger toute la page
      const { data: publicUrlData } = this.supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      if (publicUrlData?.publicUrl) {
        const avatar = document.getElementById('profileAvatar');
        if (avatar) {
          // Créer une nouvelle image pour forcer le rechargement
          const img = new Image();
          img.onload = () => {
            avatar.innerHTML = `<img src="${publicUrlData.publicUrl}?t=${Date.now()}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
          };
          img.onerror = () => {
            console.error('Erreur chargement image');
            avatar.innerHTML = `<img src="${publicUrlData.publicUrl}?t=${Date.now()}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
          };
          img.src = `${publicUrlData.publicUrl}?t=${Date.now()}`;
        }
      }
      
      this.isUploading = false;
      return true;
    } catch (error) {
      console.error('Erreur upload avatar:', error);
      this.isUploading = false;
      return false;
    }
  }

  // Charger les achats de l'utilisateur
  async loadPurchases() {
    if (!this.currentUser) {
      console.log('Aucun utilisateur connecté');
      this.loadDemoPurchases();
      return;
    }

    try {
      // Charger depuis la bibliothèque utilisateur (user_library)
      const { data: library, error } = await this.supabase
        .from('user_library')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('added_at', { ascending: false });

      if (error) {
        console.log('Erreur de chargement de la bibliothèque:', error.message);
        throw error;
      }

      this.purchases = library || [];
      this.updatePurchasesUI();
      this.updateStats();
    } catch (error) {
      console.log('Affichage des données de démonstration');
      // Afficher des données de démonstration si la table n'existe pas encore
      this.loadDemoPurchases();
    }
  }

  // Charger des achats de démonstration
  loadDemoPurchases() {
    // Par défaut, pas d'achats pour les nouveaux utilisateurs
    this.purchases = [];

    this.updatePurchasesUI();
    this.updateStats();
  }

  // Mettre à jour l'affichage des achats
  updatePurchasesUI() {
    const grid = document.getElementById('purchasesGrid');
    const noPurchases = document.getElementById('noPurchases');

    if (this.purchases.length === 0) {
      noPurchases.style.display = 'block';
      return;
    }

    noPurchases.style.display = 'none';
    grid.innerHTML = this.purchases.map(purchase => this.createPurchaseCard(purchase)).join('');
    
    // Attacher les événements de téléchargement
    this.attachDownloadListeners();
  }

  // Créer une carte d'achat
  createPurchaseCard(purchase) {
    const date = new Date(purchase.added_at).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const productName = purchase.product_name;
    const productImage = purchase.product_image || '../assets/manager-screenshot-1.svg';
    const productUrl = purchase.product_url;

    return `
      <div class="purchase-card" data-category="misc">
        <div class="purchase-image" style="background-image: url('${productImage}'); background-size: cover; background-position: center; height: 200px; border-radius: 12px 12px 0 0;">
        </div>
        <div class="purchase-content">
          <div class="purchase-header">
            <div>
              <div class="purchase-category">Application</div>
              <h3 class="purchase-title">${productName}</h3>
            </div>
            <div class="purchase-price">Gratuit</div>
          </div>
          
          <div class="purchase-date">
            <i class="fas fa-calendar"></i>
            Ajouté le ${date}
          </div>
          
          <div class="purchase-actions">
            <button class="btn btn-primary" disabled style="opacity: 0.6; cursor: not-allowed;">
              <i class="fas fa-tools"></i>
              En travaux
            </button>
            <button class="btn btn-secondary" onclick="openProduct('${purchase.product_id}')">
              <i class="fas fa-info-circle"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Obtenir le label de catégorie
  getCategoryLabel(category) {
    const labels = {
      'applications': 'Application',
      'bots': 'Bot Discord',
      'scripts': 'Script',
      'automatisations': 'Automatisation'
    };
    return labels[category] || 'Produit';
  }

  // Mettre à jour les statistiques
  updateStats() {
    const totalPurchases = this.purchases.length;
    const totalSpent = this.purchases.reduce((sum, p) => sum + (p.price || p.products?.price || 0), 0);
    
    document.getElementById('totalPurchases').textContent = totalPurchases;
    document.getElementById('totalSpent').textContent = `${totalSpent.toFixed(2)}€`;
    document.getElementById('totalDownloads').textContent = totalPurchases; // Afficher le nombre réel
    document.getElementById('totalFavorites').textContent = 0; // Reset favoris à 0 pour l'instant
  }

  // Attacher les écouteurs d'événements
  attachEventListeners() {
    // Filtres
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterPurchases(btn.dataset.filter);
      });
    });

    // Changement d'avatar
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    if (changeAvatarBtn) {
      changeAvatarBtn.addEventListener('click', () => {
        // Créer un input file caché
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (file) {
            // Vérifier la taille (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
              alert('L\'image est trop grande. Maximum 2MB.');
              return;
            }
            
            changeAvatarBtn.disabled = true;
            changeAvatarBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Upload...';
            
            const success = await this.uploadAvatar(file);
            
            if (success) {
              alert('Avatar mis à jour avec succès !');
            } else {
              alert('Erreur lors de l\'upload de l\'avatar');
            }
            
            changeAvatarBtn.disabled = false;
            changeAvatarBtn.innerHTML = '<i class="fas fa-camera"></i> Changer l\'avatar';
          }
        };
        input.click();
      });
    }
  }

  // Attacher les écouteurs de téléchargement
  attachDownloadListeners() {
    const downloadBtns = document.querySelectorAll('.download-btn');
    downloadBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const purchaseId = e.currentTarget.dataset.purchaseId;
        await this.handleDownload(purchaseId);
      });
    });
  }

  // Gérer le téléchargement
  async handleDownload(purchaseId) {
    try {
      const purchase = this.purchases.find(p => p.id == purchaseId);
      if (!purchase) return;

      // Enregistrer le téléchargement
      await this.supabase
        .from('downloads')
        .insert({
          user_id: this.currentUser.id,
          purchase_id: purchaseId,
          downloaded_at: new Date().toISOString()
        });

      // Simuler le téléchargement
      alert(`Téléchargement de ${purchase.product_name || purchase.products?.name} démarré !`);
      
      // TODO: Implémenter le téléchargement réel du fichier
      // window.location.href = purchase.download_url;

    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement. Veuillez réessayer.');
    }
  }

  // Filtrer les achats
  filterPurchases(filter) {
    const cards = document.querySelectorAll('.purchase-card');
    
    cards.forEach(card => {
      if (filter === 'all' || card.dataset.category === filter) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // Mettre à jour le badge de rôle
  updateRoleBadge(appRole) {
    const roleConfig = {
      'user': {
        label: 'Membre',
        icon: 'fas fa-user',
        color: '#6b7280'
      },
      'vip': {
        label: 'VIP',
        icon: 'fas fa-gem',
        color: '#a855f7'
      },
      'moderator': {
        label: 'Modérateur',
        icon: 'fas fa-shield-halved',
        color: '#3b82f6'
      },
      'admin': {
        label: 'Admin',
        icon: 'fas fa-crown',
        color: '#f59e0b'
      },
      'owner': {
        label: 'Owner',
        icon: 'fas fa-star',
        color: '#ef4444'
      }
    };

    const config = roleConfig[appRole] || roleConfig['user'];
    const badgeContainer = document.querySelector('.profile-header .profile-badges');
    
    if (badgeContainer) {
      // Supprimer l'ancien badge de rôle s'il existe
      const oldRoleBadge = badgeContainer.querySelector('.role-badge');
      if (oldRoleBadge) {
        oldRoleBadge.remove();
      }

      // Créer le nouveau badge
      const badge = document.createElement('div');
      badge.className = 'badge role-badge';
      badge.style.backgroundColor = config.color;
      badge.innerHTML = `<i class="${config.icon}"></i> ${config.label}`;
      
      // Insérer avant le badge "Membre depuis"
      const memberBadge = badgeContainer.querySelector('.badge:first-child');
      if (memberBadge) {
        badgeContainer.insertBefore(badge, memberBadge);
      } else {
        badgeContainer.appendChild(badge);
      }
    }
  }
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  new ProfileManager();
});
