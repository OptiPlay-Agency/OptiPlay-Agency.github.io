/**
 * AUTHENTICATION HANDLERS
 * OptiPlay Scrim Finder
 */

// Global variables
let isAuthenticated = false;

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', initAuth);

async function initAuth() {
    try {
        // Wait for Supabase to be ready
        await waitForSupabase();
        
        // Check if user is already authenticated
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        
        if (user) {
            console.log('✅ User already authenticated');
            // Redirect to main app
            window.location.href = 'index.html';
        } else {
            console.log('ℹ️ User not authenticated');
        }
    } catch (error) {
        console.error('Error initializing auth:', error);
    }
}

async function waitForSupabase() {
    let attempts = 0;
    while (!window.supabaseClient && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.supabaseClient) {
        throw new Error('Supabase client not available');
    }
}

// Login form handler
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
    
    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            throw error;
        }
        
        console.log('✅ Login successful');
        showNotification('Connexion réussie !', 'success');
        
        // Redirect to main app
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        let message = 'Erreur de connexion';
        
        if (error.message.includes('Invalid login credentials')) {
            message = 'Email ou mot de passe incorrect';
        } else if (error.message.includes('Email not confirmed')) {
            message = 'Veuillez confirmer votre email avant de vous connecter';
        }
        
        showNotification(message, 'error');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
    }
});

// Register form handler
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const gameTag = document.getElementById('gameTag').value;
    const acceptTerms = document.getElementById('acceptTerms').checked;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Validation
    if (password !== confirmPassword) {
        showNotification('Les mots de passe ne correspondent pas', 'error');
        return;
    }
    
    if (!acceptTerms) {
        showNotification('Vous devez accepter les conditions d\'utilisation', 'error');
        return;
    }
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création du compte...';
    
    try {
        const { data, error } = await window.supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    game_tag: gameTag,
                    full_name: `${firstName} ${lastName}`
                }
            }
        });
        
        if (error) {
            throw error;
        }
        
        console.log('✅ Registration successful');
        showNotification('Compte créé ! Vérifiez votre email pour confirmer votre inscription.', 'success');
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        
    } catch (error) {
        console.error('Registration error:', error);
        let message = 'Erreur lors de la création du compte';
        
        if (error.message.includes('already registered')) {
            message = 'Cette adresse email est déjà utilisée';
        } else if (error.message.includes('Password should be')) {
            message = 'Le mot de passe doit contenir au moins 8 caractères';
        }
        
        showNotification(message, 'error');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Créer mon compte';
    }
});

// Google Sign In
async function signInWithGoogle() {
    try {
        const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/scrim-finder/index.html`
            }
        });
        
        if (error) {
            throw error;
        }
        
    } catch (error) {
        console.error('Google sign in error:', error);
        showNotification('Erreur lors de la connexion avec Google', 'error');
    }
}

// Google Sign Up
async function signUpWithGoogle() {
    try {
        const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/scrim-finder/index.html`
            }
        });
        
        if (error) {
            throw error;
        }
        
    } catch (error) {
        console.error('Google sign up error:', error);
        showNotification('Erreur lors de l\'inscription avec Google', 'error');
    }
}

// Password toggle
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentNode.querySelector('.password-toggle i');
    
    if (input.type === 'password') {
        input.type = 'text';
        button.classList.remove('fa-eye');
        button.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        button.classList.remove('fa-eye-slash');
        button.classList.add('fa-eye');
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentNode.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}