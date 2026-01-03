// =====================================================
// OPTIPLAY MANAGER - Main JavaScript
// Version 1.0
// =====================================================

// =====================================================
// GLOBAL STATE
// =====================================================
const AppState = {
  currentUser: null,
  currentProfile: null,
  currentTeam: null,
  teams: [],
  currentTab: 'home',
  supabase: null
};

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing OptiPlay Manager...');
  
  // Always use window.supabaseClient (set by supabase-config.js)
  if (window.supabaseClient) {
    AppState.supabase = window.supabaseClient;
    console.log('✓ Using window.supabaseClient');
    console.log('Client has auth?', !!AppState.supabase.auth);
  } else {
    console.error('❌ No Supabase client available!');
    showToast('Erreur de configuration Supabase', 'error');
    hideLoadingScreen();
    showAuthRequiredScreen();
    return;
  }

  // Check authentication
  await checkAuthentication();
});

// =====================================================
// AUTHENTICATION CHECK
// =====================================================
async function checkAuthentication() {
  try {
    const { data: { session }, error } = await AppState.supabase.auth.getSession();
    
    if (error) throw error;

    if (!session) {
      // User not authenticated
      hideLoadingScreen();
      showAuthRequiredScreen();
      return;
    }

    // User authenticated
    AppState.currentUser = session.user;
    await initializeApp();
    
  } catch (error) {
    console.error('Authentication check error:', error);
    hideLoadingScreen();
    showAuthRequiredScreen();
  }
}

// =====================================================
// APP INITIALIZATION
// =====================================================
async function initializeApp() {
  try {
    // Load user data
    await loadUserProfile();
    
    // Load user teams
    await loadUserTeams();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check for invitation code in URL
    checkInvitationCode();
    
    // Hide loading, show app
    hideLoadingScreen();
    showAppContainer();
    
    // Load home view
    if (AppState.teams.length > 0) {
      selectTeam(AppState.teams[0].id);
    } else {
      showNoTeamView();
    }
    
  } catch (error) {
    console.error('App initialization error:', error);
    showToast('Erreur lors de l\'initialisation', 'error');
  }
}

