/**
 * SEARCH FUNCTIONALITY
 * OptiPlay Scrim Finder
 */

// Global variables (currentUser and currentTeam are defined in scrim-finder.js)
let searchFilters = {
    date: '',
    timeStart: '',
    timeEnd: '',
    level: '',
    region: '',
    format: '',
    availableNow: false
};

let searchResults = [];
let currentSortBy = 'date';

document.addEventListener('DOMContentLoaded', async function() {
    await initializeSearch();
});

async function initializeSearch() {
    try {
        console.log('🔍 Initializing Search...');
        
        // Wait for Supabase (same as test)
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!window.supabaseClient && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
        }
        
        if (!window.supabaseClient) {
            console.error('❌ Supabase timeout');
            showNotification('Erreur de connexion', 'error');
            return;
        }
        
        // Check auth
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        
        if (authError || !user) {
            console.log('❌ Not authenticated');
            window.location.href = '../HTML/login.html';
            return;
        }
        
        currentUser = user;
        console.log('✅ User:', user.email);
        
        // Load team (same as test)
        await loadTeamForSearch();
        
        // Setup UI
        setupSearchFunctionality();
        
        // Load scrims
        if (currentTeam) {
            await loadAvailableScrims();
        }
        
        console.log('✅ Search initialized');
    } catch (error) {
        console.error('❌ Search init error:', error);
        showNotification('Erreur d\'initialisation', 'error');
    }
}

async function loadTeamForSearch() {
    try {
        console.log('🔍 Loading team for search...');
        
        const { data: ownedTeams, error: ownedError } = await window.supabaseClient
            .from('teams')
            .select('*')
            .eq('created_by', currentUser.id)
            .limit(1);
            
        if (ownedError) throw ownedError;
        
        if (ownedTeams && ownedTeams.length > 0) {
            currentTeam = ownedTeams[0];
            console.log('✅ Team loaded:', currentTeam.name);
        } else {
            console.log('⚠️ No team found');
            displayNoTeamMessage();
        }
    } catch (error) {
        console.error('❌ Error loading team:', error);
        displayNoTeamMessage();
    }
}

function setupSearchFunctionality() {
    // Filter form submission
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    // Reset filters
    const resetFiltersBtn = document.getElementById('reset-filters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
    
    // Sort change
    const sortSelect = document.getElementById('sort-by');
    if (sortSelect) {
        sortSelect.addEventListener('change', onSortChange);
    }
    
    // Real-time filtering on input changes
    setupRealtimeFiltering();
}

function setupRealtimeFiltering() {
    const filterInputs = [
        'filter-date',
        'filter-time-start',
        'filter-time-end',
        'filter-level',
        'filter-region',
        'filter-format',
        'filter-available-now'
    ];
    
    filterInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', updateFiltersAndSearch);
        }
    });
}

async function loadAvailableScrims() {
    if (!currentTeam) {
        console.log('❌ No currentTeam for search');
        displayNoTeamMessage();
        return;
    }

    console.log('🔍 Loading available scrims for team:', currentTeam);

    try {
        // Get ALL pending scrims (including our own)
        console.log('🔍 Querying scrims with:', {
            status: 'pending',
            date_filter: new Date().toISOString().split('T')[0]
        });
        
        const { data: scrims, error } = await window.supabaseClient
            .from('scrims')
            .select('*')
            .eq('status', 'pending')
            .gte('scrim_date', new Date().toISOString().split('T')[0])
            .order('scrim_date', { ascending: true });

        console.log('📊 Raw scrims from database:', scrims);
        console.log('📊 Query error:', error);
        
        if (error) {
            console.error('Error loading scrims:', error);
            showNotification('Erreur lors du chargement des scrims', 'error');
            return;
        }

        // Show all scrims (both own and others)
        console.log('📊 All pending scrims found:', scrims?.length || 0);
        
        if (scrims && scrims.length > 0) {
            scrims.forEach(scrim => {
                const isOwn = scrim.team_id === currentTeam.id;
                console.log(`  ${isOwn ? '🟢' : '🔵'} ID: ${scrim.id}, Date: ${scrim.scrim_date} ${scrim.scrim_time}`);
            });
        }

        searchResults = scrims || [];
        displaySearchResults(searchResults);
        updateResultsCount(searchResults.length);

    } catch (error) {
        console.error('Error loading scrims:', error);
        showNotification('Erreur lors du chargement des scrims', 'error');
    }
}

