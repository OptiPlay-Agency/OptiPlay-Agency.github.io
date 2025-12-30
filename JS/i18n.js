// Système de traduction OptiPlay
class I18nManager {
  constructor() {
    this.translations = {};
    this.currentLang = localStorage.getItem('optiplay-lang') || 'fr';
    this.init();
  }

  async init() {
    await this.loadTranslations();
    this.applyLanguage(this.currentLang);
    this.setupLanguageSelector();
  }

  async loadTranslations() {
    try {
      const response = await fetch(this.getBasePath() + 'JS/translations.json');
      this.translations = await response.json();
    } catch (error) {
      console.error('Erreur lors du chargement des traductions:', error);
    }
  }

  getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/HTML/')) {
      return '../';
    }
    if (path.includes('/tournaments/')) {
      return '../../';
    }
    return '';
  }

  applyLanguage(lang) {
    this.currentLang = lang;
    localStorage.setItem('optiplay-lang', lang);
    document.documentElement.lang = lang;

    // Traduire tous les éléments avec data-i18n
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.getTranslation(key);
      if (translation) {
        element.textContent = translation;
      }
    });

    // Traduire les placeholders
    const elementsWithPlaceholder = document.querySelectorAll('[data-i18n-placeholder]');
    elementsWithPlaceholder.forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translation = this.getTranslation(key);
      if (translation) {
        element.placeholder = translation;
      }
    });

    // Traduire les titres
    const elementsWithTitle = document.querySelectorAll('[data-i18n-title]');
    elementsWithTitle.forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      const translation = this.getTranslation(key);
      if (translation) {
        element.title = translation;
      }
    });

    // Mettre à jour le sélecteur de langue
    this.updateLanguageSelector();
  }

  getTranslation(key) {
    const keys = key.split('.');
    let value = this.translations[this.currentLang];
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return null;
      }
    }
    
    return value;
  }

  setupLanguageSelector() {
    // Le sélecteur sera créé dans la navbar
    document.addEventListener('click', (e) => {
      if (e.target.closest('.lang-option')) {
        const lang = e.target.closest('.lang-option').getAttribute('data-lang');
        if (lang) {
          this.applyLanguage(lang);
        }
      }
    });
  }

  updateLanguageSelector() {
    const currentLangBtn = document.querySelector('.lang-current');
    if (currentLangBtn) {
      const flagIcon = currentLangBtn.querySelector('.flag-icon');
      if (flagIcon) {
        flagIcon.textContent = this.currentLang === 'fr' ? '🇫🇷' : '🇬🇧';
      }
      const langText = currentLangBtn.querySelector('.lang-text');
      if (langText) {
        langText.textContent = this.currentLang === 'fr' ? 'FR' : 'EN';
      }
    }

    // Mettre à jour les options actives
    document.querySelectorAll('.lang-option').forEach(option => {
      const lang = option.getAttribute('data-lang');
      if (lang === this.currentLang) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
  }

  getCurrentLanguage() {
    return this.currentLang;
  }
}

// Initialiser le gestionnaire de traduction
const i18n = new I18nManager();
window.i18n = i18n;
