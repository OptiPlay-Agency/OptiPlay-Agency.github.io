// GitHub Configuration for Bug Reports
// =====================================

// Configuration GitHub pour les rapports de bug
const GITHUB_CONFIG = {
  owner: 'OptiPlay-Agency',
  repo: 'OptiPlay-Agency.github.io',
  token: null, // Sera chargé dynamiquement depuis Supabase
  
  // API endpoints
  apiBase: 'https://api.github.com',
  
  // Labels par défaut pour les issues
  labels: {
    bugReport: 'bug-report',
    manager: 'manager',
    userReport: 'user-report'
  }
};

// Service pour uploader les fichiers
const FILE_UPLOAD_SERVICE = {
  imgbb: {
    apiKey: null, // Sera chargé dynamiquement depuis Supabase
    apiUrl: 'https://api.imgbb.com/1/upload'
  }
};

// Fonction pour charger la configuration depuis Supabase
async function loadConfigFromSupabase() {
  try {
    if (!window.supabaseClient) {
      console.warn('Supabase client not available for config loading');
      return { success: false, error: 'Supabase not available' };
    }

    // Vérifier si l'utilisateur est authentifié
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) {
      console.warn('User not authenticated, cannot load config');
      return { success: false, error: 'Authentication required' };
    }

    // Charger les tokens depuis app_config (temporaire - accès direct)
    const { data: configData, error: configError } = await window.supabaseClient
      .from('app_config')
      .select('key, value')
      .in('key', ['github_token', 'imgbb_api_key']);

    if (configError) {
      console.error('Failed to load config:', configError);
      return { success: false, error: 'Config loading failed' };
    }

    const config = {};
    configData?.forEach(item => {
      if (item.key === 'github_token') {
        config.githubToken = item.value;
      } else if (item.key === 'imgbb_api_key') {
        config.imgbbApiKey = item.value;
      }
    });

    console.log('✅ Config loaded successfully');
    return { success: true, ...config };
  } catch (error) {
    console.error('Failed to load config from Supabase:', error);
    return { success: false, error: error.message };
  }
}

// Objet global pour accéder aux configurations
window.githubConfig = {
  loadConfigFromSupabase: loadConfigFromSupabase
};

// Charger la configuration au démarrage
document.addEventListener('DOMContentLoaded', async () => {
  // Attendre que Supabase soit prêt
  let attempts = 0;
  const maxAttempts = 10;
  
  const waitForSupabase = async () => {
    if (window.supabaseClient || attempts >= maxAttempts) {
      await loadConfigFromSupabase();
      return;
    }
    attempts++;
    setTimeout(waitForSupabase, 100);
  };
  
  await waitForSupabase();
});

// Export pour utilisation dans bug-report.js
window.GITHUB_CONFIG = GITHUB_CONFIG;
window.FILE_UPLOAD_SERVICE = FILE_UPLOAD_SERVICE;
window.loadConfigFromSupabase = loadConfigFromSupabase;