// Supabase Configuration for Admin Panel
const SUPABASE_URL = 'https://kunvgegumrfpizjvikbk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JvhADIxqhOqai0c-UyslRA_AnSPC0iS';

// Initialize Supabase client
let adminSupabase = null;

// Wait for Supabase to load
function initializeSupabase() {
    if (typeof window.supabase !== 'undefined') {
        adminSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized:', adminSupabase);
        return true;
    }
    return false;
}

// Admin State Management
class AdminStateManager {
    constructor() {
        this.currentAdmin = null;
        this.isAuthenticated = false;
        this.users = [];
        this.teams = [];
        this.reports = [];
        this.stats = {};
        this.supabase = null;
    }

    // Initialize with Supabase client
    initialize() {
        if (!initializeSupabase()) {
            console.error('Supabase not loaded');
            return false;
        }
        this.supabase = adminSupabase;
        return true;
    }

    // Check if user is admin - TEMPORARY: Skip RLS check
    async checkAdminStatus(user) {
        try {
            // TEMPORARY: Bypass RLS issues by checking user email directly
            if (user.email === 'aguionnet@gaming.tech') {
                console.log('Bypassing RLS check for known admin');
                return true;
            }
            
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .eq('role', 'admin')
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('RLS error, falling back to email check');
                // Fallback: check if this is a known admin email
                return user.email === 'aguionnet@gaming.tech';
            }

            return data !== null;
        } catch (error) {
            console.error('Error checking admin status:', error);
            // Fallback: check if this is a known admin email
            return user.email === 'aguionnet@gaming.tech';
        }
    }

    // Set current admin
    setCurrentAdmin(admin) {
        this.currentAdmin = admin;
        this.isAuthenticated = true;
        localStorage.setItem('admin_session', JSON.stringify({
            user: admin,
            timestamp: Date.now()
        }));
    }

    // Clear admin session
    clearSession() {
        this.currentAdmin = null;
        this.isAuthenticated = false;
        localStorage.removeItem('admin_session');
    }

    // Restore session from localStorage
    restoreSession() {
        const session = localStorage.getItem('admin_session');
        if (session) {
            try {
                const parsed = JSON.parse(session);
                // Check if session is less than 24 hours old
                if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                    this.currentAdmin = parsed.user;
                    this.isAuthenticated = true;
                    return true;
                }
            } catch (error) {
                console.error('Error restoring session:', error);
            }
        }
        return false;
    }
}

// Initialize AdminState globally
window.AdminState = new AdminStateManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Supabase to be ready
    let attempts = 0;
    const maxAttempts = 50;
    
    const waitForSupabase = () => {
        if (window.AdminState.initialize()) {
            console.log('Admin State initialized successfully');
        } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(waitForSupabase, 100);
        } else {
            console.error('Failed to initialize Supabase');
        }
    };
    
    waitForSupabase();
});

// Utility functions
const Utils = {
    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Format relative time
    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'À l\'instant';
        if (minutes < 60) return `Il y a ${minutes} min`;
        if (hours < 24) return `Il y a ${hours}h`;
        if (days < 30) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
        
        return this.formatDate(dateString);
    },

    // Generate avatar initials
    getInitials(name, email) {
        if (name && name.trim()) {
            return name.trim().split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
        }
        if (email) {
            return email.substring(0, 2).toUpperCase();
        }
        return '??';
    },

    // Show toast notification
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add to page
        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Toast styles (add to CSS if not present)
if (!document.querySelector('#toast-styles')) {
    const toastStyles = document.createElement('style');
    toastStyles.id = 'toast-styles';
    toastStyles.textContent = `
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1rem;
            z-index: 10001;
            transform: translateX(400px);
            opacity: 0;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .toast.show {
            transform: translateX(0);
            opacity: 1;
        }

        .toast-content {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: var(--text-primary);
        }

        .toast-success {
            border-left: 4px solid var(--success-color);
        }

        .toast-error {
            border-left: 4px solid var(--danger-color);
        }

        .toast-info {
            border-left: 4px solid var(--primary-color);
        }

        .toast-success i {
            color: var(--success-color);
        }

        .toast-error i {
            color: var(--danger-color);
        }

        .toast-info i {
            color: var(--primary-color);
        }
    `;
    document.head.appendChild(toastStyles);
}

// Export for use in other files
window.supabase = supabase;
window.Utils = Utils;