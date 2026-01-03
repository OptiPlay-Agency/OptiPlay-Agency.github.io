/**
 * SCRIM FINDER - CORE FUNCTIONALITY
 * OptiPlay eSport Platform
 */

// Global variables
let currentUser = null;
let currentTeam = null;
let supabaseClient = null;
let userTeams = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🚀 Initializing Scrim Finder...');
        
        // Wait for Supabase to be loaded (same as test)
        let attempts = 0;
        const maxAttempts = 50; // 50 * 200ms = 10 seconds
        
        while (!window.supabaseClient && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
        }
        
        if (!window.supabaseClient) {
            console.error('❌ Supabase client timeout');
            showNotification('Erreur de connexion à la base de données', 'error');
            return;
        }
        
        supabaseClient = window.supabaseClient;
        console.log('✅ Supabase client ready');
        
        // Check authentication (same as test)
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        
        if (authError || !user) {
            console.log('❌ User not authenticated, redirecting...');
            window.location.href = '../HTML/login.html';
            return;
        }
        
        currentUser = user;
        console.log('✅ User authenticated:', user.email);
        
        // Update user info in sidebar
        updateUserInfo(user);
        
        // Load team (same as test)
        await loadTeamSimple();
        
        // Initialize UI
        initializeUI();
        setupEventListeners();
        
        console.log('✅ Scrim Finder initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing:', error);
        showNotification('Erreur lors de l\'initialisation', 'error');
    }
});

// Simplified team loading (same logic as test)
async function loadTeamSimple() {
    try {
        console.log('🔍 Loading teams...');
        
        if (!window.supabaseClient) {
            throw new Error('Supabase client not available');
        }
        
        if (!currentUser) {
            throw new Error('No current user');
        }
        
        // Get user's owned teams first
        const { data: ownedTeams, error: ownedError } = await window.supabaseClient
            .from('teams')
            .select('*')
            .eq('created_by', currentUser.id)
            .limit(1);
            
        if (ownedError) {
            console.error('Error loading owned teams:', ownedError);
        }
        
        if (ownedTeams && ownedTeams.length > 0) {
            currentTeam = ownedTeams[0];
            console.log('✅ Team loaded:', currentTeam.name);
            updateTeamSelector(currentTeam);
            hideNoTeamState();
            
            // Load dashboard data for this team
            await loadDashboardData();
            return;
        }
        
        // Try member teams
        const { data: memberTeams, error: memberError } = await window.supabaseClient
            .from('team_members')
            .select('teams(*)')
            .eq('user_id', currentUser.id)
            .limit(1);
            
        if (memberError) {
            console.warn('Error loading member teams:', memberError);
        }
        
        if (memberTeams && memberTeams.length > 0 && memberTeams[0].teams) {
            currentTeam = memberTeams[0].teams;
            console.log('✅ Team loaded (member):', currentTeam.name);
            updateTeamSelector(currentTeam);
            hideNoTeamState();
            
            // Load dashboard data for this team
            await loadDashboardData();
        } else {
            console.log('⚠️ No team found');
            showNoTeamState();
        }
        
    } catch (error) {
        console.error('❌ Error loading teams:', error);
        showNotification('Erreur lors du chargement des équipes', 'error');
        showNoTeamState();
    }
}

/**
 * Authentication Management
 */
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error || !user) {
            // Redirect to login if not authenticated
            window.location.href = '../HTML/login.html';
            return;
        }
        
        currentUser = user;
        await updateUserInfo(user);
        
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '../HTML/login.html';
    }
}

