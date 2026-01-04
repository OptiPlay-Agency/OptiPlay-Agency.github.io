// Authentication for Admin Panel

class AdminAuth {
    constructor() {
        this.waitForAdminState();
    }

    async waitForAdminState() {
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkAdminState = () => {
            if (window.AdminState && window.AdminState.supabase) {
                this.initializeAuth();
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkAdminState, 100);
            } else {
                console.error('AdminState not available');
            }
        };
        
        checkAdminState();
    }

    async initializeAuth() {
        // Check if we're on login page
        if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
            this.setupLoginForm();
            // Check if already authenticated
            if (window.AdminState.restoreSession()) {
                window.location.href = 'dashboard.html';
            }
        } else {
            // Check authentication for dashboard
            if (!window.AdminState.restoreSession()) {
                window.location.href = 'index.html';
                return;
            }
            // Verify session is still valid
            await this.verifySession();
        }
    }

    setupLoginForm() {
        const form = document.getElementById('loginForm');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const loginBtn = document.getElementById('loginBtn');
        const errorMessage = document.getElementById('errorMessage');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin(emailInput.value, passwordInput.value, loginBtn, errorMessage);
            });
        }
    }

    async handleLogin(email, password, loginBtn, errorMessage) {
        // Show loading state
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
        errorMessage.style.display = 'none';

        try {
            console.log('Attempting login for:', email);
            
            // Sign in with Supabase
            const { data: authData, error: authError } = await window.AdminState.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (authError) {
                throw authError;
            }

            console.log('User authenticated:', authData.user);

            // Check if user is admin
            const isAdmin = await window.AdminState.checkAdminStatus(authData.user);
            
            if (!isAdmin) {
                throw new Error('Accès non autorisé. Vous devez être administrateur.');
            }

            // Get admin data
            const { data: adminData, error: adminError } = await window.AdminState.supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            if (adminError) throw adminError;

            // Set admin session
            window.AdminState.setCurrentAdmin({
                ...adminData,
                user: authData.user
            });

            // Log admin login (commented out until admin_logs table is created)
            // await this.logAdminAction('info', 'auth', 'Admin login', { admin_email: authData.user.email });

            // Update last login (optional, if you want to track this in profiles)
            await window.AdminState.supabase
                .from('profiles')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', authData.user.id);

            // Redirect to dashboard
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = error.message || 'Erreur de connexion. Vérifiez vos identifiants.';
            errorMessage.style.display = 'block';
        } finally {
            // Reset button
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
        }
    }

    async verifySession() {
        try {
            const { data, error } = await window.AdminState.supabase.auth.getUser();
            
            if (error || !data.user) {
                this.logout();
                return;
            }

            // Verify admin status is still valid
            const isAdmin = await window.AdminState.checkAdminStatus(data.user);
            if (!isAdmin) {
                this.logout();
                return;
            }

            // Update admin info in header if on dashboard
            this.updateAdminHeader();

        } catch (error) {
            console.error('Session verification error:', error);
            this.logout();
        }
    }

    updateAdminHeader() {
        const adminEmail = document.getElementById('adminEmail');
        if (adminEmail && window.AdminState.currentAdmin) {
            adminEmail.textContent = window.AdminState.currentAdmin.email;
        }
    }

    async logout() {
        try {
            // Log admin logout
            if (window.AdminState.currentAdmin) {
                await this.logAdminActivity('logout', 'Déconnexion administrateur');
            }

            // Sign out from Supabase
            await window.AdminState.supabase.auth.signOut();

            // Clear admin session
            window.AdminState.clearSession();

            // Redirect to login
            window.location.href = 'index.html';

        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even if logout fails
            window.AdminState.clearSession();
            window.location.href = 'index.html';
        }
    }

    async logAdminAction(level, module, message, details = {}) {
        try {
            if (window.AdminLogs && window.AdminLogs.log) {
                await window.AdminLogs.log(level, module, message, details, window.AdminState.currentAdmin?.email);
            }
        } catch (error) {
            console.error('Error logging admin action:', error);
        }
    }

    async logAdminActivity(action, description, metadata = {}) {
        try {
            await window.AdminState.supabase
                .from('admin_logs')
                .insert({
                    level: 'info',
                    module: 'auth',
                    message: description,
                    details: {
                        action: action,
                        ...metadata,
                        user_agent: navigator.userAgent
                    },
                    user_id: window.AdminState.currentAdmin?.id
                });
        } catch (error) {
            console.error('Error logging admin activity:', error);
        }
    }

    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return null;
        }
    }
}

// Utility functions for login page
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.classList.remove('fa-eye');
        toggleBtn.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleBtn.classList.remove('fa-eye-slash');
        toggleBtn.classList.add('fa-eye');
    }
}

function logout() {
    if (window.adminAuth) {
        window.adminAuth.logout();
    }
}

// Initialize authentication
document.addEventListener('DOMContentLoaded', () => {
    window.adminAuth = new AdminAuth();
});