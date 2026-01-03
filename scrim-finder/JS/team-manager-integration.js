/**
 * TEAM MANAGER INTEGRATION
 * Functions to integrate Scrim Finder with Team Manager
 */

/**
 * Accept a scrim request and integrate with Team Manager
 */
async function acceptScrimRequest(requestId) {
    try {
        // 1. Get the request details
        const { data: request, error: requestError } = await window.supabaseClient
            .from('scrim_requests')
            .select(`
                *,
                scrims(*),
                requesting_team:teams!scrim_requests_requesting_team_id_fkey(*)
            `)
            .eq('id', requestId)
            .single();

        if (requestError || !request) {
            throw new Error('Demande introuvable');
        }

        // 2. Update scrim status to confirmed
        const { error: scrimUpdateError } = await window.supabaseClient
            .from('scrims')
            .update({ 
                status: 'confirmed',
                opponent_name: request.requesting_team.name
            })
            .eq('id', request.scrim_id);

        if (scrimUpdateError) throw scrimUpdateError;

        // 3. Update request status to accepted
        const { error: requestUpdateError } = await window.supabaseClient
            .from('scrim_requests')
            .update({ status: 'accepted' })
            .eq('id', requestId);

        if (requestUpdateError) throw requestUpdateError;

        // 4. Update the Team Manager event
        await updateTeamManagerEventForConfirmedScrim(request.scrims, request.requesting_team);

        // 5. Create event for the requesting team in their Team Manager
        await createEventForRequestingTeam(request.scrims, request.requesting_team);

        showNotification('Scrim accepté et planifié avec succès!', 'success');
        
        return true;

    } catch (error) {
        console.error('Error accepting scrim request:', error);
        showNotification('Erreur lors de l\'acceptation: ' + error.message, 'error');
        return false;
    }
}

/**
 * Update the existing Team Manager event when scrim is confirmed
 */
async function updateTeamManagerEventForConfirmedScrim(scrim, opponentTeam) {
    try {
        if (!scrim.event_id) return; // No event to update

        const eventTitle = `🏆 Scrim Confirmé vs ${opponentTeam.name}`;
        const eventDescription = `Scrim ${scrim.format.toUpperCase()} confirmé !

🆚 Adversaire: ${opponentTeam.name}
⭐ Niveau: ${opponentTeam.level || 'Non spécifié'}
🌍 Région: ${scrim.region.toUpperCase()}
⏱️ Durée: ${scrim.duration} min

Status: ✅ CONFIRMÉ - Prêt à jouer !

ID Scrim: ${scrim.id}`;

        await window.supabaseClient
            .from('events')
            .update({
                title: eventTitle,
                description: eventDescription,
                location: `Online vs ${opponentTeam.name} (${scrim.region.toUpperCase()})`
            })
            .eq('id', scrim.event_id);

    } catch (error) {
        console.error('Error updating Team Manager event:', error);
    }
}

/**
 * Create an event for the requesting team in their Team Manager
 */
async function createEventForRequestingTeam(scrim, requestingTeam) {
    try {
        const eventTitle = `🏆 Scrim Confirmé vs ${scrim.teams?.name || 'Équipe Hôte'}`;
        const eventDescription = `Scrim ${scrim.format.toUpperCase()} accepté !

🆚 Adversaire: ${scrim.teams?.name || 'Équipe Hôte'}
⭐ Niveau: ${scrim.opponent_level || 'Non spécifié'}
🌍 Région: ${scrim.region.toUpperCase()}
⏱️ Durée: ${scrim.duration} min

Status: ✅ CONFIRMÉ - Prêt à jouer !

ID Scrim: ${scrim.id}`;

        const startDateTime = new Date(`${scrim.scrim_date}T${scrim.scrim_time}`);
        const endDateTime = new Date(startDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + scrim.duration);

        const { data: event, error } = await window.supabaseClient
            .from('events')
            .insert([{
                team_id: requestingTeam.id,
                title: eventTitle,
                event_type: 'scrim',
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                location: `Online vs ${scrim.teams?.name} (${scrim.region.toUpperCase()})`,
                description: eventDescription,
                created_by: requestingTeam.created_by
            }])
            .select()
            .single();

        if (error) throw error;

        console.log('Event created for requesting team:', event.id);

    } catch (error) {
        console.error('Error creating event for requesting team:', error);
        // Don't throw - event creation failing shouldn't block the acceptance
    }
}

/**
 * Reject a scrim request
 */
async function rejectScrimRequest(requestId) {
    try {
        const { error } = await window.supabaseClient
            .from('scrim_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId);

        if (error) throw error;

        showNotification('Demande rejetée', 'info');
        return true;

    } catch (error) {
        console.error('Error rejecting scrim request:', error);
        showNotification('Erreur lors du rejet', 'error');
        return false;
    }
}

/**
 * Complete a scrim and transition to Team Manager results
 */
async function completeScrim(scrimId, finalScore, matches) {
    try {
        // Update scrim with results (Team Manager format)
        const { error: updateError } = await window.supabaseClient
            .from('scrims')
            .update({
                status: 'completed',
                final_score: finalScore,
                matches: matches
            })
            .eq('id', scrimId);

        if (updateError) throw updateError;

        // Update associated event if exists
        const { data: scrim } = await window.supabaseClient
            .from('scrims')
            .select('event_id, title, opponent_name')
            .eq('id', scrimId)
            .single();

        if (scrim?.event_id) {
            await window.supabaseClient
                .from('events')
                .update({
                    title: `✅ ${scrim.title} - Terminé (${finalScore})`,
                    description: `Scrim terminé avec le score : ${finalScore}

${scrim.opponent_name ? `Adversaire: ${scrim.opponent_name}` : ''}

Résultats enregistrés dans le Team Manager.`
                })
                .eq('id', scrim.event_id);
        }

        showNotification('Scrim terminé et résultats enregistrés!', 'success');
        return true;

    } catch (error) {
        console.error('Error completing scrim:', error);
        showNotification('Erreur lors de l\'enregistrement', 'error');
        return false;
    }
}

/**
 * Load pending requests for current team
 */
async function loadPendingRequests() {
    try {
        if (!currentTeam) return [];

        const { data: requests, error } = await window.supabaseClient
            .from('scrim_requests_with_teams')
            .select('*')
            .eq('host_team_id', currentTeam.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return requests || [];

    } catch (error) {
        console.error('Error loading pending requests:', error);
        return [];
    }
}

// Export functions
window.TeamManagerIntegration = {
    acceptScrimRequest,
    rejectScrimRequest,
    completeScrim,
    loadPendingRequests
};
