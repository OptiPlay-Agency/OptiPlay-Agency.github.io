/**
 * TEAM MANAGEMENT
 * OptiPlay Scrim Finder
 */

// Get Supabase client from global scope
let teamSupabaseClient = null;

// Team management functionality
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Supabase client to be available
    const waitForSupabase = setInterval(() => {
        if (window.supabaseClient) {
            teamSupabaseClient = window.supabaseClient;
            clearInterval(waitForSupabase);
            setupTeamManagement();
        }
    }, 100);
});

function setupTeamManagement() {
    // Create team form submission
    const createTeamForm = document.getElementById('create-team-form');
    if (createTeamForm) {
        createTeamForm.addEventListener('submit', handleCreateTeam);
    }
    
    // Game selection change
    const gameSelect = document.getElementById('team-game');
    if (gameSelect) {
        gameSelect.addEventListener('change', onGameSelectionChange);
    }
}

async function handleCreateTeam(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const teamData = {
        name: formData.get('team-name'),
        game: formData.get('team-game'),
        level: formData.get('team-level'),
        region: formData.get('team-region'),
        created_by: currentUser?.id,
        members: [currentUser?.id],
        member_roles: {
            [currentUser?.id]: formData.get('team-role')
        }
    };
    
    // Validation
    if (!teamData.name || !teamData.game || !teamData.region) {
        showNotification('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }
    
    try {
        // Create team in database
        const { data: team, error } = await teamSupabaseClient
            .from('teams')
            .insert([teamData])
            .select()
            .single();
        
        if (error) {
            console.error('Error creating team:', error);
            showNotification('Erreur lors de la création de l\'équipe', 'error');
            return;
        }
        
        // Close modal and refresh teams
        closeCreateTeamModal();
        showNotification('Équipe créée avec succès!', 'success');
        
        // Reload teams and select the new one
        await window.loadUserTeamsFromTeamManager ? window.loadUserTeamsFromTeamManager() : console.log('Team reload function not available');
        currentTeam = team;
        updateTeamSelector(team.id);
        hideNoTeamState();
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error creating team:', error);
        showNotification('Erreur lors de la création de l\'équipe', 'error');
    }
}

function onGameSelectionChange() {
    const gameSelect = document.getElementById('team-game');
    const levelInput = document.getElementById('team-level');
    
    if (!gameSelect || !levelInput) return;
    
    const selectedGame = gameSelect.value;
    
    // Update level placeholder based on game
    const levelPlaceholders = {
        'lol': 'Ex: Bronze, Silver, Gold, Platine, Diamant...',
        'valorant': 'Ex: Iron, Bronze, Silver, Gold, Platine...',
        'rocket-league': 'Ex: Bronze, Silver, Gold, Platine, Diamant...'
    };
    
    levelInput.placeholder = levelPlaceholders[selectedGame] || 'Ex: Gold, Platine, Diamond...';
}

/**
 * Team invitation system
 */
async function generateTeamInvite(teamId) {
    try {
        // Generate unique invite code
        const inviteCode = generateInviteCode();
        
        const { data: invite, error } = await teamSupabaseClient
            .from('team_invites')
            .insert([{
                team_id: teamId,
                invite_code: inviteCode,
                created_by: currentUser.id,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
            }])
            .select()
            .single();
        
        if (error) {
            console.error('Error creating invite:', error);
            showNotification("Erreur lors de la génération de l'invitation", 'error');
            return;
        }
        
        // Copy invite link to clipboard
        const inviteLink = `${window.location.origin}/scrim-finder/join?code=${inviteCode}`;
        await navigator.clipboard.writeText(inviteLink);
        
        showNotification("Lien d'invitation copié dans le presse-papiers!", 'success');
        return inviteLink;
        
    } catch (error) {
        console.error('Error generating team invite:', error);
        showNotification('Erreur lors de la génération de l\'invitation', 'error');
    }
}

async function joinTeamWithCode(inviteCode) {
    try {
        // Get invite details
        const { data: invite, error: inviteError } = await teamSupabaseClient
            .from('team_invites')
            .select(`
                *,
                team:teams(*)
            `)
            .eq('invite_code', inviteCode)
            .eq('is_active', true)
            .gte('expires_at', new Date().toISOString())
            .single();
        
        if (inviteError || !invite) {
            showNotification('Invitation invalide ou expirée', 'error');
            return;
        }
        
        // Check if user is already a member
        if (invite.team.members.includes(currentUser.id)) {
            showNotification('Vous êtes déjà membre de cette équipe', 'info');
            return;
        }
        
        // Add user to team
        const updatedMembers = [...invite.team.members, currentUser.id];
        const updatedRoles = {
            ...invite.team.member_roles,
            [currentUser.id]: 'player'
        };
        
        const { error: updateError } = await teamSupabaseClient
            .from('teams')
            .update({
                members: updatedMembers,
                member_roles: updatedRoles
            })
            .eq('id', invite.team_id);
        
        if (updateError) {
            console.error('Error joining team:', updateError);
            showNotification('Erreur lors de l\'adhésion à l\'équipe', 'error');
            return;
        }
        
        // Deactivate invite
        await teamSupabaseClient
            .from('team_invites')
            .update({ is_active: false })
            .eq('id', invite.id);
        
        showNotification('Bienvenue dans l\'équipe ' + (invite.team.name || 'inconnue') + '!', 'success');
        
        // Reload teams
        await window.loadUserTeamsFromTeamManager ? window.loadUserTeamsFromTeamManager() : console.log('Team reload function not available');
        
    } catch (error) {
        console.error('Error joining team:', error);
        showNotification('Erreur lors de l\'adhésion à l\'équipe', 'error');
    }
}

function generateInviteCode() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

/**
 * Team management functions
 */
async function leaveTeam(teamId) {
    if (!confirm('Êtes-vous sûr de vouloir quitter cette équipe?')) {
        return;
    }
    
    try {
        const { data: team, error: fetchError } = await teamSupabaseClient
            .from('teams')
            .select('*')
            .eq('id', teamId)
            .single();
        
        if (fetchError) {
            console.error('Error fetching team:', fetchError);
            return;
        }
        
        // Remove user from members
        const updatedMembers = team.members.filter(id => id !== currentUser.id);
        const updatedRoles = { ...team.member_roles };
        delete updatedRoles[currentUser.id];
        
        // If user is the creator and there are other members, transfer ownership
        let updatedCreatedBy = team.created_by;
        if (team.created_by === currentUser.id && updatedMembers.length > 0) {
            updatedCreatedBy = updatedMembers[0];
        }
        
        const { error: updateError } = await teamSupabaseClient
            .from('teams')
            .update({
                members: updatedMembers,
                member_roles: updatedRoles,
                created_by: updatedCreatedBy
            })
            .eq('id', teamId);
        
        if (updateError) {
            console.error('Error leaving team:', updateError);
            showNotification('Erreur lors de la sortie de l\'équipe', 'error');
            return;
        }
        
        // If no members left, delete the team
        if (updatedMembers.length === 0) {
            await teamSupabaseClient
                .from('teams')
                .delete()
                .eq('id', teamId);
        }
        
        showNotification("Vous avez quitté l'équipe", 'success');
        
        // Reload teams
        await window.loadUserTeamsFromTeamManager ? window.loadUserTeamsFromTeamManager() : console.log('Team reload function not available');
        
    } catch (error) {
        console.error('Error leaving team:', error);
        showNotification("Erreur lors de la sortie de l'équipe", 'error');
    }
}

async function deleteTeam(teamId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette équipe? Cette action est irréversible.')) {
        return;
    }
    
    try {
        // Delete all related data
        await Promise.all([
            teamSupabaseClient.from('scrims').delete().eq('team_id', teamId),
            teamSupabaseClient.from('scrim_requests').delete().eq('requesting_team_id', teamId),
            teamSupabaseClient.from('team_invites').delete().eq('team_id', teamId)
        ]);
        
        // Delete team
        const { error } = await teamSupabaseClient
            .from('teams')
            .delete()
            .eq('id', teamId);
        
        if (error) {
            console.error('Error deleting team:', error);
            showNotification("Erreur lors de la suppression de l'équipe", 'error');
            return;
        }
        
        showNotification('Équipe supprimée avec succès', 'success');
        
        // Reload teams
        await window.loadUserTeamsFromTeamManager ? window.loadUserTeamsFromTeamManager() : console.log('Team reload function not available');
        
    } catch (error) {
        console.error('Error deleting team:', error);
        showNotification("Erreur lors de la suppression de l'équipe", 'error');
    }
}

async function updateTeamSettings(teamId, updates) {
    try {
        const { error } = await teamSupabaseClient
            .from('teams')
            .update(updates)
            .eq('id', teamId);
        
        if (error) {
            console.error('Error updating team:', error);
            showNotification("Erreur lors de la mise à jour de l'équipe", 'error');
            return;
        }
        
        showNotification('Équipe mise à jour avec succès', 'success');
        
        // Reload current team data
        if (currentTeam && currentTeam.id === teamId) {
            const { data: updatedTeam, error: fetchError } = await teamSupabaseClient
                .from('teams')
                .select('*')
                .eq('id', teamId)
                .single();
            
            if (!fetchError) {
                currentTeam = updatedTeam;
            }
        }
        
    } catch (error) {
        console.error('Error updating team:', error);
        showNotification('Erreur lors de la mise à jour de l\'équipe', 'error');
    }
}

// Handle join team from URL
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('code');
    
    if (inviteCode && currentUser) {
        joinTeamWithCode(inviteCode);
    }
});

// Export functions
window.TeamManagement = {
    generateTeamInvite,
    joinTeamWithCode,
    leaveTeam,
    deleteTeam,
    updateTeamSettings
};
