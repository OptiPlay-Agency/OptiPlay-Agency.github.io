// ========================================
// SETTINGS PAGE - OPTIPLAY
// ========================================

import { getSupabaseClient } from './navbar.js';

class SettingsManager {
  constructor() {
    this.supabase = getSupabaseClient();
    this.currentUser = null;
    this.init();
  }

  async init() {
    await this.loadUserData();
    this.setupTabs();
    this.setupForms();
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
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      this.populateForm(user, profile);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  }

  // Remplir le formulaire avec les données
  populateForm(user, profile) {
    // Email
    document.getElementById('email').value = user.email;

    if (profile) {
      // Informations personnelles
      if (profile.pseudo) document.getElementById('pseudo').value = profile.pseudo;
      if (profile.first_name) document.getElementById('firstName').value = profile.first_name;
      if (profile.last_name) document.getElementById('lastName').value = profile.last_name;
      if (profile.bio) document.getElementById('bio').value = profile.bio;

      // Préférences de notifications (si elles existent)
      if (profile.notifications) {
        const notifs = profile.notifications;
        if (notifs.new_products !== undefined) {
          document.getElementById('notif-new-products').checked = notifs.new_products;
        }
        if (notifs.updates !== undefined) {
          document.getElementById('notif-updates').checked = notifs.updates;
        }
        if (notifs.promotions !== undefined) {
          document.getElementById('notif-promotions').checked = notifs.promotions;
        }
        if (notifs.newsletter !== undefined) {
          document.getElementById('notif-newsletter').checked = notifs.newsletter;
        }
      }
    }
  }

  // Configuration des onglets
  setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;

