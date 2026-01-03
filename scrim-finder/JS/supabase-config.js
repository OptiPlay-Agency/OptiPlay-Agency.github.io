/**
 * Configuration Supabase pour Scrim Finder
 * Ce fichier charge Supabase et configure le client
 */

// Configuration
const SUPABASE_URL = 'https://kunvgegumrfpizjvikbk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JvhADIxqhOqai0c-UyslRA_AnSPC0iS';

// Function to load Supabase library dynamically
function loadSupabase() {
    return new Promise((resolve, reject) => {
        // Check if Supabase is already loaded
        if (window.supabase) {
            console.log('✅ Supabase already loaded');
            resolve();
            return;
        }

        console.log('📦 Loading Supabase library...');
        
        // Create script element
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@supabase/supabase-js@2.39.1/dist/umd/supabase.js';
        script.async = true;
        
        script.onload = () => {
            if (window.supabase) {
                console.log('✅ Supabase library loaded successfully');
                resolve();
            } else {
                console.error('❌ Supabase library failed to load');
                reject(new Error('Supabase library not available after loading'));
            }
        };
        
        script.onerror = () => {
            console.error('❌ Failed to load Supabase library');
            reject(new Error('Failed to load Supabase library'));
        };
        
        document.head.appendChild(script);
    });
}

// Initialize Supabase client
async function initializeSupabase() {
    try {
        await loadSupabase();
        
        // Create Supabase client
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        console.log('✅ Supabase client initialized');
        
        // Test connection
        const { data, error } = await window.supabaseClient.auth.getUser();
        if (error && error.message !== 'Auth session missing!') {
            console.warn('⚠️ Auth test warning:', error.message);
        } else {
            console.log('✅ Supabase connection test successful');
        }
        
        return window.supabaseClient;
        
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        throw error;
    }
}

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSupabase);
} else {
    initializeSupabase();
}

// Export for modules
window.initializeSupabase = initializeSupabase;