async function updateUserInfo(user) {
    try {
        // Get user profile from database
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('id, pseudo, avatar_url')
            .eq('id', user.id)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Error loading user profile:', error);
        }
        
        const userName = document.getElementById('user-name');
        const userSubscription = document.getElementById('user-subscription');
        
        if (userName) {
            // Use profile pseudo or fallback to email
            const displayName = profile?.pseudo || 
                               user.user_metadata?.full_name || 
                               user.email?.split('@')[0] || 
                               'Utilisateur';
            userName.textContent = displayName;
        }
        
        if (userSubscription) {
            // Use subscription from profile or default
            userSubscription.textContent = 'PLAN GRATUIT';
        }
        
        // Update user avatar if exists
        const userAvatar = document.querySelector('.user-avatar');
        if (userAvatar) {
            const avatarImg = userAvatar.querySelector('img');
            const avatarIcon = userAvatar.querySelector('i');
            
            const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;
            
            if (avatarUrl) {
                if (!avatarImg) {
                    const img = document.createElement('img');
                    img.src = avatarUrl;
                    img.alt = 'Avatar';
                    userAvatar.appendChild(img);
                } else {
                    avatarImg.src = avatarUrl;
                }
                if (avatarIcon) avatarIcon.style.display = 'none';
            } else {
                if (avatarImg) avatarImg.style.display = 'none';
                if (avatarIcon) avatarIcon.style.display = 'flex';
            }
        }
        
    } catch (error) {
        console.error('Error updating user info:', error);
        // Fallback to basic info
        const userName = document.getElementById('user-name');
        if (userName) {
            userName.textContent = user.email?.split('@')[0] || 'Utilisateur';
        }
    }
}

/**
 * Team Management (integrated with Team Manager)
 */
async function loadUserTeamsFromTeamManager() {
    try {
        if (!currentUser) {
            console.log('No current user found');
            return;
        }
        
        console.log('Loading teams for user:', currentUser.id);
        
        // Get teams where user is creator OR member (Team Manager structure)
        const { data: ownedTeams, error: ownedError } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('created_by', currentUser.id);
        
        if (ownedError) throw ownedError;
        console.log('Owned teams:', ownedTeams);
        
        const { data: memberTeams, error: memberError } = await supabaseClient
            .from('team_members')
            .select(`
                role,
                teams (*)
            `)
            .eq('user_id', currentUser.id);
        
        if (memberError) throw memberError;
        console.log('Member teams:', memberTeams);
        
        // Combine owned and member teams
        const allTeams = [
            ...(ownedTeams || []).map(team => ({
                ...team,
                userRole: 'owner'
            })),
            ...(memberTeams || []).map(member => ({
                ...member.teams,
                userRole: member.role
            }))
        ];
        
        // Remove duplicates by ID
        userTeams = allTeams.filter((team, index, self) => 
            index === self.findIndex(t => t.id === team.id)
        );
        
        console.log('Final user teams:', userTeams);
        
        populateTeamSelector(userTeams);
        
        // Auto-select first team if available
        if (userTeams.length > 0) {
            currentTeam = userTeams[0];
            updateTeamSelector(currentTeam.id);
            await loadDashboardData();
        } else {
            console.log('No teams found for user');
            showNoTeamState();
        }
        
    } catch (error) {
        console.error('Error loading user teams:', error);
        showNotification('Erreur lors du chargement des équipes: ' + error.message, 'error');
    }
}

function populateTeamSelector(teams) {
    const teamSelect = document.getElementById('team-select');
    if (!teamSelect) return;
    
    // Clear existing options except first one
    teamSelect.innerHTML = '<option value=\"\">Sélectionner une équipe...</option>';
    
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = `${team.name}${team.level ? ` (${team.level})` : ''}`;
        teamSelect.appendChild(option);
    });
}

function updateTeamSelector(team) {
    if (!team) return;
    
    const teamSelect = document.getElementById('team-select');
    if (teamSelect) {
        // Clear existing options except the first one
        while (teamSelect.children.length > 1) {
            teamSelect.removeChild(teamSelect.lastChild);
        }
        
        // Add the current team as an option
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        option.selected = true;
        teamSelect.appendChild(option);
        
        console.log('✅ Team selector updated with:', team.name);
    }
    
    // Also update any team name displays
    const teamNameElements = document.querySelectorAll('.current-team-name, #current-team-name');
    teamNameElements.forEach(element => {
        element.textContent = team.name;
    });
}

function updateUserInfo(user) {
    const userNameElement = document.getElementById('user-name');
    const userEmailElement = document.getElementById('user-email');
    
    if (userNameElement) {
        userNameElement.textContent = user.user_metadata?.full_name || 
                                     user.user_metadata?.first_name || 
                                     'Utilisateur';
    }
    
    if (userEmailElement) {
        userEmailElement.textContent = user.email || 'Plan Gratuit';
    }
}

