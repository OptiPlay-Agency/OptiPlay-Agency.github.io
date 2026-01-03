/**
 * MY SCRIMS PAGE
 * OptiPlay Scrim Finder
 */

document.addEventListener('DOMContentLoaded', function() {
    initMyScrimsPage();
});

function initMyScrimsPage() {
    // Wait for main initialization
    const checkInitialized = setInterval(() => {
        if (window.supabaseClient && currentUser && currentTeam) {
            clearInterval(checkInitialized);
            loadMyScrimsData();
        }
    }, 100);
}

async function loadMyScrimsData() {
    try {
        await Promise.all([
            loadMyProposedScrims(),
            loadMyCompletedScrims()
        ]);
    } catch (error) {
        console.error('Error loading my scrims data:', error);
    }
}

// Load scrims that I proposed (team_id = currentTeam.id with status pending)
async function loadMyProposedScrims() {
    if (!currentTeam) return;
    
    try {
        const { data: scrims, error } = await window.supabaseClient
            .from('scrims')
            .select('*')
            .eq('team_id', currentTeam.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error loading proposed scrims:', error);
            return;
        }
        
        displayProposedScrims(scrims || []);
        
    } catch (error) {
        console.error('Error loading proposed scrims:', error);
    }
}

// Load requests I received from other teams (requesting_team_id != currentTeam.id AND scrim.team_id = currentTeam.id)
async function loadMyReceivedRequests() {
    if (!currentTeam) return;
    
    try {
        const { data: requests, error } = await window.supabaseClient
            .from('scrim_requests')
            .select(`
                *,
                scrim:scrims(*),
                requesting_team:teams!scrim_requests_requesting_team_id_fkey(name)
            `)
            .neq('requesting_team_id', currentTeam.id) // Pas mes propres demandes
            .eq('scrim.team_id', currentTeam.id) // Mais des scrims de mon équipe
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error loading received requests:', error);
            return;
        }
        
        displayReceivedRequests(requests || []);
        
    } catch (error) {
        console.error('Error loading received requests:', error);
    }
}

// Load completed scrims
async function loadMyCompletedScrims() {
    if (!currentTeam) return;
    
    try {
        const { data: scrims, error } = await window.supabaseClient
            .from('scrims')
            .select('*')
            .eq('team_id', currentTeam.id)
            .neq('final_score', '0-0') // Scrims avec un score réel
            .order('scrim_date', { ascending: false })
            .limit(10);
        
        if (error) {
            console.error('Error loading completed scrims:', error);
            return;
        }
        
        displayCompletedScrims(scrims || []);
        
    } catch (error) {
        console.error('Error loading completed scrims:', error);
    }
}

