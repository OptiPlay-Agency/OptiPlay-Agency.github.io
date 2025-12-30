// Configuration globale Supabase - Instance unique
window.OptiPlayConfig = {
  SUPABASE_URL: 'https://kunvgegumrfpizjvikbk.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_JvhADIxqhOqai0c-UyslRA_AnSPC0iS',
  supabaseClient: null
};

// Initialiser Supabase une seule fois
function initializeSupabase() {
  if (!window.OptiPlayConfig.supabaseClient && window.supabase) {
    window.OptiPlayConfig.supabaseClient = window.supabase.createClient(
      window.OptiPlayConfig.SUPABASE_URL, 
      window.OptiPlayConfig.SUPABASE_ANON_KEY
    );
    console.log('Supabase client initialisé');
  }
  return window.OptiPlayConfig.supabaseClient;
}

// Classe NavBar réutilisable
class OptiPlayNavbar {
  constructor() {
    this.currentUser = null;
    this.supabase = null;
    this.init();
  }

  async init() {
    // Attendre que Supabase soit disponible
    if (window.supabase) {
      this.supabase = initializeSupabase();
      await this.initAuth();
    } else {
      // Réessayer après un délai si Supabase n'est pas encore chargé
      setTimeout(() => this.init(), 100);
    }
  }

  // Générer le HTML de la navbar
  generateHTML() {
    return `
      <nav class="optiplay-navbar">
        <div class="navbar-container">
          <!-- Logo et marque -->
          <div class="navbar-brand">
            <a href="${this.getBasePath()}index.html" class="brand-link">
              <div class="logo-container">
                <img src="${this.getBasePath()}assets/logo.png" alt="OptiPlay Logo" class="logo-image">
                <span class="brand-text">OptiPlay</span>
              </div>
            </a>
          </div>

          <!-- Navigation principale -->
          <div class="navbar-nav">
            <a href="${this.getBasePath()}index.html" class="nav-link">
              <i class="fas fa-home"></i>
              <span data-i18n="nav.home">Accueil</span>
            </a>
            
            <a href="${this.getBasePath()}HTML/services.html" class="nav-link">
              <i class="fas fa-cogs"></i>
              <span data-i18n="nav.services">Services</span>
            </a>

            <a href="${this.getBasePath()}HTML/tournaments.html" class="nav-link">
              <i class="fas fa-trophy"></i>
              <span data-i18n="nav.tournaments">Tournois</span>
            </a>

            <a href="${this.getBasePath()}HTML/about.html" class="nav-link">
              <i class="fas fa-info-circle"></i>
              <span data-i18n="nav.about">À propos</span>
            </a>

            <a href="${this.getBasePath()}HTML/contact.html" class="nav-link">
              <i class="fas fa-envelope"></i>
              <span data-i18n="nav.contact">Contact</span>
            </a>
          </div>

          <!-- Section authentification -->
          <div class="navbar-auth">
            <!-- Sélecteur de langue -->
            <div class="lang-selector" id="langSelector">
              <button class="lang-current" id="langCurrentBtn">
                <span class="flag-icon">🇫🇷</span>
                <span class="lang-text">FR</span>
                <i class="fas fa-chevron-down"></i>
              </button>
              
              <div class="lang-dropdown" id="langDropdown">
                <button class="lang-option" data-lang="fr">
                  <span class="flag-icon">🇫🇷</span>
                  <span class="lang-name">Français</span>
                </button>
                <button class="lang-option" data-lang="en">
                  <span class="flag-icon">🇬🇧</span>
                  <span class="lang-name">English</span>
                </button>
              </div>
            </div>

            <!-- Boutons non connecté -->
            <div id="auth-buttons" class="auth-buttons">
              <a href="${this.getBasePath()}HTML/login.html" class="btn btn-outline">
                <i class="fas fa-sign-in-alt"></i>
                <span data-i18n="nav.login">Connexion</span>
              </a>
              <a href="${this.getBasePath()}HTML/register.html" class="btn btn-primary">
                <i class="fas fa-user-plus"></i>
                <span data-i18n="nav.register">Inscription</span>
              </a>
            </div>
            
            <!-- Menu utilisateur connecté -->
            <div id="user-menu" class="user-menu" style="display: none;">
              <button class="user-profile" id="userProfileBtn">
                <div class="user-avatar">
                  <i class="fas fa-user"></i>
                </div>
                <span class="user-name" id="userName">Utilisateur</span>
                <i class="fas fa-chevron-down"></i>
              </button>
              
              <div class="user-dropdown" id="userDropdown">
                <div class="user-info">
                  <div class="user-avatar-large">
                    <i class="fas fa-user"></i>
                  </div>
                  <div class="user-details">
                    <span class="user-display-name" id="userDisplayName">Utilisateur</span>
                    <span class="user-status">Membre</span>
                  </div>
                </div>
                <hr>
                <a href="${this.getBasePath()}HTML/profile.html" class="dropdown-item">
                  <i class="fas fa-user-edit"></i>
                  <span data-i18n="nav.profile">Mon Profil</span>
                </a>
                <a href="${this.getBasePath()}HTML/dashboard.html" class="dropdown-item">
                  <i class="fas fa-tachometer-alt"></i>
                  <span data-i18n="nav.dashboard">Dashboard</span>
                </a>
                <a href="${this.getBasePath()}HTML/settings.html" class="dropdown-item">
                  <i class="fas fa-cog"></i>
                  <span data-i18n="nav.settings">Paramètres</span>
                </a>
                <a href="${this.getBasePath()}HTML/subscription.html" class="dropdown-item subscription-link">
                  <i class="fas fa-crown"></i>
                  <span data-i18n="nav.subscription">Abonnement</span>
                </a>
                <hr>
                <button class="dropdown-item logout-btn" onclick="navbar.handleLogout()">
                  <i class="fas fa-sign-out-alt"></i>
                  <span data-i18n="nav.logout">Déconnexion</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Menu mobile -->
          <div class="mobile-menu-toggle" id="mobileMenuToggle">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        
        <!-- Menu mobile overlay -->
        <div class="mobile-menu" id="mobileMenu">
          <div class="mobile-menu-content">
            <a href="${this.getBasePath()}index.html" class="mobile-nav-link">
              <i class="fas fa-home"></i>
              <span>Accueil</span>
            </a>
            <a href="${this.getBasePath()}HTML/services/applications.html" class="mobile-nav-link">
              <i class="fas fa-code"></i>
              <span>Applications</span>
            </a>
            <a href="${this.getBasePath()}HTML/services/automatisations.html" class="mobile-nav-link">
              <i class="fas fa-robot"></i>
              <span>Automatisations</span>
            </a>
            <a href="${this.getBasePath()}HTML/services/bots-discord.html" class="mobile-nav-link">
              <i class="fab fa-discord"></i>
              <span>Bots Discord</span>
            </a>
            <a href="${this.getBasePath()}HTML/services/divers.html" class="mobile-nav-link">
              <i class="fas fa-palette"></i>
              <span>Divers</span>
            </a>
            <a href="${this.getBasePath()}HTML/tournaments.html" class="mobile-nav-link">
              <i class="fas fa-trophy"></i>
              <span>Tournois</span>
            </a>
            <a href="${this.getBasePath()}HTML/about.html" class="mobile-nav-link">
              <i class="fas fa-info-circle"></i>
              <span>À propos</span>
            </a>
            <a href="${this.getBasePath()}HTML/contact.html" class="mobile-nav-link">
              <i class="fas fa-envelope"></i>
              <span>Contact</span>
            </a>
          </div>
        </div>
      </nav>
    `;
  }

