// Configuration Supabase
const SUPABASE_URL = 'https://kunvgegumrfpizjvikbk.supabase.co'; // À remplacer par votre URL Supabase
const SUPABASE_ANON_KEY = 'sb_publishable_JvhADIxqhOqai0c-UyslRA_AnSPC0iS'; // À remplacer par votre clé anonyme

// Vérifier que Supabase est disponible
if (!window.supabase) {
  console.error('Supabase n\'est pas chargé !');
  throw new Error('Supabase client non disponible');
}

// Initialisation du client Supabase
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fonctions d'authentification
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  async init() {
    // Vérifier si l'utilisateur est déjà connecté
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    this.currentUser = user;
    this.updateUI();

    // Écouter les changements d'état d'authentification
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
      this.currentUser = session?.user || null;
      this.updateUI();
      
      if (event === 'SIGNED_IN') {
        console.log('Utilisateur connecté:', this.currentUser);
        this.showNotification('Connexion réussie !', 'success');
      } else if (event === 'SIGNED_OUT') {
        console.log('Utilisateur déconnecté');
        this.showNotification('Déconnexion réussie !', 'info');
      }
    });
  }

  // Inscription
  async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await window.supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: userData
        }
      });

      if (error) throw error;
      
      this.showNotification('Inscription réussie ! Vérifiez vos emails.', 'success');
      return { success: true, data };
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      this.showNotification(error.message, 'error');
      return { success: false, error: error.message };
    }
  }

  // Connexion
  async signIn(email, password) {
    try {
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      this.showNotification(error.message, 'error');
      return { success: false, error: error.message };
    }
  }

  // Déconnexion
  async signOut() {
    try {
      const { error } = await window.supabaseClient.auth.signOut();
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      this.showNotification(error.message, 'error');
      return { success: false, error: error.message };
    }
  }

  // Réinitialisation du mot de passe
  async resetPassword(email) {
    try {
      const { data, error } = await window.supabaseClient.auth.resetPasswordForEmail(email);
      if (error) throw error;
      
      this.showNotification('Email de réinitialisation envoyé !', 'success');
      return { success: true, data };
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      this.showNotification(error.message, 'error');
      return { success: false, error: error.message };
    }
  }

  // Mettre à jour l'interface utilisateur
  updateUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    
    if (this.currentUser) {
      // Utilisateur connecté
      if (authButtons) authButtons.style.display = 'none';
      if (userMenu) {
        userMenu.style.display = 'flex';
        const userEmail = userMenu.querySelector('.user-email');
        if (userEmail) userEmail.textContent = this.currentUser.email;
      }
    } else {
      // Utilisateur non connecté
      if (authButtons) authButtons.style.display = 'flex';
      if (userMenu) userMenu.style.display = 'none';
    }
  }

  // Afficher une notification
  showNotification(message, type = 'info') {
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
      </div>
      <button class="notification-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;

    // Ajouter au DOM
    document.body.appendChild(notification);

    // Retirer automatiquement après 5 secondes
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Obtenir les données de l'utilisateur
  getUser() {
    return this.currentUser;
  }
}

// Instance globale du gestionnaire d'authentification
window.authManager = new AuthManager();
