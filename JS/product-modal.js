// Système de modal produit style Epic Games
class ProductModal {
  constructor() {
    this.currentProduct = null;
    this.currentImageIndex = 0;
    this.supabase = null;
    this.init();
  }

  init() {
    // Attendre que Supabase soit disponible
    if (window.OptiPlayConfig && window.OptiPlayConfig.supabaseClient) {
      this.supabase = window.OptiPlayConfig.supabaseClient;
    } else {
      setTimeout(() => this.init(), 100);
      return;
    }

    // Créer le modal dans le DOM
    this.createModal();
    this.setupEventListeners();
  }

  createModal() {
    const modalHTML = `
      <div id="productModal" class="product-modal">
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <button class="modal-close">
            <i class="fas fa-times"></i>
          </button>
          
          <div class="modal-body">
            <div class="modal-gallery">
              <div class="gallery-main">
                <img id="modalMainImage" src="" alt="">
                <button class="gallery-nav gallery-prev">
                  <i class="fas fa-chevron-left"></i>
                </button>
                <button class="gallery-nav gallery-next">
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
              <div class="gallery-thumbnails" id="modalThumbnails"></div>
            </div>
            
            <div class="modal-info">
              <div class="product-header">
                <div class="product-icon">
                  <i class="fas fa-users-cog"></i>
                </div>
                <div class="product-title-section">
                  <h2 id="modalProductName">OptiPlay Manager</h2>
                  <p class="product-developer">Par <span>OptiPlay</span></p>
                  <div class="product-price" id="modalPrice">
                    <span class="price-amount">Gratuit</span>
                  </div>
                </div>
              </div>
              
              <div class="product-description" id="modalDescription">
                <p>Gestion complète d'équipes eSport avec calendrier, scrims, et statistiques.</p>
              </div>
              
              <div class="product-features">
                <h3>Fonctionnalités</h3>
                <ul id="modalFeatures">
                  <li><i class="fas fa-check"></i> Gestion d'équipe complète</li>
                  <li><i class="fas fa-check"></i> Calendrier des matchs</li>
                  <li><i class="fas fa-check"></i> Statistiques détaillées</li>
                  <li><i class="fas fa-check"></i> Communication intégrée</li>
                </ul>
              </div>
              
              <div class="product-tags">
                <span class="tag">Gratuit</span>
                <span class="tag">eSport</span>
                <span class="tag">Gestion</span>
              </div>
              
              <div class="product-actions">
                <button class="btn-library" id="addToLibraryBtn" disabled style="opacity: 0.6; cursor: not-allowed;">
                  <i class="fas fa-tools"></i>
                  <span>En travaux</span>
                </button>
                <button class="btn-access" id="accessProductBtn" disabled style="opacity: 0.6; cursor: not-allowed;">
                  <i class="fas fa-tools"></i>
                  <span>En travaux</span>
                </button>
              </div>

              <div class="subscription-requirements">
                <h3 class="requirements-title">Disponible avec :</h3>
                <div class="plan-badges">
                  <button class="plan-badge free active" data-plan="free" onclick="productModal.showPlanDetails('free')">
                    <i class="fas fa-gift"></i>
                    <span>Gratuit</span>
                  </button>
                  <button class="plan-badge beginner" data-plan="beginner" onclick="productModal.showPlanDetails('beginner')">
                    <i class="fas fa-star"></i>
                    <span>Débutant</span>
                  </button>
                  <button class="plan-badge advanced" data-plan="advanced" onclick="productModal.showPlanDetails('advanced')">
                    <i class="fas fa-bolt"></i>
                    <span>Avancé</span>
                  </button>
                  <button class="plan-badge premium" data-plan="premium" onclick="productModal.showPlanDetails('premium')">
                    <i class="fas fa-crown"></i>
                    <span>Premium</span>
                  </button>
                </div>
                <div class="plan-details" id="planDetails">
                  <div class="plan-detail-content">
                    <h4 id="planDetailTitle">Plan Gratuit</h4>
                    <p id="planDetailDescription">Accédez à OptiPlay Manager gratuitement avec toutes les fonctionnalités de base.</p>
                    <ul id="planDetailFeatures">
                      <li><i class="fas fa-check"></i> Gestion d'équipe complète</li>
                      <li><i class="fas fa-check"></i> Calendrier des matchs</li>
                      <li><i class="fas fa-check"></i> Statistiques de base</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div class="product-info-grid">
                <div class="info-item">
                  <span class="info-label">Développeur</span>
                  <span class="info-value">OptiPlay</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Date de sortie</span>
                  <span class="info-value">2025</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Catégorie</span>
                  <span class="info-value">Outils eSport</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  setupEventListeners() {
    const modal = document.getElementById('productModal');
    const closeBtn = modal.querySelector('.modal-close');
    const overlay = modal.querySelector('.modal-overlay');
    const prevBtn = modal.querySelector('.gallery-prev');
    const nextBtn = modal.querySelector('.gallery-next');
    const addToLibraryBtn = document.getElementById('addToLibraryBtn');
    const accessBtn = document.getElementById('accessProductBtn');

    // Fermer le modal
    closeBtn.addEventListener('click', () => this.close());
    overlay.addEventListener('click', () => this.close());

    // Navigation galerie
    prevBtn.addEventListener('click', () => this.previousImage());
    nextBtn.addEventListener('click', () => this.nextImage());

    // Actions produit
    addToLibraryBtn.addEventListener('click', () => this.addToLibrary());
    accessBtn.addEventListener('click', () => this.accessProduct());

    // ESC pour fermer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        this.close();
      }
    });
  }

  async open(productData) {
    this.currentProduct = productData;
    this.currentImageIndex = 0;

    // Mettre à jour le contenu
    document.getElementById('modalProductName').textContent = productData.name;
    document.getElementById('modalDescription').innerHTML = `<p>${productData.description}</p>`;
    
    // Mettre à jour le prix
    this.updatePrice(productData.price, productData.pricingType);
    
    // Mettre à jour les images
    this.updateGallery(productData.images);
    
    // Vérifier si déjà dans la bibliothèque
    await this.checkLibraryStatus();

    // Afficher le modal
    document.getElementById('productModal').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Afficher par défaut les détails du plan Gratuit
    setTimeout(() => {
      this.showPlanDetails('free');
    }, 100);
  }

  updatePrice(price, pricingType) {
    const priceElement = document.getElementById('modalPrice');
    const priceAmount = priceElement.querySelector('.price-amount');
    
    if (!price || price === 0) {
      priceAmount.textContent = 'Gratuit';
      priceAmount.className = 'price-amount free';
    } else {
      if (pricingType === 'subscription') {
        priceAmount.textContent = `${price.toFixed(2)}€/mois`;
        priceAmount.className = 'price-amount subscription';
      } else {
        priceAmount.textContent = `${price.toFixed(2)}€`;
        priceAmount.className = 'price-amount one-time';
      }
    }
  }

  close() {
    document.getElementById('productModal').classList.remove('active');
    document.body.style.overflow = '';
  }

  updateGallery(images) {
    const mainImage = document.getElementById('modalMainImage');
    const thumbnailsContainer = document.getElementById('modalThumbnails');
    
    mainImage.src = images[0];
    
    // Créer les thumbnails
    thumbnailsContainer.innerHTML = '';
    images.forEach((img, index) => {
      const thumb = document.createElement('div');
      thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
      thumb.innerHTML = `<img src="${img}" alt="Screenshot ${index + 1}">`;
      thumb.addEventListener('click', () => this.setImage(index));
      thumbnailsContainer.appendChild(thumb);
    });
  }

  setImage(index) {
    const images = this.currentProduct.images;
    this.currentImageIndex = index;
    
    document.getElementById('modalMainImage').src = images[index];
    
    // Mettre à jour l'état actif des thumbnails
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });
  }

  nextImage() {
    const images = this.currentProduct.images;
    this.currentImageIndex = (this.currentImageIndex + 1) % images.length;
    this.setImage(this.currentImageIndex);
  }

  previousImage() {
    const images = this.currentProduct.images;
    this.currentImageIndex = (this.currentImageIndex - 1 + images.length) % images.length;
    this.setImage(this.currentImageIndex);
  }

  async checkLibraryStatus() {
    if (!this.supabase) return;

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await this.supabase
        .from('user_library')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', this.currentProduct.id)
        .single();

      const btn = document.getElementById('addToLibraryBtn');
      if (data) {
        btn.innerHTML = '<i class="fas fa-check"></i><span>Dans la bibliothèque</span>';
        btn.classList.add('in-library');
        btn.disabled = true;
      } else {
        btn.innerHTML = '<i class="fas fa-plus"></i><span>Ajouter à la bibliothèque</span>';
        btn.classList.remove('in-library');
        btn.disabled = false;
      }
    } catch (error) {
      console.error('Erreur vérification bibliothèque:', error);
    }
  }

  async addToLibrary() {
    if (!this.supabase) {
      alert('Connexion à la base de données non disponible');
      return;
    }

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        alert('Vous devez être connecté pour ajouter à la bibliothèque');
        window.location.href = '../HTML/login.html';
        return;
      }

      const btn = document.getElementById('addToLibraryBtn');
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Ajout...</span>';
      btn.disabled = true;

      const { data, error } = await this.supabase
        .from('user_library')
        .insert({
          user_id: user.id,
          product_id: this.currentProduct.id,
          product_name: this.currentProduct.name,
          product_url: this.currentProduct.url,
          product_image: this.currentProduct.images[0],
          added_at: new Date().toISOString()
        });

      if (error) throw error;

      btn.innerHTML = '<i class="fas fa-check"></i><span>Ajouté !</span>';
      btn.classList.add('in-library');
      
      setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-check"></i><span>Dans la bibliothèque</span>';
      }, 2000);

    } catch (error) {
      console.error('Erreur ajout bibliothèque:', error);
      alert('Erreur lors de l\'ajout à la bibliothèque');
      
      const btn = document.getElementById('addToLibraryBtn');
      btn.innerHTML = '<i class="fas fa-plus"></i><span>Ajouter à la bibliothèque</span>';
      btn.disabled = false;
    }
  }

  accessProduct() {
    if (this.currentProduct && this.currentProduct.url) {
      window.location.href = this.currentProduct.url;
    }
  }

  showPlanDetails(planType) {
    const planData = {
      free: {
        title: 'Plan Gratuit',
        description: 'Accédez à OptiPlay Manager gratuitement avec toutes les fonctionnalités de base.',
        features: [
          'Gestion d\'équipe complète',
          'Calendrier des matchs',
          'Statistiques de base',
          'Communication intégrée'
        ]
      },
      beginner: {
        title: 'Plan Débutant - 9.99€/mois',
        description: 'Idéal pour commencer avec des fonctionnalités supplémentaires.',
        features: [
          'Tous les avantages Gratuit',
          'Accès à 3 produits premium',
          'Support par email',
          'Mises à jour régulières',
          'Outils de base'
        ]
      },
      advanced: {
        title: 'Plan Avancé - 19.99€/mois',
        description: 'Pour les utilisateurs réguliers qui veulent aller plus loin.',
        features: [
          'Tous les avantages Débutant',
          'Accès à 10 produits premium',
          'Support prioritaire 24/7',
          'Mises à jour en avant-première',
          'Outils avancés inclus',
          'Statistiques détaillées'
        ]
      },
      premium: {
        title: 'Plan Premium - 49.99€/mois',
        description: 'L\'expérience complète pour les professionnels.',
        features: [
          'Tous les avantages Avancé',
          'Accès illimité à tous les produits',
          'Support VIP dédié',
          'Accès aux bêtas exclusives',
          'Outils pro illimités',
          'Personnalisation avancée'
        ]
      }
    };

    const plan = planData[planType];
    const detailsContainer = document.getElementById('planDetails');
    const titleEl = document.getElementById('planDetailTitle');
    const descEl = document.getElementById('planDetailDescription');
    const featuresEl = document.getElementById('planDetailFeatures');

    // Mettre à jour le contenu
    titleEl.textContent = plan.title;
    descEl.textContent = plan.description;
    featuresEl.innerHTML = plan.features.map(f => `<li><i class="fas fa-check"></i> ${f}</li>`).join('');

    // Mettre à jour les badges actifs
    document.querySelectorAll('.plan-badge').forEach(badge => {
      badge.classList.remove('active');
    });
    document.querySelector(`.plan-badge[data-plan="${planType}"]`).classList.add('active');

    // Afficher les détails avec animation
    detailsContainer.style.display = 'block';
    setTimeout(() => detailsContainer.classList.add('show'), 10);
  }
}

// Initialiser le système
const productModal = new ProductModal();
window.productModal = productModal;

// Fonction helper pour ouvrir un produit
window.openProduct = function(productId) {
  const products = {
    'optiplay-manager': {
      id: 'optiplay-manager',
      name: 'OptiPlay Manager',
      description: 'Gestion complète d\'équipes eSport avec calendrier, gestion des scrims, statistiques détaillées et communication intégrée. Un outil indispensable pour les structures eSport professionnelles.',
      price: 0,
      pricingType: 'free',
      images: [
        '../assets/manager-screenshot-1.svg',
        '../assets/manager-screenshot-2.svg',
        '../assets/manager-screenshot-3.svg',
        '../assets/manager-screenshot-4.svg'
      ],
      url: '../teamPlanner/HTML/manager.html'
    }
  };

  const product = products[productId];
  if (product) {
    productModal.open(product);
  }
};
