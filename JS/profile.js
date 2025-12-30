// ========================================
// PROFILE PAGE - OPTIPLAY
// ========================================

class ProfileManager {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.purchases = [];
    this.isUploading = false;
    this.userGames = [];
    this.currentEditingGameId = null;
    this.gameRanks = {
      'League of Legends': ['Iron IV', 'Iron III', 'Iron II', 'Iron I', 'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I', 'Silver IV', 'Silver III', 'Silver II', 'Silver I', 'Gold IV', 'Gold III', 'Gold II', 'Gold I', 'Platinum IV', 'Platinum III', 'Platinum II', 'Platinum I', 'Emerald IV', 'Emerald III', 'Emerald II', 'Emerald I', 'Diamond IV', 'Diamond III', 'Diamond II', 'Diamond I', 'Master', 'Grandmaster', 'Challenger'],
      'Valorant': ['Iron 1', 'Iron 2', 'Iron 3', 'Bronze 1', 'Bronze 2', 'Bronze 3', 'Silver 1', 'Silver 2', 'Silver 3', 'Gold 1', 'Gold 2', 'Gold 3', 'Platinum 1', 'Platinum 2', 'Platinum 3', 'Diamond 1', 'Diamond 2', 'Diamond 3', 'Ascendant 1', 'Ascendant 2', 'Ascendant 3', 'Immortal 1', 'Immortal 2', 'Immortal 3', 'Radiant'],
      'CS2': ['Silver I', 'Silver II', 'Silver III', 'Silver IV', 'Silver Elite', 'Silver Elite Master', 'Gold Nova I', 'Gold Nova II', 'Gold Nova III', 'Gold Nova Master', 'Master Guardian I', 'Master Guardian II', 'Master Guardian Elite', 'Distinguished Master Guardian', 'Legendary Eagle', 'Legendary Eagle Master', 'Supreme Master First Class', 'Global Elite'],
      'Rocket League': ['Bronze I', 'Bronze II', 'Bronze III', 'Silver I', 'Silver II', 'Silver III', 'Gold I', 'Gold II', 'Gold III', 'Platinum I', 'Platinum II', 'Platinum III', 'Diamond I', 'Diamond II', 'Diamond III', 'Champion I', 'Champion II', 'Champion III', 'Grand Champion I', 'Grand Champion II', 'Grand Champion III', 'Supersonic Legend'],
      'Overwatch 2': ['Bronze 5', 'Bronze 4', 'Bronze 3', 'Bronze 2', 'Bronze 1', 'Silver 5', 'Silver 4', 'Silver 3', 'Silver 2', 'Silver 1', 'Gold 5', 'Gold 4', 'Gold 3', 'Gold 2', 'Gold 1', 'Platinum 5', 'Platinum 4', 'Platinum 3', 'Platinum 2', 'Platinum 1', 'Diamond 5', 'Diamond 4', 'Diamond 3', 'Diamond 2', 'Diamond 1', 'Master 5', 'Master 4', 'Master 3', 'Master 2', 'Master 1', 'Grandmaster 5', 'Grandmaster 4', 'Grandmaster 3', 'Grandmaster 2', 'Grandmaster 1', 'Top 500'],
      'Fortnite': ['Bronze I', 'Bronze II', 'Bronze III', 'Silver I', 'Silver II', 'Silver III', 'Gold I', 'Gold II', 'Gold III', 'Platinum I', 'Platinum II', 'Platinum III', 'Diamond I', 'Diamond II', 'Diamond III', 'Elite', 'Champion', 'Unreal'],
      'Apex Legends': ['Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I', 'Silver IV', 'Silver III', 'Silver II', 'Silver I', 'Gold IV', 'Gold III', 'Gold II', 'Gold I', 'Platinum IV', 'Platinum III', 'Platinum II', 'Platinum I', 'Diamond IV', 'Diamond III', 'Diamond II', 'Diamond I', 'Master', 'Predator'],
      'Rainbow Six Siege': ['Copper V', 'Copper IV', 'Copper III', 'Copper II', 'Copper I', 'Bronze V', 'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I', 'Silver V', 'Silver IV', 'Silver III', 'Silver II', 'Silver I', 'Gold V', 'Gold IV', 'Gold III', 'Gold II', 'Gold I', 'Platinum V', 'Platinum IV', 'Platinum III', 'Platinum II', 'Platinum I', 'Emerald V', 'Emerald IV', 'Emerald III', 'Emerald II', 'Emerald I', 'Diamond V', 'Diamond IV', 'Diamond III', 'Diamond II', 'Diamond I', 'Champion'],
      'Dota 2': ['Herald 1', 'Herald 2', 'Herald 3', 'Herald 4', 'Herald 5', 'Guardian 1', 'Guardian 2', 'Guardian 3', 'Guardian 4', 'Guardian 5', 'Crusader 1', 'Crusader 2', 'Crusader 3', 'Crusader 4', 'Crusader 5', 'Archon 1', 'Archon 2', 'Archon 3', 'Archon 4', 'Archon 5', 'Legend 1', 'Legend 2', 'Legend 3', 'Legend 4', 'Legend 5', 'Ancient 1', 'Ancient 2', 'Ancient 3', 'Ancient 4', 'Ancient 5', 'Divine 1', 'Divine 2', 'Divine 3', 'Divine 4', 'Divine 5', 'Immortal'],
      'Call of Duty': ['Bronze I', 'Bronze II', 'Bronze III', 'Silver I', 'Silver II', 'Silver III', 'Gold I', 'Gold II', 'Gold III', 'Platinum I', 'Platinum II', 'Platinum III', 'Diamond I', 'Diamond II', 'Diamond III', 'Crimson I', 'Crimson II', 'Crimson III', 'Iridescent', 'Top 250'],
      'Teamfight Tactics': ['Iron IV', 'Iron III', 'Iron II', 'Iron I', 'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I', 'Silver IV', 'Silver III', 'Silver II', 'Silver I', 'Gold IV', 'Gold III', 'Gold II', 'Gold I', 'Platinum IV', 'Platinum III', 'Platinum II', 'Platinum I', 'Diamond IV', 'Diamond III', 'Diamond II', 'Diamond I', 'Master', 'Grandmaster', 'Challenger'],
      'PUBG': ['Bronze V', 'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I', 'Silver V', 'Silver IV', 'Silver III', 'Silver II', 'Silver I', 'Gold V', 'Gold IV', 'Gold III', 'Gold II', 'Gold I', 'Platinum V', 'Platinum IV', 'Platinum III', 'Platinum II', 'Platinum I', 'Diamond V', 'Diamond IV', 'Diamond III', 'Diamond II', 'Diamond I', 'Master'],
      'Clash Royale': ['Arena 1-10', 'Challenger I', 'Challenger II', 'Challenger III', 'Master I', 'Master II', 'Master III', 'Champion', 'Ultimate Champion'],
      'Brawl Stars': ['Bronze I', 'Bronze II', 'Bronze III', 'Silver I', 'Silver II', 'Silver III', 'Gold I', 'Gold II', 'Gold III', 'Diamond I', 'Diamond II', 'Diamond III', 'Mythic I', 'Mythic II', 'Mythic III', 'Legendary I', 'Legendary II', 'Legendary III', 'Masters'],
      'Hearthstone': ['Bronze 10', 'Bronze 9', 'Bronze 8', 'Bronze 7', 'Bronze 6', 'Bronze 5', 'Bronze 4', 'Bronze 3', 'Bronze 2', 'Bronze 1', 'Silver 10', 'Silver 9', 'Silver 8', 'Silver 7', 'Silver 6', 'Silver 5', 'Silver 4', 'Silver 3', 'Silver 2', 'Silver 1', 'Gold 10', 'Gold 9', 'Gold 8', 'Gold 7', 'Gold 6', 'Gold 5', 'Gold 4', 'Gold 3', 'Gold 2', 'Gold 1', 'Platinum 10', 'Platinum 9', 'Platinum 8', 'Platinum 7', 'Platinum 6', 'Platinum 5', 'Platinum 4', 'Platinum 3', 'Platinum 2', 'Platinum 1', 'Diamond 10', 'Diamond 9', 'Diamond 8', 'Diamond 7', 'Diamond 6', 'Diamond 5', 'Diamond 4', 'Diamond 3', 'Diamond 2', 'Diamond 1', 'Legend', 'Top 1000'],
      'Smash Bros': ['Beginner', 'Intermediate', 'Advanced', 'Elite Smash'],
      'Street Fighter 6': ['Rookie', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Legend'],
      'Tekken 8': ['Beginner', '1st Dan', '2nd Dan', '3rd Dan', 'Initiate', 'Mentor', 'Expert', 'Grandmaster', 'Tekken God', 'Tekken God Prime', 'Tekken God Supreme', 'Tekken God Omega'],
      'Minecraft': ['Casual', 'Skilled', 'Expert', 'Speedrunner'],
      'FIFA': ['Division 10', 'Division 9', 'Division 8', 'Division 7', 'Division 6', 'Division 5', 'Division 4', 'Division 3', 'Division 2', 'Division 1', 'Elite Division']
    };
    this.init();
  }

