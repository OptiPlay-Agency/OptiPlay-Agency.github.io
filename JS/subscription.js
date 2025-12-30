// ========================================
// SUBSCRIPTION PAGE - OPTIPLAY
// ========================================

class SubscriptionManager {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.currentPlan = 'free';
    this.billingType = 'monthly'; // 'monthly' ou 'annual'
    this.init();
  }

  async init() {
    await this.waitForSupabase();
    await this.loadUserSubscription();
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

  // Charger l'abonnement de l'utilisateur
  async loadUserSubscription() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error || !user) {
        console.log('Utilisateur non connecté, plan gratuit par défaut');
        return;
      }

      this.currentUser = user;

      // Charger l'abonnement depuis Supabase
      const { data: subscription, error: subError } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subscription) {
        this.currentPlan = subscription.plan_type;
        this.updateCurrentPlanUI();
      }

    } catch (error) {
      console.log('Erreur chargement abonnement:', error);
    }
  }

  // Mettre à jour l'UI pour afficher le plan actuel
  updateCurrentPlanUI() {
    // Retirer tous les boutons "Plan actuel"
    document.querySelectorAll('.plan-btn.current').forEach(btn => {
      btn.classList.remove('current');
      btn.innerHTML = '<i class="fas fa-rocket"></i><span data-i18n="subscriptionPage.choosePlan">Choisir ce plan</span>';
    });

    // Marquer le plan actuel
    const currentPlanBtn = document.querySelector(`.plan-btn[data-plan="${this.currentPlan}"]`);
    if (currentPlanBtn) {
      currentPlanBtn.classList.add('current');
      currentPlanBtn.innerHTML = '<i class="fas fa-check"></i><span data-i18n="subscriptionPage.currentPlan">Plan actuel</span>';
    }
  }

  // Attacher les écouteurs d'événements
  attachEventListeners() {
    // Toggle mensuel/annuel
    const billingToggle = document.getElementById('billingToggle');
    if (billingToggle) {
      billingToggle.addEventListener('change', (e) => {
        this.billingType = e.target.checked ? 'annual' : 'monthly';
        this.updatePrices();
      });
    }

    // Boutons de sélection de plan
    document.querySelectorAll('.plan-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const plan = e.currentTarget.getAttribute('data-plan');
        this.selectPlan(plan);
      });
    });

    // FAQ accordéon
    document.querySelectorAll('.faq-question').forEach(question => {
      question.addEventListener('click', (e) => {
        const faqItem = e.currentTarget.closest('.faq-item');
        const isActive = faqItem.classList.contains('active');
        
        // Fermer tous les autres
        document.querySelectorAll('.faq-item').forEach(item => {
          item.classList.remove('active');
        });
        
        // Toggle celui-ci
        if (!isActive) {
          faqItem.classList.add('active');
        }
      });
    });
  }

  // Mettre à jour l'affichage des prix
  updatePrices() {
    document.querySelectorAll('.plan-card').forEach(card => {
      const monthlyPrices = card.querySelectorAll('.price-amount.monthly');
      const annualPrices = card.querySelectorAll('.price-amount.annual');

      if (this.billingType === 'monthly') {
        monthlyPrices.forEach(p => p.classList.remove('hidden'));
        annualPrices.forEach(p => p.classList.add('hidden'));
      } else {
        monthlyPrices.forEach(p => p.classList.add('hidden'));
        annualPrices.forEach(p => p.classList.remove('hidden'));
      }
    });
  }

  // Sélectionner un plan
  async selectPlan(plan) {
    // Si c'est déjà le plan actuel
    if (plan === this.currentPlan) {
      return;
    }

    // Si l'utilisateur n'est pas connecté
    if (!this.currentUser) {
      alert('Veuillez vous connecter pour choisir un abonnement');
      window.location.href = '../HTML/login.html';
      return;
    }

    // Si c'est le plan gratuit
    if (plan === 'free') {
      const confirm = window.confirm('Êtes-vous sûr de vouloir revenir au plan gratuit ? Vous perdrez l\'accès aux fonctionnalités premium.');
      if (confirm) {
        await this.downgradeToFree();
      }
      return;
    }

    // Pour les plans payants, appliquer directement (test sans paiement)
    await this.applyPlanChange(plan);
  }

  // Appliquer le changement de plan (sans paiement pour test)
  async applyPlanChange(plan) {
    try {
      // Définir les prix selon le plan et le type de facturation
      const prices = {
        beginner: { monthly: 9.99, annual: 7.99 },
        advanced: { monthly: 19.99, annual: 15.99 },
        premium: { monthly: 49.99, annual: 39.99 }
      };

      const amount = prices[plan][this.billingType];
      
      // Calculer la date de fin de période
      const periodDays = this.billingType === 'monthly' ? 30 : 365;
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + periodDays);

      // Créer ou mettre à jour l'abonnement dans Supabase
      const subscriptionData = {
        user_id: this.currentUser.id,
        plan_type: plan,
        billing_type: this.billingType,
        status: 'active',
        amount: amount,
        currency: 'EUR',
        started_at: new Date().toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false
      };

      // Annuler l'ancien abonnement s'il existe
      if (this.currentPlan !== 'free') {
        await this.supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            canceled_at: new Date().toISOString()
          })
          .eq('user_id', this.currentUser.id)
          .eq('status', 'active');
      }

      // Insérer le nouvel abonnement
      const { error } = await this.supabase
        .from('subscriptions')
        .insert(subscriptionData);

      if (error) throw error;

      // Mettre à jour l'état local
      this.currentPlan = plan;
      this.updateCurrentPlanUI();

      // Message de succès
      const billingLabel = this.billingType === 'monthly' ? 'Mensuel' : 'Annuel';
      alert(`✅ Plan ${plan.toUpperCase()} activé avec succès !\nFacturation: ${billingLabel} (${amount}€)\nValide jusqu'au: ${periodEnd.toLocaleDateString('fr-FR')}`);

    } catch (error) {
      console.error('Erreur changement de plan:', error);
      alert('❌ Erreur lors du changement de plan: ' + error.message);
    }
  }

  // Rétrograder vers le plan gratuit
  async downgradeToFree() {
    try {
      const { error } = await this.supabase
        .from('subscriptions')
        .update({ 
          status: 'canceled',
          canceled_at: new Date().toISOString()
        })
        .eq('user_id', this.currentUser.id)
        .eq('status', 'active');

      if (error) throw error;

      this.currentPlan = 'free';
      this.updateCurrentPlanUI();
      
      alert('Votre abonnement a été annulé. Vous êtes maintenant sur le plan gratuit.');

    } catch (error) {
      console.error('Erreur annulation:', error);
      alert('Erreur lors de l\'annulation de l\'abonnement');
    }
  }

  // Initialiser le processus de paiement (Stripe) - Désactivé pour test
  initPayment(plan) {
    // Définir les prix selon le plan et le type de facturation
    const prices = {
      beginner: {
        monthly: 9.99,
        annual: 7.99
      },
      advanced: {
        monthly: 19.99,
        annual: 15.99
      },
      premium: {
        monthly: 49.99,
        annual: 39.99
      }
    };

    const amount = prices[plan][this.billingType];
    const billingLabel = this.billingType === 'monthly' ? 'Mensuel' : 'Annuel';

    // Pour le moment, juste une alerte
    // TODO: Implémenter Stripe Checkout
    alert(`Paiement ${billingLabel} pour le plan ${plan.toUpperCase()}\nMontant: ${amount}€/${this.billingType === 'monthly' ? 'mois' : 'an'}\n\n🚧 Intégration Stripe à venir !`);

    console.log('Initialisation paiement:', {
      plan,
      billing: this.billingType,
      amount,
      user: this.currentUser.id
    });

    // Simuler un succès de paiement pour tester
    // this.handlePaymentSuccess(plan);
  }

  // Gérer le succès du paiement
  async handlePaymentSuccess(plan) {
    try {
      const subscriptionData = {
        user_id: this.currentUser.id,
        plan_type: plan,
        billing_type: this.billingType,
        status: 'active',
        started_at: new Date().toISOString(),
        // Pour un paiement mensuel, expire dans 1 mois
        current_period_end: this.billingType === 'monthly' 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      const { error } = await this.supabase
        .from('subscriptions')
        .upsert(subscriptionData, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      this.currentPlan = plan;
      this.updateCurrentPlanUI();

      alert('🎉 Abonnement activé avec succès ! Bienvenue dans le plan ' + plan.toUpperCase());
      
      // Rafraîchir pour appliquer les nouveaux accès
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Erreur activation abonnement:', error);
      alert('Erreur lors de l\'activation de l\'abonnement');
    }
  }

  // Vérifier si l'utilisateur a accès à une fonctionnalité
  hasAccess(feature) {
    const planLevels = {
      free: 0,
      beginner: 1,
      advanced: 2,
      premium: 3
    };

    const featureRequirements = {
      'premium_products': 1,
      'advanced_bots': 2,
      'custom_projects': 2,
      'priority_support': 2,
      'unlimited_products': 3,
      'dedicated_infra': 3
    };

    const userLevel = planLevels[this.currentPlan] || 0;
    const requiredLevel = featureRequirements[feature] || 0;

    return userLevel >= requiredLevel;
  }
}

// Initialiser le gestionnaire d'abonnements
const subscriptionManager = new SubscriptionManager();
window.subscriptionManager = subscriptionManager;
