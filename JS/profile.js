// ========================================
// PROFILE PAGE - OPTIPLAY
// ========================================

import { getSupabaseClient } from './navbar.js';

class ProfileManager {
  constructor() {
    this.supabase = getSupabaseClient();
    this.currentUser = null;
    this.purchases = [];
    this.init();
  }

  async init() {
    await this.loadUserData();
    await this.loadPurchases();
    this.attachEventListeners();
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
        console.log('Profil non trouvé, utilisation des données de base');
      }

      this.updateProfileUI(user, profile);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      // Charger quand même avec les données de base
      if (this.currentUser) {
        this.updateProfileUI(this.currentUser, null);
      }
    }
  }

  // Mettre à jour l'interface avec les données du profil
  updateProfileUI(user, profile) {
    try {
      // Nom d'utilisateur
      const displayName = profile?.pseudo || profile?.first_name || user.email.split('@')[0];
      const nameElement = document.getElementById('profileName');
      if (nameElement) {
        nameElement.textContent = displayName;
      }
      
      // Email
      const emailElement = document.getElementById('profileEmail');
      if (emailElement) {
        emailElement.textContent = user.email;
      }
      
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

      // Avatar (initiales si pas d'image)
      const avatar = document.getElementById('profileAvatar');
      if (avatar) {
        if (profile?.avatar_url) {
          avatar.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
          const initials = displayName.substring(0, 2).toUpperCase();
          avatar.innerHTML = initials;
          avatar.style.display = 'flex';
          avatar.style.alignItems = 'center';
          avatar.style.justifyContent = 'center';
          avatar.style.fontSize = '2rem';
          avatar.style.fontWeight = 'bold';
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'UI:', error);
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
      // Vérifier si la table purchases existe
      const { data: purchases, error } = await this.supabase
        .from('purchases')
        .select(`
          *,
          products (*)
        `)
        .eq('user_id', this.currentUser.id)
        .order('purchased_at', { ascending: false });

      if (error) {
        console.log('Erreur de chargement des achats, utilisation de données de démo:', error.message);
        throw error;
      }

      this.purchases = purchases || [];
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
    const date = new Date(purchase.purchased_at).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const productName = purchase.product_name || purchase.products?.name;
    const icon = purchase.icon || purchase.products?.icon || 'fas fa-box';
    const price = purchase.price || purchase.products?.price || 0;
    const version = purchase.version || purchase.products?.version || '1.0.0';

    return `
      <div class="purchase-card" data-category="${purchase.category}">
        <div class="purchase-image">
          <i class="${icon}"></i>
        </div>
        <div class="purchase-content">
          <div class="purchase-header">
            <div>
              <div class="purchase-category">${this.getCategoryLabel(purchase.category)}</div>
              <h3 class="purchase-title">${productName}</h3>
            </div>
            <div class="purchase-price">${price.toFixed(2)}€</div>
          </div>
          
          <div class="purchase-date">
            <i class="fas fa-calendar"></i>
            Acheté le ${date}
          </div>
          
          <div class="purchase-info">
            <span class="version-badge">
              <i class="fas fa-tag"></i>
              Version ${version}
            </span>
          </div>
          
          <div class="purchase-actions">
            <button class="btn btn-primary download-btn" data-purchase-id="${purchase.id}">
              <i class="fas fa-download"></i>
              Télécharger
            </button>
            <button class="btn btn-secondary" onclick="window.open('${purchase.download_url}', '_blank')">
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
    document.getElementById('totalDownloads').textContent = Math.floor(totalPurchases * 2.5);
    document.getElementById('totalFavorites').textContent = Math.floor(totalPurchases * 0.6);
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
        alert('Fonctionnalité de changement d\'avatar à venir !');
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
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  new ProfileManager();
});