function displayNoTeamMessage() {
    const container = document.getElementById('scrims-grid');
    const noResults = document.getElementById('no-results');
    
    if (container) {
        container.style.display = 'none';
    }
    
    if (noResults) {
        noResults.style.display = 'block';
        noResults.innerHTML = `
            <div class="empty-icon">
                <i class="fas fa-users"></i>
            </div>
            <h3>Équipe requise</h3>
            <p>Vous devez sélectionner une équipe pour rechercher des scrims.</p>
            <button class="btn btn-primary" onclick="window.location.href='index.html'">
                <i class="fas fa-arrow-left"></i>
                Retour au dashboard
            </button>
        `;
    }
}

async function updateFiltersAndSearch() {
    // Update filter object
    searchFilters = {
        date: document.getElementById('filter-date')?.value || '',
        timeStart: document.getElementById('filter-time-start')?.value || '',
        timeEnd: document.getElementById('filter-time-end')?.value || '',
        level: document.getElementById('filter-level')?.value || '',
        region: document.getElementById('filter-region')?.value || '',
        format: document.getElementById('filter-format')?.value || '',
        availableNow: document.getElementById('filter-available-now')?.checked || false
    };
    
    // Apply filters to search results
    const filteredResults = applyFiltersToResults(searchResults);
    
    // Sort results
    const sortedResults = sortResults(filteredResults, currentSortBy);
    
    // Display results
    displaySearchResults(sortedResults);
    updateResultsCount(filteredResults.length);
}

function applyFilters() {
    updateFiltersAndSearch();
}

function resetFilters() {
    // Clear all filter inputs
    document.getElementById('filter-date').value = '';
    document.getElementById('filter-time-start').value = '';
    document.getElementById('filter-time-end').value = '';
    document.getElementById('filter-level').value = '';
    document.getElementById('filter-region').value = '';
    document.getElementById('filter-format').value = '';
    document.getElementById('filter-available-now').checked = false;
    
    // Reset filters and reload
    searchFilters = {
        date: '',
        timeStart: '',
        timeEnd: '',
        level: '',
        region: '',
        format: '',
        availableNow: false
    };
    
    displaySearchResults(searchResults);
    updateResultsCount(searchResults.length);
}

function applyFiltersToResults(results) {
    return results.filter(scrim => {
        // Date filter
        if (searchFilters.date && scrim.scrim_date !== searchFilters.date) {
            return false;
        }
        
        // Time range filter
        if (searchFilters.timeStart && scrim.scrim_time < searchFilters.timeStart) {
            return false;
        }
        
        if (searchFilters.timeEnd && scrim.scrim_time > searchFilters.timeEnd) {
            return false;
        }
        
        // Level filter (check team level)
        if (searchFilters.level && scrim.team?.level && 
            scrim.team.level.toLowerCase() !== searchFilters.level.toLowerCase()) {
            return false;
        }
        
        // Region filter
        if (searchFilters.region && scrim.region !== searchFilters.region) {
            return false;
        }
        
        // Format filter
        if (searchFilters.format && scrim.format !== searchFilters.format) {
            return false;
        }
        
        // Available now filter
        if (searchFilters.availableNow) {
            const now = new Date();
            const scrimDateTime = new Date(`${scrim.scrim_date}T${scrim.scrim_time}`);
            const timeDiff = scrimDateTime - now;
            
            // Available now = within next 2 hours
            if (timeDiff > 2 * 60 * 60 * 1000 || timeDiff < 0) {
                return false;
            }
        }
        
        return true;
    });
}

function onSortChange() {
    const sortSelect = document.getElementById('sort-by');
    currentSortBy = sortSelect.value;
    updateFiltersAndSearch();
}

function sortResults(results, sortBy) {
    const sortedResults = [...results];
    
    switch (sortBy) {
        case 'date':
            return sortedResults.sort((a, b) => {
                const dateCompare = new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
                return dateCompare;
            });
            
        case 'level':
            return sortedResults.sort((a, b) => {
                const levelOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'challenger'];
                const levelA = levelOrder.indexOf(a.team?.level?.toLowerCase()) || 0;
                const levelB = levelOrder.indexOf(b.team?.level?.toLowerCase()) || 0;
                return levelB - levelA;
            });
            
        case 'region':
            return sortedResults.sort((a, b) => a.region.localeCompare(b.region));
            
        case 'created':
            return sortedResults.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
        default:
            return sortedResults;
    }
}