async function onTeamChange() {
    const teamSelect = document.getElementById('team-select');
    const teamId = teamSelect.value;
    
    if (!teamId) {
        currentTeam = null;
        showNoTeamState();
        return;
    }
    
    try {
        // Get selected team data
        const { data: team, error } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('id', teamId)
            .single();
        
        if (error) {
            console.error('Error loading team:', error);
            return;
        }
        
        currentTeam = team;
        hideNoTeamState();
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error changing team:', error);
    }
}

function showNoTeamState() {
    const noTeamState = document.getElementById('no-team-state');
    const dashboardContent = document.getElementById('dashboard-content');
    
    if (noTeamState) noTeamState.style.display = 'block';
    if (dashboardContent) dashboardContent.style.display = 'none';
}

function hideNoTeamState() {
    const noTeamState = document.getElementById('no-team-state');
    const dashboardContent = document.getElementById('dashboard-content');
    
    if (noTeamState) noTeamState.style.display = 'none';
    if (dashboardContent) dashboardContent.style.display = 'grid';
}

/**
 * Authentication functions
 */
async function logout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            console.error('Logout error:', error);
            showNotification('Erreur lors de la déconnexion', 'error');
            return;
        }
        
        // Redirect to login page
        window.location.href = '../HTML/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Erreur lors de la déconnexion', 'error');
    }
}

// Expose logout function globally
window.logout = logout;

/**
 * Dashboard Data Loading
 */
