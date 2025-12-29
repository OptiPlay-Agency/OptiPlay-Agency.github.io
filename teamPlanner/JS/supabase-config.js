// =====================================================
// SUPABASE CONFIGURATION - OptiPlay Manager
// =====================================================

console.log('🔄 Loading supabase-config.js for manager...');

// Configuration Supabase
const SUPABASE_URL = 'https://kunvgegumrfpizjvikbk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JvhADIxqhOqai0c-UyslRA_AnSPC0iS';

// Vérifier que la bibliothèque Supabase est chargée
if (!window.supabase) {
  console.error('❌ Erreur: La bibliothèque Supabase n\'est pas chargée !');
  throw new Error('Supabase library not loaded');
}

// Toujours utiliser window.supabaseClient pour éviter les conflits
if (!window.supabaseClient) {
  console.log('✅ Creating new Supabase client...');
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✓ New client created:', window.supabaseClient);
} else {
  console.log('♻️ Reusing existing window.supabaseClient');
}

// Créer un alias global pour compatibilité (sans const pour éviter erreurs)
if (typeof supabase === 'undefined') {
  window.supabase = window.supabaseClient;
}

console.log('✓ Supabase client ready for OptiPlay Manager');
