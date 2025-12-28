// Gestion du menu déroulant Services et de l'authentification
document.addEventListener('DOMContentLoaded', function() {
    // Initialisation du menu Services
    initServicesDropdown();
    
    // Initialisation des boutons d'authentification (après chargement de Supabase)
    setTimeout(() => {
        initAuthButtons();
    }, 500);
});

function initServicesDropdown() {
    const servicesDropdown = document.querySelector('.services-dropdown');
    if (!servicesDropdown) return;

    const dropdownToggle = servicesDropdown.querySelector('.dropdown-toggle');
    const dropdownMenu = servicesDropdown.querySelector('.dropdown-menu');

    // Toggle du menu au clic
    dropdownToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const isOpen = servicesDropdown.classList.contains('open');
        
        // Fermer tous les autres dropdowns
        closeAllDropdowns();
        
        if (!isOpen) {
            servicesDropdown.classList.add('open');
            dropdownMenu.style.maxHeight = dropdownMenu.scrollHeight + 'px';
        }
    });

    // Fermer le menu en cliquant ailleurs
    document.addEventListener('click', function(e) {
        if (!servicesDropdown.contains(e.target)) {
            closeAllDropdowns();
        }
    });

    // Empêcher la fermeture quand on clique dans le menu
    dropdownMenu.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Gestion du clavier
    dropdownToggle.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            dropdownToggle.click();
        } else if (e.key === 'Escape') {
            closeAllDropdowns();
        }
    });

    // Animation d'hover sur les sous-menus
    const submenus = dropdownMenu.querySelectorAll('.submenu-item');
    submenus.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(5px)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0)';
        });
    });
}

function closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('.services-dropdown');
    dropdowns.forEach(dropdown => {
        dropdown.classList.remove('open');
        const menu = dropdown.querySelector('.dropdown-menu');
        if (menu) {
            menu.style.maxHeight = '0';
        }
    });
}

function initAuthButtons() {
    // Vérifier si l'utilisateur est connecté après le chargement de supabase-config.js
    if (typeof window.authManager !== 'undefined') {
        updateAuthUI();
    } else {
        console.log('AuthManager pas encore chargé, réessai dans 1 seconde...');
        setTimeout(() => {
            if (typeof window.authManager !== 'undefined') {
                updateAuthUI();
            }
        }, 1000);
    }
}

function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    
    if (window.authManager && window.authManager.isAuthenticated()) {
        // Utilisateur connecté
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'flex';
            const userEmail = userMenu.querySelector('.user-email');
            const user = window.authManager.getUser();
            if (userEmail && user) {
                userEmail.textContent = user.email;
            }
        }
    } else {
        // Utilisateur non connecté
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
    }
}

// Fonction pour gérer la déconnexion
async function handleLogout() {
    if (window.authManager) {
        const result = await window.authManager.signOut();
        if (result.success) {
            // Redirection vers la page d'accueil
            window.location.href = '/index.html';
        }
    }
}

// Menu utilisateur mobile
function toggleUserMenu() {
    const userDropdown = document.querySelector('.user-dropdown');
    if (userDropdown) {
        userDropdown.classList.toggle('open');
    }
}

// Fermer le menu utilisateur en cliquant ailleurs
document.addEventListener('click', function(e) {
    const userMenu = document.querySelector('.user-menu');
    const userDropdown = document.querySelector('.user-dropdown');
    
    if (userMenu && userDropdown && !userMenu.contains(e.target)) {
        userDropdown.classList.remove('open');
    }
});

// Animation de la navbar au scroll
let lastScrollTop = 0;
window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    lastScrollTop = scrollTop;
    
    // Effet navbar au scroll
    if (scrollTop > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Smooth scroll pour les liens internes
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Animation d'apparition des éléments au scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

// Observer les éléments à animer
document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
});

// Animation des compteurs
function animateCountersOnScroll() {
    const statsSection = document.querySelector('.stats');
    if (!statsSection) return;
    
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    
    statsObserver.observe(statsSection);
}

function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    counters.forEach(counter => {
        const target = parseInt(counter.textContent.replace(/\D/g, ''));
        const suffix = counter.textContent.replace(/\d/g, '');
        let current = 0;
        const increment = target / 60;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                counter.textContent = target + suffix;
                clearInterval(timer);
            } else {
                counter.textContent = Math.floor(current) + suffix;
            }
        }, 25);
    });
}