// =====================================================
// LOAD USER PROFILE
// =====================================================
async function loadUserProfile() {
  try {
    const userInfo = AppState.currentUser;
    
    // Load profile from database
    const { data: profile, error } = await AppState.supabase
      .from('profiles')
      .select('*')
      .eq('id', userInfo.id)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error loading profile:', error);
    }
    
    // Store profile in AppState
    AppState.currentProfile = profile;
    
    // Update UI with profile data or fallback to user_metadata
    const displayName = profile?.pseudo || profile?.first_name || userInfo.user_metadata?.full_name || 'Utilisateur';
    document.getElementById('user-name').textContent = displayName;
    document.getElementById('user-email').textContent = userInfo.email;
    
    // Load avatar if available
    if (userInfo.user_metadata?.avatar_url) {
      const avatar = document.getElementById('user-avatar');
      avatar.innerHTML = `<img src="${userInfo.user_metadata.avatar_url}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    }
    
  } catch (error) {
    console.error('Error loading user profile:', error);
  }
}

// =====================================================
// LOAD USER TEAMS
// =====================================================
async function loadUserTeams() {
  try {
    const { data, error } = await AppState.supabase
      .from('team_members')
      .select(`
        team_id,
        role,
        teams (
          id,
          name,
          game_type,
          description,
          logo_url
        )
      `)
      .eq('user_id', AppState.currentUser.id);

    if (error) throw error;

    AppState.teams = data.map(item => ({
      ...item.teams,
      userRole: item.role
    }));

    renderTeamList();
    
  } catch (error) {
    console.error('Error loading teams:', error);
    showToast('Erreur lors du chargement des équipes', 'error');
  }
}

// =====================================================
// RENDER TEAM LIST
// =====================================================
function renderTeamList() {
  const teamList = document.getElementById('team-list');
  teamList.innerHTML = '';

  if (AppState.teams.length === 0) {
    teamList.innerHTML = '<div class="team-item" style="pointer-events:none;opacity:0.5;">Aucune équipe</div>';
    return;
  }

  AppState.teams.forEach(team => {
    const gameNames = {
      'lol': 'League of Legends',
      'valorant': 'Valorant',
      'rocketleague': 'Rocket League'
    };

    const teamItem = document.createElement('div');
    teamItem.className = 'team-item';
    if (AppState.currentTeam?.id === team.id) {
      teamItem.classList.add('active');
    }
    
    teamItem.innerHTML = `
      <i class="fas fa-users"></i>
      <div class="team-item-info">
        <span class="team-item-name">${team.name}</span>
        <span class="team-item-game">${gameNames[team.game_type] || team.game_type}</span>
      </div>
    `;
    
    teamItem.addEventListener('click', () => selectTeam(team.id));
    teamList.appendChild(teamItem);
  });
}

// =====================================================
// SELECT TEAM
// =====================================================
async function selectTeam(teamId) {
  try {
    const team = AppState.teams.find(t => t.id === teamId);
    if (!team) return;

    AppState.currentTeam = team;
    
    // Update UI
    document.getElementById('current-team-name').textContent = team.name;
    
    // Close dropdown
    document.getElementById('team-dropdown').style.display = 'none';
    
    // Update team list selection
    renderTeamList();
    
    // Show game-specific tabs
    showGameSpecificTabs(team.game_type);
    
    // Load team data
    await loadTeamData();
    
    // Reload LoL Manager data if game is League of Legends
    if (team.game_type === 'lol' && window.lolManager) {
      console.log('Reloading LoL Manager data...');
      
      // Set current team first
      window.lolManager.currentTeam = team;
      
      // Load both champion pool and compositions
      await window.lolManager.loadChampionPool();
      await window.lolManager.loadCompositions();
    }
    
    // Show home content
    showTab('home');
    
  } catch (error) {
    console.error('Error selecting team:', error);
    showToast('Erreur lors de la sélection de l\'équipe', 'error');
  }
}

// =====================================================
// SHOW GAME-SPECIFIC TABS
// =====================================================
function showGameSpecificTabs(gameType) {
  const gameTabsContainer = document.getElementById('game-specific-tabs');
  const allGameTabs = document.querySelectorAll('.game-tabs');
  
  // Hide all game tabs
  allGameTabs.forEach(tab => tab.style.display = 'none');
  
  // Show specific game tabs
  const specificTabs = document.querySelector(`.${gameType}-tabs`);
  if (specificTabs) {
    gameTabsContainer.style.display = 'block';
    specificTabs.style.display = 'block';
  } else {
    gameTabsContainer.style.display = 'none';
  }
}

// =====================================================
// LOAD TEAM DATA
// =====================================================
async function loadTeamData() {
  if (!AppState.currentTeam) return;

  try {
    // Load team members
    await TeamManager.loadMembers(AppState.currentTeam.id);
    
    // Load events
    await CalendarManager.loadEvents(AppState.currentTeam.id);
    
    // Load availabilities
    await AvailabilityManager.loadAvailabilities(AppState.currentTeam.id);
    
    // Load notes
    await NotesManager.loadNotes(AppState.currentTeam.id);
    
    // Render home view
    renderHomeView();
    
  } catch (error) {
    console.error('Error loading team data:', error);
    showToast('Erreur lors du chargement des données', 'error');
  }
}

// =====================================================
// RENDER HOME VIEW
// =====================================================
function renderHomeView() {
  // Render upcoming events
  const upcomingEvents = document.getElementById('upcoming-events');
  upcomingEvents.innerHTML = '<p style="color:var(--text-muted);">Aucun événement à venir</p>';
  
  // Render active members
  const activeMembers = document.getElementById('active-members');
  const members = TeamManager.members || [];
  if (members.length > 0) {
    activeMembers.innerHTML = members.slice(0, 5).map(member => `
      <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid var(--border-color);">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-user" style="font-size:0.875rem;"></i>
        </div>
        <div>
          <div style="font-weight:600;font-size:0.9rem;">${member.user_pseudo || member.user_name || member.user_email}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);">${member.role}</div>
        </div>
      </div>
    `).join('');
  } else {
    activeMembers.innerHTML = '<p style="color:var(--text-muted);">Aucun membre</p>';
  }
  
  // Render common availabilities
  const commonAvailabilities = document.getElementById('common-availabilities');
  commonAvailabilities.innerHTML = '<p style="color:var(--text-muted);">Aucune disponibilité commune</p>';
  
  // Render pinned notes
  const pinnedNotes = document.getElementById('pinned-notes');
  pinnedNotes.innerHTML = '<p style="color:var(--text-muted);">Aucune note épinglée</p>';
}

// =====================================================
// EVENT LISTENERS SETUP
// =====================================================
function setupEventListeners() {
  // Team selector dropdown
  document.getElementById('team-selector-btn').addEventListener('click', toggleTeamDropdown);
  
  // Create team button
  document.getElementById('create-team-btn').addEventListener('click', () => {
    closeTeamDropdown();
    openModal('create-team-modal');
  });
  
  // Join team button
  document.getElementById('join-team-btn').addEventListener('click', () => {
    closeTeamDropdown();
    openModal('join-team-modal');
  });
  
  // Add note button
  const addNoteBtn = document.getElementById('add-note-btn');
  if (addNoteBtn) {
    addNoteBtn.addEventListener('click', () => {
      NotesManager.showCreateNoteModal();
    });
  }
  
  // Initialize sub-managers (only if they have init methods)
  if (typeof AvailabilityManager !== 'undefined' && AvailabilityManager.init) {
    AvailabilityManager.init();
  }
  if (typeof NotesManager !== 'undefined' && NotesManager.init) {
    NotesManager.init();
  }
  if (typeof ScrimManager !== 'undefined' && ScrimManager.init) {
    ScrimManager.init();
  }
  if (typeof window.lolManager !== 'undefined' && window.lolManager.init) {
    console.log('Initializing LoL Manager...');
    window.lolManager.init();
  }
  
  // Create team form
  document.getElementById('create-team-form').addEventListener('submit', handleCreateTeam);
  
  // Join team form
  document.getElementById('join-team-form').addEventListener('submit', handleJoinTeam);
  
  // Navigation tabs
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = item.dataset.tab;
      showTab(tab);
    });
  });
  
  // Logout button
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  
  // Modal close buttons
  document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      if (modalId) {
        closeModal(modalId);
      }
    });
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('team-dropdown');
    const btn = document.getElementById('team-selector-btn');
    if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
      closeTeamDropdown();
    }
  });
}

// =====================================================
// TEAM DROPDOWN
// =====================================================
function toggleTeamDropdown() {
  const dropdown = document.getElementById('team-dropdown');
  dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

function closeTeamDropdown() {
  document.getElementById('team-dropdown').style.display = 'none';
}

// =====================================================
// TAB NAVIGATION
// =====================================================
function showTab(tabName) {
  console.log('📑 Showing tab:', tabName);
  
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  const activeNavItem = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeNavItem) {
    activeNavItem.classList.add('active');
  }
  
  // Hide all content sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
    section.style.display = 'none'; // Force hide
  });
  
  // Show selected content
  const contentId = `${tabName}-content`;
  const content = document.getElementById(contentId);
  if (content) {
    content.classList.add('active');
    content.style.display = 'block'; // Force show
    console.log('✅ Content shown:', contentId);
  } else {
    console.warn('⚠️ Content not found:', contentId);
  }
  
  AppState.currentTab = tabName;
  
  // Load tab-specific data
  loadTabData(tabName);
}

// =====================================================
// LOAD TAB DATA
// =====================================================
async function loadTabData(tabName) {
  if (!AppState.currentTeam) return;

  try {
    switch (tabName) {
      case 'home':
        renderHomeView();
        break;
      case 'planning':
        await CalendarManager.renderCalendar();
        break;
      case 'availabilities':
        await AvailabilityManager.renderAvailabilities();
        break;
      case 'notes':
        await NotesManager.renderNotes();
        break;
      case 'members':
        await TeamManager.renderMembers();
        break;
      case 'scrims':
        await ScrimManager.loadScrims(AppState.currentTeam.id);
        break;
      case 'settings':
        await TeamManager.renderSettings();
        break;
    }
  } catch (error) {
    console.error(`Error loading ${tabName} data:`, error);
  }
}

// =====================================================
// NO TEAM VIEW
// =====================================================
function showNoTeamView() {
  document.getElementById('no-team-view').classList.add('active');
  document.getElementById('current-team-name').textContent = 'Sélectionner une équipe';
}

// =====================================================
// CREATE TEAM
// =====================================================
async function handleCreateTeam(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const teamName = formData.get('team-name');
  const gameType = formData.get('team-game');
  const description = formData.get('team-description');
  
  try {
    const { data, error } = await AppState.supabase
      .rpc('create_team_with_owner', {
        team_name: teamName,
        team_game_type: gameType,
        team_description: description || null
      });
    
    if (error) throw error;
    
    showToast('Équipe créée avec succès !', 'success');
    closeModal('create-team-modal');
    e.target.reset();
    
    // Reload teams
    await loadUserTeams();
    
    // Select the new team
    selectTeam(data);
    
  } catch (error) {
    console.error('Error creating team:', error);
    showToast('Erreur lors de la création de l\'équipe', 'error');
  }
}

// =====================================================
// JOIN TEAM
// =====================================================
async function handleJoinTeam(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const inviteCode = formData.get('invite-code').trim();
  
  try {
    const { data, error } = await AppState.supabase
      .rpc('join_team_via_invite_with_cleanup', {
        invite_code_param: inviteCode
      });
    
    if (error) throw error;
    
    showToast('Vous avez rejoint l\'équipe !', 'success');
    closeModal('join-team-modal');
    e.target.reset();
    
    // Reload teams
    await loadUserTeams();
    
    // Select the new team
    selectTeam(data);
    
  } catch (error) {
    console.error('Error joining team:', error);
    showToast('Code d\'invitation invalide ou expiré', 'error');
  }
}

// =====================================================
// CHECK INVITATION CODE IN URL
// =====================================================
function checkInvitationCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get('invite');
  
  if (inviteCode) {
    // Auto-fill join form and open modal
    document.getElementById('invite-code').value = inviteCode;
    openModal('join-team-modal');
    
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// =====================================================
// LOGOUT
// =====================================================
async function handleLogout() {
  try {
    const { error } = await AppState.supabase.auth.signOut();
    if (error) throw error;
    
    // Redirect to home
    window.location.href = '../../index.html';
    
  } catch (error) {
    console.error('Logout error:', error);
    showToast('Erreur lors de la déconnexion', 'error');
  }
}

// =====================================================
// MODAL MANAGEMENT
// =====================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// =====================================================
// TOAST NOTIFICATIONS
// =====================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${icons[type]}"></i>
    <div class="toast-message">${message}</div>
    <button class="toast-close"><i class="fas fa-times"></i></button>
  `;
  
  container.appendChild(toast);
  
  // Close button
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// =====================================================
// UI HELPERS
// =====================================================
function hideLoadingScreen() {
  document.getElementById('loading-screen').style.display = 'none';
}

function showAuthRequiredScreen() {
  document.getElementById('auth-required-screen').style.display = 'flex';
}

function showAppContainer() {
  document.getElementById('app-container').style.display = 'flex';
}

// =====================================================
// EXPORTS
// =====================================================
window.AppState = AppState;
window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