function displayProposedScrims(scrims) {
    const container = document.getElementById('proposed-scrims');
    if (!container) return;
    
    if (scrims.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-plus-circle"></i>
                <h3>Aucun scrim proposé</h3>
                <p>Vous n'avez pas encore proposé de scrims</p>
                <a href="propose.html" class="btn btn-primary">
                    <i class="fas fa-plus"></i>
                    Proposer un scrim
                </a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = scrims.map(scrim => {
        return `
            <div class="scrim-card proposed">
                <div class="scrim-header">
                    <h4>${scrim.title}</h4>
                    <span class="status-badge pending">En attente</span>
                </div>
                <div class="scrim-details">
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>${formatDate(scrim.scrim_date)} à ${scrim.scrim_time}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-gamepad"></i>
                        <span>${scrim.format?.toUpperCase() || 'Format non spécifié'}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-users"></i>
                        <span>${scrim.opponent_name}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-sticky-note"></i>
                        <span>${scrim.notes ? truncateText(scrim.notes, 50) : 'Aucune note'}</span>
                    </div>
                </div>
                <div class="scrim-actions">
                    <button class="btn btn-secondary" onclick="editScrim('${scrim.id}')">
                        <i class="fas fa-edit"></i>
                        Modifier
                    </button>
                    <button class="btn btn-success" onclick="markScrimCompleted('${scrim.id}')">
                        <i class="fas fa-check"></i>
                        Marquer terminé
                    </button>
                    <button class="btn btn-danger" onclick="cancelScrim('${scrim.id}')">
                        <i class="fas fa-times"></i>
                        Annuler
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function displayReceivedRequests(requests) {
    const container = document.getElementById('received-requests');
    if (!container) return;
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Aucune demande reçue</h3>
                <p>Vous n'avez pas encore reçu de demandes de scrim</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = requests.map(request => {
        const scrim = request.scrim;
        return `
            <div class="scrim-card received">
                <div class="scrim-header">
                    <h4>${scrim.title}</h4>
                    <span class="requesting-team">${request.requesting_team?.name || 'Équipe inconnue'}</span>
                </div>
                <div class="scrim-details">
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>${formatDate(scrim.scrim_date)} à ${scrim.scrim_time}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-gamepad"></i>
                        <span>${scrim.format.toUpperCase()}</span>
                    </div>
                    ${request.message ? `
                    <div class="detail-item">
                        <i class="fas fa-comment"></i>
                        <span>${request.message}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="scrim-actions">
                    <button class="btn btn-success" onclick="acceptScrimRequest('${request.id}')">
                        <i class="fas fa-check"></i>
                        Accepter
                    </button>
                    <button class="btn btn-danger" onclick="rejectScrimRequest('${request.id}')">
                        <i class="fas fa-times"></i>
                        Refuser
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function displayCompletedScrims(scrims) {
    const container = document.getElementById('completed-scrims');
    if (!container) return;
    
    if (scrims.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-trophy"></i>
                <h3>Aucun scrim terminé</h3>
                <p>Vous n'avez pas encore terminé de scrims</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = scrims.map(scrim => {
        const isWin = scrim.final_score && scrim.final_score.split('-')[0] > scrim.final_score.split('-')[1];
        return `
            <div class="scrim-card completed ${isWin ? 'win' : 'loss'}">
                <div class="scrim-header">
                    <h4>${scrim.title}</h4>
                    <span class="score ${isWin ? 'win' : 'loss'}">${scrim.final_score}</span>
                </div>
                <div class="scrim-details">
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>${formatDate(scrim.scrim_date)} à ${scrim.scrim_time}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-users"></i>
                        <span>vs ${scrim.opponent_name}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-gamepad"></i>
                        <span>${scrim.format.toUpperCase()}</span>
                    </div>
                </div>
                <div class="scrim-actions">
                    <button class="btn btn-secondary" onclick="viewScrimDetails('${scrim.id}')">
                        <i class="fas fa-eye"></i>
                        Voir détails
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Helper functions
function formatDate(dateString) {
    if (!dateString) return 'Date non spécifiée';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
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

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

async function markScrimCompleted(scrimId) {
    if (!confirm('Marquer ce scrim comme terminé ? Vous pourrez ensuite saisir les résultats.')) {
        return;
    }
    
    try {
        // Update scrim status to completed
        const { error } = await window.supabaseClient
            .from('scrims')
            .update({ 
                status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('id', scrimId);
        
        if (error) {
            console.error('Error marking scrim as completed:', error);
            showNotification('Erreur lors de la mise à jour', 'error');
            return;
        }
        
        showNotification('Scrim marqué comme terminé ! Vous pouvez maintenant saisir les résultats dans le Team Manager.', 'success');
        loadMyScrimsData();
        
    } catch (error) {
        console.error('Error marking scrim as completed:', error);
        showNotification('Erreur lors de la mise à jour', 'error');
    }
}

async function cancelScrim(scrimId) {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce scrim ?')) {
        return;
    }
    
    try {
        // Update scrim status to cancelled
        const { error } = await window.supabaseClient
            .from('scrims')
            .update({ 
                status: 'cancelled',
                updated_at: new Date().toISOString()
            })
            .eq('id', scrimId);
        
        if (error) {
            console.error('Error cancelling scrim:', error);
            showNotification('Erreur lors de l\'annulation', 'error');
            return;
        }
        
        showNotification('Scrim annulé avec succès', 'success');
        loadMyScrimsData();
        
    } catch (error) {
        console.error('Error cancelling scrim:', error);
        showNotification('Erreur lors de l\'annulation', 'error');
    }
}

async function editScrim(scrimId) {
    // Redirect to edit page
    window.location.href = `propose.html?edit=${scrimId}`;
}

// Action functions
async function editScrimRequest(requestId) {
    // For now, redirect to propose page - could be enhanced to edit
    window.location.href = 'propose.html';
}

async function cancelScrimRequest(requestId) {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette proposition de scrim ?')) {
        return;
    }
    
    try {
        // Update scrim request status to rejected
        const { error } = await window.supabaseClient
            .from('scrim_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId);
        
        if (error) {
            console.error('Error cancelling scrim request:', error);
            showNotification('Erreur lors de l\'annulation', 'error');
            return;
        }
        
        showNotification('Proposition de scrim annulée avec succès', 'success');
        loadMyScrimsData();
        
    } catch (error) {
        console.error('Error cancelling scrim request:', error);
        showNotification('Erreur lors de l\'annulation', 'error');
    }
}

async function acceptScrimRequest(requestId) {
    try {
        // Accept the request
        const { error } = await window.supabaseClient
            .from('scrim_requests')
            .update({ status: 'accepted' })
            .eq('id', requestId);
        
        if (error) {
            console.error('Error accepting request:', error);
            showNotification('Erreur lors de l\'acceptation', 'error');
            return;
        }
        
        showNotification('Demande acceptée avec succès', 'success');
        loadMyScrimsData();
        
    } catch (error) {
        console.error('Error accepting request:', error);
        showNotification('Erreur lors de l\'acceptation', 'error');
    }
}

async function rejectScrimRequest(requestId) {
    try {
        // Reject the request
        const { error } = await window.supabaseClient
            .from('scrim_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId);
        
        if (error) {
            console.error('Error rejecting request:', error);
            showNotification('Erreur lors du refus', 'error');
            return;
        }
        
        showNotification('Demande refusée', 'success');
        loadMyScrimsData();
        
    } catch (error) {
        console.error('Error rejecting request:', error);
        showNotification('Erreur lors du refus', 'error');
    }
}

async function viewScrimDetails(scrimId) {
    // Implement scrim details view
    console.log('View scrim details:', scrimId);
}