        // Retirer les classes active
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Ajouter la classe active
        btn.classList.add('active');
        document.getElementById(`${targetTab}-tab`).classList.add('active');
      });
    });
  }

  // Configuration des formulaires
  setupForms() {
    // Formulaire de compte
    const accountForm = document.getElementById('accountForm');
    if (accountForm) {
      accountForm.addEventListener('submit', (e) => this.handleAccountUpdate(e));
    }

    // Formulaire de mot de passe
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
    }

    // Bouton d'annulation
    const cancelBtn = document.getElementById('cancelAccountBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.loadUserData();
      });
    }
  }

  // Attacher les écouteurs d'événements
  attachEventListeners() {
    // Toggle de visibilité du mot de passe
    const toggleBtns = document.querySelectorAll('.toggle-password');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        const icon = btn.querySelector('i');

        if (input.type === 'password') {
          input.type = 'text';
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash');
        } else {
          input.type = 'password';
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye');
        }
      });
    });

    // Force du mot de passe
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
      newPasswordInput.addEventListener('input', (e) => {
        this.checkPasswordStrength(e.target.value);
      });
    }

    // Bouton de suppression de compte
    const deleteBtn = document.getElementById('deleteAccountBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.handleDeleteAccount());
    }

    // Bouton 2FA
    const enable2FABtn = document.getElementById('enable2FABtn');
    if (enable2FABtn) {
      enable2FABtn.addEventListener('click', () => {
        alert('Fonctionnalité 2FA à venir !');
      });
    }

    // Switches de notifications
    const notifSwitches = document.querySelectorAll('[id^="notif-"]');
    notifSwitches.forEach(sw => {
      sw.addEventListener('change', () => this.saveNotificationPreferences());
    });

    // Sélecteurs de préférences
    const prefSelects = document.querySelectorAll('#language, #dateFormat');
    prefSelects.forEach(select => {
      select.addEventListener('change', () => this.savePreferences());
    });

    // Radio boutons de thème
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => {
      radio.addEventListener('change', () => this.savePreferences());
    });

    // Boutons de liaison de comptes
    this.setupAccountLinking();
  }

  // Configuration de la liaison de comptes OAuth
  setupAccountLinking() {
    const linkButtons = document.querySelectorAll('.link-account-btn');
    
    linkButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const provider = button.dataset.provider;
        const isLinked = button.classList.contains('unlink');
        
        if (isLinked) {
          // Délier le compte
          await this.unlinkAccount(provider);
        } else {
          // Lier le compte
          await this.linkAccount(provider);
        }
      });
    });

    // Charger l'état des comptes liés
    this.loadLinkedAccounts();
  }

  // Charger l'état des comptes OAuth liés
  async loadLinkedAccounts() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error || !user) return;

      // Vérifier les identités OAuth liées
      const identities = user.identities || [];
      
      identities.forEach(identity => {
        const provider = identity.provider;
        const statusElement = document.querySelector(`.account-status[data-provider="${provider}"]`);
        const button = document.querySelector(`.link-account-btn[data-provider="${provider}"]`);
        
        if (statusElement && button) {
          statusElement.textContent = 'Lié';
          statusElement.classList.add('linked');
          button.innerHTML = '<i class="fas fa-unlink"></i> Délier';
          button.classList.add('unlink');
        }
      });
    } catch (error) {
      console.error('Erreur lors du chargement des comptes liés:', error);
    }
  }

  // Lier un compte OAuth
  async linkAccount(provider) {
    try {
      const { data, error } = await this.supabase.auth.linkIdentity({
        provider: provider,
        options: {
          redirectTo: window.location.href
        }
      });

      if (error) throw error;
      
      this.showNotification(`Redirection vers ${provider} pour liaison du compte...`, 'success');
    } catch (error) {
      console.error('Erreur lors de la liaison du compte:', error);
      this.showNotification('Erreur lors de la liaison du compte', 'error');
    }
  }

  // Délier un compte OAuth
  async unlinkAccount(provider) {
    const confirmed = confirm(`Êtes-vous sûr de vouloir délier votre compte ${provider} ?`);
    
    if (!confirmed) return;

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      const identity = user.identities.find(i => i.provider === provider);
      
      if (!identity) {
        this.showNotification('Compte non lié', 'error');
        return;
      }

      const { error } = await this.supabase.auth.unlinkIdentity(identity);

      if (error) throw error;

      // Mettre à jour l'interface
      const statusElement = document.querySelector(`.account-status[data-provider="${provider}"]`);
      const button = document.querySelector(`.link-account-btn[data-provider="${provider}"]`);
      
      if (statusElement && button) {
        statusElement.textContent = 'Non lié';
        statusElement.classList.remove('linked');
        button.innerHTML = '<i class="fas fa-link"></i> Lier';
        button.classList.remove('unlink');
      }

      this.showNotification('Compte délié avec succès', 'success');
    } catch (error) {
      console.error('Erreur lors de la déliaison du compte:', error);
      this.showNotification('Erreur lors de la déliaison du compte', 'error');
    }
  }

  // Gérer la mise à jour du compte
  async handleAccountUpdate(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const updates = {
      pseudo: formData.get('pseudo'),
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      bio: formData.get('bio')
    };

    try {
      const { error } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', this.currentUser.id);

      if (error) throw error;

      this.showNotification('Informations mises à jour avec succès !', 'success');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      this.showNotification('Erreur lors de la mise à jour', 'error');
    }
  }

  // Gérer le changement de mot de passe
  async handlePasswordChange(e) {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
      this.showNotification('Les mots de passe ne correspondent pas', 'error');
      return;
    }

    if (newPassword.length < 8) {
      this.showNotification('Le mot de passe doit contenir au moins 8 caractères', 'error');
      return;
    }

    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      this.showNotification('Mot de passe modifié avec succès !', 'success');
      document.getElementById('passwordForm').reset();
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      this.showNotification('Erreur lors du changement de mot de passe', 'error');
    }
  }

  // Vérifier la force du mot de passe
  checkPasswordStrength(password) {
    const strengthDiv = document.getElementById('passwordStrength');
    
    if (!password) {
      strengthDiv.innerHTML = '';
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    let strengthClass = '';
    let strengthText = '';

    if (strength <= 2) {
      strengthClass = 'strength-weak';
      strengthText = 'Faible';
    } else if (strength <= 4) {
      strengthClass = 'strength-medium';
      strengthText = 'Moyen';
    } else {
      strengthClass = 'strength-strong';
      strengthText = 'Fort';
    }

    strengthDiv.innerHTML = `<div class="password-strength-bar ${strengthClass}"></div>`;
  }

  // Sauvegarder les préférences de notifications
  async saveNotificationPreferences() {
    const notifications = {
      new_products: document.getElementById('notif-new-products').checked,
      updates: document.getElementById('notif-updates').checked,
      promotions: document.getElementById('notif-promotions').checked,
      newsletter: document.getElementById('notif-newsletter').checked
    };

    try {
      const { error } = await this.supabase
        .from('profiles')
        .update({ notifications })
        .eq('id', this.currentUser.id);

      if (error) throw error;

      this.showNotification('Préférences de notifications sauvegardées', 'success');
    } catch (error) {
      console.error('Erreur:', error);
    }
  }

  // Sauvegarder les préférences générales
  async savePreferences() {
    const preferences = {
      theme: document.querySelector('input[name="theme"]:checked')?.value || 'dark',
      language: document.getElementById('language').value,
      date_format: document.getElementById('dateFormat').value
    };

    try {
      const { error } = await this.supabase
        .from('profiles')
        .update({ preferences })
        .eq('id', this.currentUser.id);

      if (error) throw error;

      this.showNotification('Préférences sauvegardées', 'success');
    } catch (error) {
      console.error('Erreur:', error);
    }
  }

  // Gérer la suppression du compte
  async handleDeleteAccount() {
    const confirmation = confirm(
      'Êtes-vous sûr de vouloir supprimer votre compte ?\n\n' +
      'Cette action est irréversible et supprimera toutes vos données.'
    );

    if (!confirmation) return;

    const doubleConfirmation = prompt(
      'Tapez "SUPPRIMER" en majuscules pour confirmer :'
    );

    if (doubleConfirmation !== 'SUPPRIMER') {
      alert('Suppression annulée');
      return;
    }

    try {
      // TODO: Implémenter la logique de suppression complète
      alert('Fonctionnalité de suppression de compte à implémenter côté serveur');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      this.showNotification('Erreur lors de la suppression du compte', 'error');
    }
  }

  // Afficher une notification
  showNotification(message, type = 'info') {
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 100px;
      right: 2rem;
      padding: 1rem 2rem;
      background: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--error-color)' : 'var(--primary-color)'};
      color: white;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Retirer après 3 secondes
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  new SettingsManager();
});