function displaySearchResults(scrims) {
    const container = document.getElementById('scrims-grid');
    const noResults = document.getElementById('no-results');
    
    if (!container || !noResults) return;
    
    if (scrims.length === 0) {
        container.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    
    container.style.display = 'grid';
    noResults.style.display = 'none';
    
    container.innerHTML = scrims.map(scrim => {
        const isOwnScrim = scrim.team_id === currentTeam?.id;
        
        return `
        <div class="scrim-card ${isOwnScrim ? 'own-scrim' : ''}" onclick="openScrimModal('${scrim.id}', scrim)">
            <div class="scrim-header">
                <div>
                    <div class="scrim-title">
                        ${isOwnScrim ? '🟢 VOTRE SCRIM' : '🔵 SCRIM DISPONIBLE'}
                    </div>
                    <div class="scrim-subtitle">${formatDate(scrim.scrim_date)} à ${formatTime(scrim.scrim_time)}</div>
                </div>
                <div class="scrim-status status-${isOwnScrim ? 'own' : 'open'}">
                    ${isOwnScrim ? 'Vôtre' : 'Ouvert'}
                </div>
            </div>
            <div class="scrim-info">
                <div class="info-row">
                    <i class="fas fa-gamepad"></i>
                    <span>${getGameName(scrim.game || 'lol')}</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-trophy"></i>
                    <span>${getFormatName(scrim.format)}</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-users"></i>
                    <span>${scrim.opponent_name || 'Cherche adversaire'}</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-clock"></i>
                    <span>${scrim.duration || 120} min</span>
                </div>
            </div>
            ${scrim.notes ? `
            <div class="scrim-description">
                ${truncateText(scrim.notes, 100)}
            </div>
            ` : ''}
            <div class="scrim-actions">
                ${isOwnScrim ? `
                    <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); editScrim('${scrim.id}')">
                        <i class="fas fa-edit"></i>
                        Modifier
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); cancelScrim('${scrim.id}')">
                        <i class="fas fa-times"></i>
                        Annuler
                    </button>
                ` : `
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); requestScrim('${scrim.id}')">
                        <i class="fas fa-handshake"></i>
                        Demander ce scrim
                    </button>
                `}
            </div>
        </div>
        `;
    }).join('');
}

function updateResultsCount(count) {
    const resultsCount = document.getElementById('results-count');
    if (resultsCount) {
        resultsCount.textContent = `${count} scrim${count !== 1 ? 's' : ''} disponible${count !== 1 ? 's' : ''}`;
    }
}

async function requestScrim(scrimId) {
    if (!currentTeam) {
        showNotification('Vous devez sélectionner une équipe', 'error');
        return;
    }
    
    try {
        // Check if request already exists
        const { data: existingRequest, error: checkError } = await window.supabaseClient
            .from('scrim_requests')
            .select('id')
            .eq('scrim_id', scrimId)
            .eq('requesting_team_id', currentTeam.id)
            .single();
        
        if (existingRequest) {
            showNotification('Vous avez déjà fait une demande pour ce scrim', 'info');
            return;
        }
        
        // Get scrim details
        const { data: scrim, error: scrimError } = await window.supabaseClient
            .from('scrims')
            .select('team_id')
            .eq('id', scrimId)
            .single();
        
        if (scrimError || !scrim) {
            showNotification('Scrim introuvable', 'error');
            return;
        }
        
        // Create request
        const { error: requestError } = await window.supabaseClient
            .from('scrim_requests')
            .insert([{
                scrim_id: scrimId,
                requesting_team_id: currentTeam.id,
                host_team_id: scrim.team_id,
                status: 'pending',
                message: '' // TODO: Add message input
            }]);
        
        if (requestError) {
            console.error('Error creating scrim request:', requestError);
            showNotification('Erreur lors de l\'envoi de la demande', 'error');
            return;
        }
        
        showNotification('Demande envoyée avec succès!', 'success');
        
        // Refresh results to reflect the request
        await loadAvailableScrims();
        
    } catch (error) {
        console.error('Error requesting scrim:', error);
        showNotification('Erreur lors de l\'envoi de la demande', 'error');
    }
}