  async init() {
    await this.waitForSupabase();
    await this.loadUserData();
    await this.loadPurchases();
    await this.loadUserGames();
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

    // Games modal
    const addGameBtn = document.getElementById('addGameBtn');
    const gameModal = document.getElementById('gameModal');
    const closeGameModal = document.getElementById('closeGameModal');
    const cancelGameBtn = document.getElementById('cancelGameBtn');
    const gameForm = document.getElementById('gameForm');

    if (addGameBtn) {
      addGameBtn.addEventListener('click', () => {
        this.openGameModal();
      });
    }

    if (closeGameModal) {
      closeGameModal.addEventListener('click', () => {
        this.closeGameModal();
      });
    }

    if (cancelGameBtn) {
      cancelGameBtn.addEventListener('click', () => {
        this.closeGameModal();
      });
    }

    if (gameModal) {
      gameModal.addEventListener('click', (e) => {
        if (e.target === gameModal) {
          this.closeGameModal();
        }
      });
    }

    if (gameForm) {
      gameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleGameSubmit();
      });
    }

    // Listener pour changer les rangs en fonction du jeu sélectionné
    const gameNameSelect = document.getElementById('gameName');
    if (gameNameSelect) {
      gameNameSelect.addEventListener('change', (e) => {
        this.updateRankOptions(e.target.value);
      });
    }

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

  // ==================== USER GAMES MANAGEMENT ====================
  
  async loadUserGames() {
    try {
      const { data, error } = await this.supabase
        .from('user_games')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.userGames = data || [];
      this.renderUserGames();
    } catch (error) {
      console.error('Error loading user games:', error);
    }
  }

  renderUserGames() {
    const gamesGrid = document.getElementById('gamesGrid');
    const noGames = document.getElementById('noGames');

    if (!gamesGrid) return;

    if (this.userGames.length === 0) {
      if (noGames) noGames.style.display = 'block';
      gamesGrid.innerHTML = '<div class="no-games" id="noGames"><i class="fas fa-ghost"></i><h3 data-i18n="profile.noGames">Aucun jeu ajouté</h3><p data-i18n="profile.addGamesPrompt">Ajoutez les jeux auxquels vous jouez pour partager votre profil !</p></div>';
      return;
    }

    if (noGames) noGames.style.display = 'none';

    gamesGrid.innerHTML = this.userGames.map(game => `
      <div class="game-card">
        <div class="game-card-header">
          <div class="game-icon">
            <i class="fas fa-gamepad"></i>
          </div>
          <div class="game-actions">
            <button class="game-action-btn" onclick="profileManager.editGame('${game.id}')" title="Modifier">
              <i class="fas fa-edit"></i>
            </button>
            <button class="game-action-btn delete" onclick="profileManager.deleteGame('${game.id}')" title="Supprimer">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="game-info">
          <h3>${this.escapeHtml(game.game_name)}</h3>
          ${game.rank ? `<div class="game-rank"><i class="fas fa-trophy"></i> ${this.escapeHtml(game.rank)}</div>` : ''}
        </div>
        ${game.tracker_url || game.profile_url ? `
          <div class="game-links">
            ${game.tracker_url ? `<a href="${this.escapeHtml(game.tracker_url)}" target="_blank" rel="noopener noreferrer" class="game-link"><i class="fas fa-chart-line"></i> Tracker</a>` : ''}
            ${game.profile_url ? `<a href="${this.escapeHtml(game.profile_url)}" target="_blank" rel="noopener noreferrer" class="game-link"><i class="fas fa-link"></i> Profil</a>` : ''}
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  updateRankOptions(gameName) {
    const rankGroup = document.getElementById('rankGroup');
    const rankSelect = document.getElementById('gameRank');
    
    if (!rankSelect) return;

    // Clear existing options
    rankSelect.innerHTML = '<option value="">-- Sélectionnez un rang --</option>';
    
    if (gameName && this.gameRanks[gameName]) {
      // Show rank group
      if (rankGroup) rankGroup.style.display = 'block';
      
      // Add ranks for selected game
      this.gameRanks[gameName].forEach(rank => {
        const option = document.createElement('option');
        option.value = rank;
        option.textContent = rank;
        rankSelect.appendChild(option);
      });
    } else {
      // Hide rank group if no game selected
      if (rankGroup) rankGroup.style.display = 'none';
    }
  }

  openGameModal(gameId = null) {
    const modal = document.getElementById('gameModal');
    const modalTitle = document.getElementById('gameModalTitle');
    const form = document.getElementById('gameForm');

    if (!modal || !form) return;

    this.currentEditingGameId = gameId;

    if (gameId) {
      const game = this.userGames.find(g => g.id === gameId);
      if (game) {
        document.getElementById('gameName').value = game.game_name;
        // Update rank options first
        this.updateRankOptions(game.game_name);
        // Then set the rank value
        document.getElementById('gameRank').value = game.rank || '';
        document.getElementById('gameTracker').value = game.tracker_url || '';
        document.getElementById('gameProfileLink').value = game.profile_url || '';
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-edit"></i> <span data-i18n="profile.editGame">Modifier le jeu</span>';
      }
    } else {
      form.reset();
      // Hide rank group initially
      const rankGroup = document.getElementById('rankGroup');
      if (rankGroup) rankGroup.style.display = 'none';
      if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-gamepad"></i> <span data-i18n="profile.addGame">Ajouter un jeu</span>';
    }

    modal.style.display = 'flex';
  }

  closeGameModal() {
    const modal = document.getElementById('gameModal');
    const form = document.getElementById('gameForm');
    
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    this.currentEditingGameId = null;
  }

  async handleGameSubmit() {
    const gameName = document.getElementById('gameName').value.trim();
    const gameRank = document.getElementById('gameRank').value.trim();
    const gameTracker = document.getElementById('gameTracker').value.trim();
    const gameProfileLink = document.getElementById('gameProfileLink').value.trim();

    if (!gameName) {
      alert('Le nom du jeu est requis');
      return;
    }

    console.log('Submitting game:', {
      gameName,
      gameRank,
      gameTracker,
      gameProfileLink,
      editingId: this.currentEditingGameId
    });

    try {
      if (this.currentEditingGameId) {
        // Update existing game
        console.log('Updating game with ID:', this.currentEditingGameId);
        const { data, error } = await this.supabase
          .from('user_games')
          .update({
            game_name: gameName,
            rank: gameRank || null,
            tracker_url: gameTracker || null,
            profile_url: gameProfileLink || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', this.currentEditingGameId)
          .eq('user_id', this.currentUser.id)
          .select();

        console.log('Update result:', { data, error });
        if (error) throw error;
        
        if (!data || data.length === 0) {
          console.error('No rows updated - game not found or permission denied');
          alert('Impossible de mettre à jour le jeu. Vérifiez vos permissions.');
          return;
        }
      } else {
        // Insert new game
        console.log('Inserting new game');
        const { data, error } = await this.supabase
          .from('user_games')
          .insert({
            user_id: this.currentUser.id,
            game_name: gameName,
            rank: gameRank || null,
            tracker_url: gameTracker || null,
            profile_url: gameProfileLink || null
          })
          .select();

        console.log('Insert result:', { data, error });
        if (error) throw error;
      }

      await this.loadUserGames();
      this.closeGameModal();
    } catch (error) {
      console.error('Error saving game:', error);
      alert('Erreur lors de l\'enregistrement du jeu: ' + error.message);
    }
  }

  editGame(gameId) {
    this.openGameModal(gameId);
  }

  async deleteGame(gameId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce jeu ?')) {
      return;
    }

    try {
      const { error } = await this.supabase
        .from('user_games')
        .delete()
        .eq('id', gameId);

      if (error) throw error;

      await this.loadUserGames();
    } catch (error) {
      console.error('Error deleting game:', error);
      alert('Erreur lors de la suppression du jeu');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialiser au chargement de la page
let profileManager;
document.addEventListener('DOMContentLoaded', () => {
  profileManager = new ProfileManager();
});