  // Détermine le chemin de base selon la page courante
  getBasePath() {
    const path = window.location.pathname;
    
    if (path.includes('/HTML/services/')) {
      return '../../';
    } else if (path.includes('/HTML/')) {
      return '../';
    } else if (path.includes('/tournaments/')) {
      return '../';
    } else {
      return '';
    }
  }

  // Injecter la navbar dans la page
  render(containerId = 'navbar-container') {
    let container = document.getElementById(containerId);
    
    if (!container) {
      // Si pas de conteneur spécifique, injecter au début du body
      container = document.body;
      container.insertAdjacentHTML('afterbegin', this.generateHTML());
    } else {
      container.innerHTML = this.generateHTML();
    }

    // Ajouter la classe de chargement puis loaded
    const navbar = document.querySelector('.optiplay-navbar');
    if (navbar) {
      navbar.classList.add('navbar-loading');
      // Animation d'apparition
      setTimeout(() => {
        navbar.classList.remove('navbar-loading');
        navbar.classList.add('navbar-loaded');
      }, 100);
    }

    this.attachEventListeners();
  }

  // Attacher les écouteurs d'événements
  attachEventListeners() {
    // Menu utilisateur
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userProfileBtn && userDropdown) {
      userProfileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        userDropdown.classList.toggle('show');
        userProfileBtn.classList.toggle('active');
      });
    }

    // Menu de langue
    const langCurrentBtn = document.getElementById('langCurrentBtn');
    const langDropdown = document.getElementById('langDropdown');
    
    if (langCurrentBtn && langDropdown) {
      langCurrentBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        langDropdown.classList.toggle('show');
        langCurrentBtn.classList.toggle('active');
      });
    }

    // Menu mobile
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuToggle && mobileMenu) {
      mobileMenuToggle.addEventListener('click', () => {
        mobileMenu.classList.toggle('show');
        mobileMenuToggle.classList.toggle('active');
        document.body.classList.toggle('mobile-menu-open');
      });
    }

    // Fermer les menus en cliquant ailleurs
    document.addEventListener('click', (e) => {
      // Fermer menu utilisateur
      if (userDropdown && !userProfileBtn?.contains(e.target)) {
        userDropdown.classList.remove('show');
        userProfileBtn?.classList.remove('active');
      }

      // Fermer menu de langue
      if (langDropdown && !langCurrentBtn?.contains(e.target)) {
        langDropdown.classList.remove('show');
        langCurrentBtn?.classList.remove('active');
      }
    });
  }

  // Initialiser l'authentification
  async initAuth() {
    if (!this.supabase) return;

    try {
      // Vérifier l'utilisateur actuel
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      }
      
      await this.updateAuthUI(user);

      // Écouter les changements d'authentification
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        await this.updateAuthUI(session?.user || null);
      });
    } catch (error) {
      console.error('Erreur d\'initialisation auth:', error);
    }
  }

  // Mettre à jour l'interface utilisateur selon l'état d'auth
  async updateAuthUI(user) {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('userName');
    const userDisplayName = document.getElementById('userDisplayName');
    
    if (user) {
      // Utilisateur connecté
      if (authButtons) authButtons.style.display = 'none';
      if (userMenu) userMenu.style.display = 'flex';
      
      // Récupérer le pseudo et les infos du profil
      const metadata = user.user_metadata || {};
      let displayName = metadata.pseudo || user.email.split('@')[0];
      let avatarUrl = metadata.avatar_url;
      
      try {
        const { data: profile } = await this.supabase
          .from('profiles')
          .select('pseudo, first_name, last_name, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (profile?.pseudo) {
          displayName = profile.pseudo;
        } else if (profile?.first_name) {
          displayName = `${profile.first_name} ${profile.last_name || ''}`.trim();
        }
        
        // Utiliser l'avatar du profil si disponible
        if (profile?.avatar_url && !avatarUrl) {
          avatarUrl = profile.avatar_url;
        }
      } catch (error) {
        console.log('Profil non trouvé, utilisation des user_metadata');
      }
      
      if (userName) userName.textContent = displayName;
      if (userDisplayName) userDisplayName.textContent = displayName;
      
      // Mettre à jour les avatars
      this.updateAvatars(avatarUrl, displayName);
      
      this.currentUser = user;
    } else {
      // Utilisateur non connecté
      if (authButtons) authButtons.style.display = 'flex';
      if (userMenu) userMenu.style.display = 'none';
      
      this.currentUser = null;
    }
  }

  // Mettre à jour les avatars dans la navbar
  updateAvatars(avatarUrl, displayName) {
    const userAvatar = document.querySelector('.user-avatar');
    const userAvatarLarge = document.querySelector('.user-avatar-large');
    
    if (avatarUrl) {
      // Si c'est un chemin Supabase Storage (avatars/UUID.ext)
      if (avatarUrl.startsWith('avatars/')) {
        const fileName = avatarUrl.replace('avatars/', '');
        const { data } = this.supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        if (data?.publicUrl) {
          const imgUrl = `${data.publicUrl}?t=${Date.now()}`;
          
          if (userAvatar) {
            userAvatar.innerHTML = `<img src="${imgUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
          }
          if (userAvatarLarge) {
            userAvatarLarge.innerHTML = `<img src="${imgUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
          }
          return;
        }
      }
      
      // URL complète
      if (userAvatar) {
        userAvatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      }
      if (userAvatarLarge) {
        userAvatarLarge.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      }
    } else {
      // Initiales par défaut
      const initials = displayName.substring(0, 2).toUpperCase();
      
      if (userAvatar) {
        userAvatar.innerHTML = initials;
        userAvatar.style.display = 'flex';
        userAvatar.style.alignItems = 'center';
        userAvatar.style.justifyContent = 'center';
        userAvatar.style.fontSize = '0.9rem';
        userAvatar.style.fontWeight = 'bold';
      }
      if (userAvatarLarge) {
        userAvatarLarge.innerHTML = initials;
        userAvatarLarge.style.display = 'flex';
        userAvatarLarge.style.alignItems = 'center';
        userAvatarLarge.style.justifyContent = 'center';
        userAvatarLarge.style.fontSize = '1.5rem';
        userAvatarLarge.style.fontWeight = 'bold';
      }
    }
  }

  // Gérer la déconnexion
  async handleLogout() {
    if (!this.supabase) return;
    
    try {
      await this.supabase.auth.signOut();
      // Recharger la page pour nettoyer l'état
      setTimeout(() => window.location.reload(), 100);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  }
}

// Fonction d'initialisation globale
function initOptiPlayNavbar() {
  // Attendre que le DOM soit chargé
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.navbar = new OptiPlayNavbar();
      window.navbar.render();
    });
  } else {
    window.navbar = new OptiPlayNavbar();
    window.navbar.render();
  }
}

// Auto-initialisation
initOptiPlayNavbar();