// Utility functions
function getRegionName(region) {
    const regions = {
        'euw': 'Europe West',
        'eune': 'Europe Nordic & East',
        'na': 'North America',
        'kr': 'Korea',
        'jp': 'Japan',
        'oce': 'Oceania',
        'br': 'Brazil',
        'lan': 'Latin America North',
        'las': 'Latin America South',
        'tr': 'Turkey',
        'ru': 'Russia'
    };
    return regions[region] || region;
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

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function parseScrimDetails(message) {
    if (!message) return {};
    
    const details = {};
    const lines = message.split('\n');
    
    lines.forEach(line => {
        if (line.includes('Date:')) {
            details.date = line.split('Date:')[1]?.trim();
        } else if (line.includes('Heure:')) {
            details.time = line.split('Heure:')[1]?.trim();
        } else if (line.includes('Format:')) {
            details.format = line.split('Format:')[1]?.trim();
        } else if (line.includes('Titre:')) {
            details.title = line.split('Titre:')[1]?.trim();
        }
    });
    
    return details;
}

function isOnlyScrimDetails(message) {
    if (!message) return true;
    
    const lines = message.split('\n').filter(line => line.trim());
    const detailLines = lines.filter(line => 
        line.includes('Date:') || 
        line.includes('Heure:') || 
        line.includes('Format:') || 
        line.includes('Titre:') ||
        line.includes('Détails:')
    );
    
    return detailLines.length === lines.length;
}

function getDescriptionFromMessage(message) {
    if (!message) return '';
    
    const lines = message.split('\n');
    const descriptionLines = [];
    let inDetails = false;
    
    lines.forEach(line => {
        if (line.includes('Détails:')) {
            inDetails = true;
            return;
        }
        
        if (!inDetails && line.trim() && 
            !line.includes('Date:') && 
            !line.includes('Heure:') && 
            !line.includes('Format:') && 
            !line.includes('Titre:')) {
            descriptionLines.push(line.trim());
        }
    });
    
    return descriptionLines.join(' ');
}

/**
 * MODAL AND REQUEST FUNCTIONS
 */
function openScrimModal(scrimId, scrimData) {
    const modal = document.createElement('div');
    modal.className = 'modal fade show';
    modal.style.display = 'block';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.id = 'scrim-detail-modal';
    
    // Find the scrim data if not provided
    if (!scrimData) {
        scrimData = searchResults.find(s => s.id === scrimId);
    }
    
    if (!scrimData) {
        showNotification('Scrim non trouvé', 'error');
        return;
    }

    console.log('🔍 Opening modal for scrim:', scrimData);

    // Get team info and load members
    loadTeamDetailsForModal(scrimData, modal);
}

async function loadTeamDetailsForModal(scrimData, modal) {
    try {
        // Get team details with members
        const { data: teamData, error: teamError } = await window.supabaseClient
            .from('teams')
            .select('*')
            .eq('id', scrimData.team_id)
            .single();

        if (teamError) {
            console.error('Error loading team:', teamError);
        }

        // Get team members
        const { data: membersData, error: membersError } = await window.supabaseClient
            .from('team_members')
            .select(`
                *,
                lol_accounts(summoner_name, rank, lp, tier, division)
            `)
            .eq('team_id', scrimData.team_id);

        if (membersError) {
            console.error('Error loading team members:', membersError);
        }

        console.log('👥 Team data:', teamData);
        console.log('👥 Members data:', membersData);

        const team = teamData || { name: 'Équipe inconnue' };
        const members = membersData || [];
        const isOwnScrim = scrimData.team_id === currentTeam?.id;

        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-handshake"></i>
                            ${isOwnScrim ? 'Votre Scrim' : `Scrim - ${team.name}`}
                        </h5>
                        <button type="button" class="btn-close" onclick="closeScrimModal()" style="background: none; border: none; font-size: 1.5rem; color: white;">×</button>
                    </div>
                    <div class="modal-body">
                        <!-- Scrim Details -->
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <div class="card bg-dark">
                                    <div class="card-header">
                                        <h6><i class="fas fa-info-circle"></i> Détails du Scrim</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="mb-2">
                                            <strong><i class="fas fa-calendar"></i> Date et heure:</strong><br>
                                            ${formatDate(scrimData.scrim_date)} à ${formatTime(scrimData.scrim_time)}
                                        </div>
                                        <div class="mb-2">
                                            <strong><i class="fas fa-hourglass-half"></i> Durée:</strong><br>
                                            ${scrimData.duration || 120} minutes
                                        </div>
                                        <div class="mb-2">
                                            <strong><i class="fas fa-gamepad"></i> Jeu:</strong><br>
                                            ${getGameName(scrimData.game || 'lol')}
                                        </div>
                                        <div class="mb-2">
                                            <strong><i class="fas fa-trophy"></i> Format:</strong><br>
                                            ${getFormatName(scrimData.format)}
                                        </div>
                                        <div class="mb-2">
                                            <strong><i class="fas fa-globe"></i> Région:</strong><br>
                                            ${scrimData.region || 'EUW'}
                                        </div>
                                        <div class="mb-2">
                                            <strong><i class="fas fa-medal"></i> Niveau recherché:</strong><br>
                                            ${scrimData.opponent_level || team.level || 'Non spécifié'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card bg-dark">
                                    <div class="card-header">
                                        <h6><i class="fas fa-users"></i> Équipe ${team.name}</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="mb-2">
                                            <strong><i class="fas fa-tag"></i> Nom:</strong><br>
                                            ${team.name}
                                        </div>
                                        <div class="mb-2">
                                            <strong><i class="fas fa-medal"></i> Niveau:</strong><br>
                                            ${team.level || 'Non spécifié'}
                                        </div>
                                        <div class="mb-2">
                                            <strong><i class="fas fa-users"></i> Membres:</strong><br>
                                            ${members.length} joueur(s)
                                        </div>
                                        ${team.description ? `
                                            <div class="mb-2">
                                                <strong><i class="fas fa-align-left"></i> Description:</strong><br>
                                                ${team.description}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Team Members -->
                        ${members.length > 0 ? `
                            <div class="card bg-dark mb-3">
                                <div class="card-header">
                                    <h6><i class="fas fa-users"></i> Composition de l'équipe</h6>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        ${members.map(member => `
                                            <div class="col-md-6 col-lg-4 mb-3">
                                                <div class="member-card p-3 border rounded">
                                                    <div class="d-flex align-items-center mb-2">
                                                        <i class="fas fa-user-circle me-2"></i>
                                                        <strong>${member.role || 'Joueur'}</strong>
                                                    </div>
                                                    ${member.lol_accounts && member.lol_accounts.length > 0 ? `
                                                        <div class="lol-account">
                                                            <div class="summoner-name">
                                                                <i class="fas fa-gamepad"></i>
                                                                ${member.lol_accounts[0].summoner_name}
                                                            </div>
                                                            ${member.lol_accounts[0].rank ? `
                                                                <div class="rank-info mt-1">
                                                                    <span class="badge bg-primary">
                                                                        ${member.lol_accounts[0].tier} ${member.lol_accounts[0].division}
                                                                    </span>
                                                                    <small class="text-muted ms-1">${member.lol_accounts[0].lp} LP</small>
                                                                </div>
                                                            ` : ''}
                                                            <div class="mt-2">
                                                                <a href="https://www.op.gg/summoners/euw/${member.lol_accounts[0].summoner_name}" 
                                                                   target="_blank" class="btn btn-sm btn-outline-primary">
                                                                    <i class="fas fa-external-link-alt"></i> OP.GG
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ` : `
                                                        <div class="text-muted">
                                                            <i class="fas fa-question-circle"></i>
                                                            Pas de compte lié
                                                        </div>
                                                    `}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Notes -->
                        ${scrimData.notes ? `
                            <div class="card bg-dark">
                                <div class="card-header">
                                    <h6><i class="fas fa-sticky-note"></i> Notes additionnelles</h6>
                                </div>
                                <div class="card-body">
                                    ${scrimData.notes}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeScrimModal()">
                            <i class="fas fa-times"></i>
                            Fermer
                        </button>
                        ${isOwnScrim ? `
                            <button type="button" class="btn btn-warning" onclick="editScrim('${scrimData.id}')">
                                <i class="fas fa-edit"></i>
                                Modifier
                            </button>
                            <button type="button" class="btn btn-danger" onclick="cancelScrim('${scrimData.id}')">
                                <i class="fas fa-ban"></i>
                                Annuler
                            </button>
                        ` : `
                            <button type="button" class="btn btn-success" onclick="requestScrim('${scrimData.id}')">
                                <i class="fas fa-handshake"></i>
                                Demander ce scrim
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error loading team details:', error);
        // Fallback to basic modal
        showBasicModal(scrimData, modal);
    }
}

function showBasicModal(scrimData, modal) {
    const team = { name: 'Équipe inconnue' };
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Détails du scrim</h5>
                    <button type="button" class="btn-close" onclick="closeScrimModal()">×</button>
                </div>
                <div class="modal-body">
                    <p>Détails du scrim pour ${formatDate(scrimData.scrim_date)} à ${formatTime(scrimData.scrim_time)}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeScrimModal()">Fermer</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeScrimModal() {
    const modal = document.getElementById('scrim-detail-modal');
    if (modal) {
        modal.remove();
    }
}

async function requestScrim(scrimId) {
    if (!currentTeam) {
        showNotification('Veuillez sélectionner une équipe', 'error');
        return;
    }
    
    try {
        // Get scrim details
        const scrim = searchResults.find(s => s.id === scrimId);
        if (!scrim) {
            showNotification('Scrim non trouvé', 'error');
            return;
        }
        
        // Check if user's team is different
        if (scrim.team_id === currentTeam.id) {
            showNotification('Vous ne pouvez pas demander votre propre scrim', 'error');
            return;
        }
        
        // Create scrim request
        const requestData = {
            scrim_id: scrimId,
            requesting_team_id: currentTeam.id,
            status: 'pending',
            message: `${currentTeam.name} souhaite jouer contre vous !`,
            created_at: new Date().toISOString()
        };
        
        const { data, error } = await window.supabaseClient
            .from('scrim_requests')
            .insert([requestData])
            .select()
            .single();
        
        if (error) {
            console.error('Error creating scrim request:', error);
            if (error.code === '23505') { // Unique constraint violation
                showNotification('Vous avez déjà envoyé une demande pour ce scrim', 'warning');
            } else {
                showNotification('Erreur lors de l\'envoi de la demande', 'error');
            }
            return;
        }
        
        showNotification('Demande envoyée avec succès !', 'success');
        closeScrimModal();
        
        // Optionally reload scrims to update status
        loadAvailableScrims();
        
    } catch (error) {
        console.error('Error requesting scrim:', error);
        showNotification('Erreur lors de l\'envoi de la demande', 'error');
    }
}

/**
 * UTILITY FUNCTIONS
 */
function getGameName(game) {
    const gameNames = {
        'lol': 'League of Legends',
        'valorant': 'VALORANT', 
        'rocket-league': 'Rocket League',
        'cs2': 'Counter-Strike 2'
    };
    return gameNames[game] || game;
}

function getFormatName(format) {
    const formatNames = {
        'bo1': 'Best of 1',
        'bo3': 'Best of 3', 
        'bo5': 'Best of 5',
        '5v5': '5 vs 5',
        '3v3': '3 vs 3',
        '2v2': '2 vs 2',
        '1v1': '1 vs 1'
    };
    return formatNames[format] || format;
}

function getStatusText(status) {
    const statusText = {
        'pending': 'En attente',
        'confirmed': 'Confirmé',
        'completed': 'Terminé',
        'cancelled': 'Annulé',
        'open': 'Ouvert'
    };
    return statusText[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return 'Date inconnue';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date invalide';
    
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short', 
        day: 'numeric'
    });
}

function formatTime(timeString) {
    if (!timeString) return 'Heure inconnue';
    return timeString.substring(0, 5); // Remove seconds
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function showNotification(message, type = 'info') {
    // Simple notification system
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    // Add CSS animation
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

async function editScrim(scrimId) {
    showNotification('Redirection vers la modification...', 'info');
    // Redirect to the propose page with edit mode
    window.location.href = `propose.html?edit=${scrimId}`;
}

async function cancelScrim(scrimId) {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce scrim ?')) {
        return;
    }
    
    try {
        const { error } = await window.supabaseClient
            .from('scrims')
            .update({ status: 'cancelled' })
            .eq('id', scrimId);
            
        if (error) {
            console.error('Error cancelling scrim:', error);
            showNotification('Erreur lors de l\'annulation du scrim', 'error');
            return;
        }
        
        showNotification('Scrim annulé avec succès', 'success');
        loadAvailableScrims(); // Refresh
        
    } catch (error) {
        console.error('Error cancelling scrim:', error);
        showNotification('Erreur lors de l\'annulation du scrim', 'error');
    }
}

// Export functions
window.ScrimSearch = {
    requestScrim,
    loadAvailableScrims,
    applyFilters,
    resetFilters,
    editScrim,
    cancelScrim
};

// Auto-initialize when the page loads
const initSearchOnPageLoad = () => {
    // Wait for Supabase to be ready
    const checkAndInit = async () => {
        if (window.supabaseClient) {
            console.log('🔍 Search page: Starting initialization...');
            await initializeSearch();
        } else {
            console.log('🔍 Search page: Waiting for Supabase...');
            setTimeout(checkAndInit, 100);
        }
    };
    checkAndInit();
};

// Try multiple ways to initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearchOnPageLoad);
} else {
    // DOM already loaded, initialize immediately
    console.log('🔍 Search page: DOM already ready, initializing...');
    initSearchOnPageLoad();
}