async function loadDashboardData() {
    if (!currentTeam) return;
    
    try {
        await Promise.all([
            loadDashboardStats(),
            loadUpcomingScrims(),
            loadPendingRequests(),
            loadRecentActivity()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadDashboardStats() {
    if (!currentTeam) return;
    
    try {
        console.log('📊 Loading dashboard stats for team:', currentTeam.id);
        
        // Get scrims statistics (simple query like test)
        const { data: scrims, error } = await supabaseClient
            .from('scrims')
            .select('status')
            .eq('team_id', currentTeam.id);
        
        if (error) {
            console.error('Error loading stats:', error);
            showNotification('Erreur lors du chargement des statistiques', 'error');
            return;
        }
        
        console.log('📊 Found scrims for stats:', scrims?.length || 0);
        
        const stats = {
            pending: scrims?.filter(s => s.status === 'pending').length || 0,
            confirmed: scrims?.filter(s => s.status === 'confirmed' || s.status === 'accepted').length || 0,
            completed: scrims?.filter(s => s.status === 'completed' && s.final_score !== '0-0').length || 0 // Only count scrims that were actually played
        };
        
        updateDashboardStats(stats);
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

function updateDashboardStats(stats) {
    const pendingElement = document.getElementById('pending-scrims');
    const confirmedElement = document.getElementById('confirmed-scrims');
    const completedElement = document.getElementById('completed-scrims');
    
    if (pendingElement) pendingElement.textContent = stats.pending;
    if (confirmedElement) confirmedElement.textContent = stats.confirmed;
    if (completedElement) completedElement.textContent = stats.completed;
}

async function loadUpcomingScrims() {
    if (!currentTeam) return;
    
    try {
        console.log('📅 Loading upcoming scrims for team:', currentTeam.id);
        
        const { data: scrims, error } = await supabaseClient
            .from('scrims')
            .select('*')
            .eq('team_id', currentTeam.id)
            .in('status', ['confirmed', 'pending'])
            .gte('scrim_date', new Date().toISOString().split('T')[0])
            .order('scrim_date', { ascending: true })
            .limit(5);
        
        if (error) {
            console.error('Error loading upcoming scrims:', error);
            return;
        }
        
        console.log('📅 Found upcoming scrims:', scrims?.length || 0);
        displayUpcomingScrims(scrims || []);
        
    } catch (error) {
        console.error('Error loading upcoming scrims:', error);
    }
}

function displayUpcomingScrims(scrims) {
    const container = document.getElementById('upcoming-scrims');
    if (!container) return;
    
    if (scrims.length === 0) {
        container.innerHTML = '<p class=\"text-muted\">Aucun scrim à venir</p>';
        return;
    }
    
    container.innerHTML = scrims.map(scrim => `
        <div class=\"scrim-card\" onclick=\"viewScrimDetails('${scrim.id}')\">
            <div class=\"scrim-header\">
                <div>
                    <div class="scrim-title">vs ${scrim.opponent_name || 'Cherche adversaire'}</div>
                    <div class="scrim-subtitle">${formatDate(scrim.scrim_date)} à ${scrim.scrim_time}</div>
                </div>
                <div class=\"scrim-status status-${scrim.status}\">
                    ${getStatusText(scrim.status)}
                </div>
            </div>
            <div class=\"scrim-info\">
                <div class=\"info-row\">
                    <i class=\"fas fa-gamepad\"></i>
                    <span>${getGameName(currentTeam.game)}</span>
                </div>
                <div class=\"info-row\">
                    <i class=\"fas fa-clock\"></i>
                    <span>${scrim.duration || 120} min</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-globe"></i>
                    <span>${scrim.region || 'EUW'}</span>
                </div>
                ${scrim.format ? `
                <div class="info-row">
                    <i class="fas fa-trophy"></i>
                    <span>${getFormatName(scrim.format)}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

async function loadPendingRequests() {
    if (!currentTeam) return;
    
    try {
        const { data: scrims, error } = await supabaseClient
            .from('scrims')
            .select('*')
            .eq('team_id', currentTeam.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) {
            console.error('Error loading pending scrims:', error);
            return;
        }
        
        displayPendingRequests(scrims || []);
        
    } catch (error) {
        console.error('Error loading pending requests:', error);
    }
}

function displayPendingRequests(requests) {
    const container = document.getElementById('pending-requests');
    if (!container) return;
    
    if (requests.length === 0) {
        container.innerHTML = '<p class=\"text-muted\">Aucune demande en attente</p>';
        return;
    }    
    container.innerHTML = requests.map(request => `
        <div class="request-card">
            <div class="request-header">
                <div class="request-title">${request.opponent_name || 'Scrim en attente'}</div>
                <div class="request-date">${formatDate(request.scrim_date)} à ${request.scrim_time}</div>
            </div>
            <div class="request-info">
                <div class="info-row">
                    <i class="fas fa-clock"></i>
                    <span>${request.duration || 120} min</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-globe"></i>
                    <span>${request.region || 'EUW'}</span>
                </div>
                ${request.format ? `
                <div class="info-row">
                    <i class="fas fa-trophy"></i>
                    <span>${getFormatName(request.format)}</span>
                </div>
                ` : ''}
            </div>
            <div class="request-actions">
                <button class="btn btn-sm btn-success" onclick="confirmScrim('${request.id}')">
                    <i class="fas fa-check"></i> Confirmer
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="viewScrimDetails('${request.id}')">
                    <i class="fas fa-eye"></i> Voir
                </button>
            </div>
        </div>
    `).join('');    
    container.innerHTML = requests.map(request => `
        <div class=\"request-card\">
            <div class=\"request-header\">
                <div>
                    <div class=\"request-title\">${request.requesting_team?.name}</div>
                    <div class=\"request-subtitle\">Demande de scrim</div>
                </div>
            </div>
            <div class=\"request-info\">
                <div class=\"info-row\">
                    <i class=\"fas fa-calendar\"></i>
                    <span>${formatDate(request.scrim?.date)} à ${request.scrim?.time}</span>
                </div>
            </div>
            <div class=\"request-actions\">
                <button class=\"btn btn-success btn-sm\" onclick=\"handleRequest('${request.id}', 'accepted')\">
                    <i class=\"fas fa-check\"></i>
                    Accepter
                </button>
                <button class=\"btn btn-error btn-sm\" onclick=\"handleRequest('${request.id}', 'rejected')\">
                    <i class=\"fas fa-times\"></i>
                    Refuser
                </button>
            </div>
        </div>
    `).join('');
}

async function loadRecentActivity() {
    // TODO: Implement activity feed
    const container = document.getElementById('recent-activity');
    if (container) {
        container.innerHTML = '<p class=\"text-muted\">Aucune activité récente</p>';
    }
}

/**
 * Event Listeners
 */
function setupEventListeners() {
    // Team selector change
    const teamSelect = document.getElementById('team-select');
    if (teamSelect) {
        teamSelect.addEventListener('change', onTeamChange);
    }
    
    // Navigation highlighting
    highlightCurrentPage();
}

function highlightCurrentPage() {
    const navItems = document.querySelectorAll('.nav-item');
    const currentPage = window.location.pathname.split('/').pop();
    
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === currentPage) {
            item.classList.add('active');
        }
    });
}

/**
 * Modal Management
 */
function openCreateTeamModal() {
    const modal = document.getElementById('create-team-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('fade-in');
    }
}

function closeCreateTeamModal() {
    const modal = document.getElementById('create-team-modal');
    if (modal) {
        modal.style.display = 'none';
        // Reset form
        const form = document.getElementById('create-team-form');
        if (form) form.reset();
    }
}

/**
 * Utility Functions
 */
function getGameName(gameCode) {
    const games = {
        'lol': 'League of Legends',
        'valorant': 'Valorant',
        'rocket-league': 'Rocket League'
    };
    return games[gameCode] || gameCode;
}

function getFormatName(format) {
    const formats = {
        'bo1': 'Best of 1',
        'bo3': 'Best of 3',
        'bo5': 'Best of 5',
        'custom': 'Personnalisé'
    };
    return formats[format] || format;
}

function getStatusText(status) {
    const statuses = {
        'pending': 'En attente',
        'confirmed': 'Confirmé',
        'rejected': 'Refusé',
        'completed': 'Terminé',
        'cancelled': 'Annulé',
        'open': 'Ouvert'
    };
    return statuses[status] || status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(timeString) {
    return timeString.substring(0, 5); // Remove seconds
}

function showNotification(message, type = 'info') {
    // TODO: Implement notification system
    console.log(`${type.toUpperCase()}: ${message}`);
}

async function viewScrimDetails(scrimId) {
    // TODO: Implement scrim detail modal
    console.log('View scrim details:', scrimId);
}

async function confirmScrim(scrimId) {
    if (!confirm('Confirmer ce scrim ?')) {
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('scrims')
            .update({ 
                status: 'confirmed',
                updated_at: new Date().toISOString()
            })
            .eq('id', scrimId);
        
        if (error) {
            console.error('Error confirming scrim:', error);
            showNotification('Erreur lors de la confirmation du scrim', 'error');
            return;
        }
        
        showNotification('Scrim confirmé !', 'success');
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error confirming scrim:', error);
        showNotification('Erreur lors de la confirmation du scrim', 'error');
    }
}

async function handleRequest(requestId, action) {
    try {
        const { error } = await supabaseClient
            .from('scrim_requests')
            .update({ 
                status: action,
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);
        
        if (error) {
            console.error('Error handling request:', error);
            showNotification('Erreur lors du traitement de la demande', 'error');
            return;
        }
        
        showNotification(`Demande ${action === 'accepted' ? 'acceptée' : 'refusée'}`, 'success');
        await loadPendingRequests();
        await loadDashboardStats();
        
    } catch (error) {
        console.error('Error handling request:', error);
        showNotification('Erreur lors du traitement de la demande', 'error');
    }
}

/**
 * UI Initialization
 */
function initializeUI() {
    // Set minimum date for date inputs
    const dateInputs = document.querySelectorAll('input[type=\"date\"]');
    const today = new Date().toISOString().split('T')[0];
    
    dateInputs.forEach(input => {
        input.min = today;
    });
    
    // Close modals when clicking outside
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal[style*=\"flex\"]');
            openModals.forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

// Export functions for use in other modules
window.ScrimFinder = {
    openCreateTeamModal,
    closeCreateTeamModal,
    viewScrimDetails,
    handleRequest,
    showNotification,
    getGameName,
    getFormatName,
    getStatusText,
    formatDate,
    formatTime,
    loadUserTeamsFromTeamManager,
    onTeamChange,
    loadDashboardData
};

// Also expose the main function directly for team-management.js
window.loadUserTeamsFromTeamManager = loadUserTeamsFromTeamManager;

// Logout function
async function logout() {
    try {
        const { error } = await window.supabaseClient.auth.signOut();
        
        if (error) {
            console.error('Logout error:', error);
            showNotification('Erreur lors de la déconnexion', 'error');
            return;
        }
        
        console.log('✅ Logout successful');
        showNotification('Déconnexion réussie', 'success');
        
        // Clear local variables
        currentUser = null;
        currentTeam = null;
        userTeams = [];
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Erreur lors de la déconnexion', 'error');
    }
}

// Add event listeners for logout buttons
document.addEventListener('DOMContentLoaded', () => {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});

// Expose logout function globally
window.logout = logout;