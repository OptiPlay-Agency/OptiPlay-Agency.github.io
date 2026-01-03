/**
 * PROPOSE SCRIM FUNCTIONALITY
 * OptiPlay Scrim Finder
 */

let scrimData = {};
let isDraft = false;

document.addEventListener('DOMContentLoaded', function() {
    setupProposeForm();
    loadDraftIfExists();
});

function setupProposeForm() {
    const proposeForm = document.getElementById('propose-scrim-form');
    if (proposeForm) {
        proposeForm.addEventListener('submit', handleProposeScrim);
    }
    

    
    // Recurring checkbox handler
    const recurringCheckbox = document.getElementById('is-recurring');
    if (recurringCheckbox) {
        recurringCheckbox.addEventListener('change', onRecurringChange);
    }
    
    // Save draft button
    const saveDraftBtn = document.getElementById('save-draft');
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', saveDraft);
    }
    
    // Set minimum date to today
    const dateInput = document.getElementById('scrim-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        
        // Default to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.value = tomorrow.toISOString().split('T')[0];
    }
    
    // Set default time to next hour
    const timeInput = document.getElementById('scrim-time');
    if (timeInput) {
        const now = new Date();
        now.setHours(now.getHours() + 1);
        now.setMinutes(0);
        timeInput.value = now.toTimeString().substring(0, 5);
    }
    
    // Auto-save form data
    setupAutoSave();
}



function onRecurringChange() {
    const recurringCheckbox = document.getElementById('is-recurring');
    const recurringOptions = document.getElementById('recurring-options');
    
    if (recurringCheckbox.checked) {
        recurringOptions.style.display = 'block';
    } else {
        recurringOptions.style.display = 'none';
    }
}

function setupAutoSave() {
    // Auto-save every 30 seconds
    setInterval(() => {
        if (!isDraft) {
            autoSaveDraft();
        }
    }, 30000);
    
    // Save on form input changes
    const formInputs = document.querySelectorAll('#propose-scrim-form input, #propose-scrim-form select, #propose-scrim-form textarea');
    formInputs.forEach(input => {
        input.addEventListener('change', () => {
            setTimeout(autoSaveDraft, 1000); // Debounce
        });
    });
}

async function handleProposeScrim(event) {
    event.preventDefault();
    
    if (!currentTeam) {
        showNotification('Vous devez sélectionner une équipe', 'error');
        return;
    }
    
    const formData = new FormData(event.target);
    const scrimData = collectFormData(formData);
    
    // Validation
    if (!validateScrimData(scrimData)) {
        return;
    }
    
    try {
        if (scrimData.isRecurring) {
            await createRecurringScrim(scrimData);
        } else {
            await createSingleScrim(scrimData);
        }
        
        // Clear draft
        clearDraft();
        
        // Redirect to my scrims
        showNotification('Scrim créé avec succès!', 'success');
        setTimeout(() => {
            window.location.href = 'my-scrims.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error creating scrim:', error);
        showNotification('Erreur lors de la création du scrim', 'error');
    }
}

function collectFormData(formData) {
    const data = {
        date: formData.get('scrim-date'),
        time: formData.get('scrim-time'),
        format: formData.get('scrim-format'),
        region: formData.get('scrim-region'),
        opponentLevel: formData.get('opponent-level'),
        description: formData.get('scrim-description'),
        allowLowerLevel: formData.has('allow-lower-level'),
        allowHigherLevel: formData.has('allow-higher-level'),
        isRecurring: formData.has('is-recurring'),
        recurringDays: [],
        recurringEnd: formData.get('recurring-end')
    };
    
    // Get recurring days
    if (data.isRecurring) {
        const recurringDays = formData.getAll('recurring-days');
        data.recurringDays = recurringDays.map(day => parseInt(day));
    }
    
    return data;
}

function validateScrimData(data) {
    // Required fields
    if (!data.date || !data.time || !data.format || !data.region) {
        showNotification('Veuillez remplir tous les champs obligatoires', 'error');
        return false;
    }
    
    // Date validation - must be at least today
    const scrimDate = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (scrimDate < today) {
        showNotification('La date du scrim ne peut pas être dans le passé', 'error');
        return false;
    }
    
    // Time validation - if today, must be in the future
    if (data.date === new Date().toISOString().split('T')[0]) {
        const scrimTime = new Date(`${data.date}T${data.time}`);
        const now = new Date();
        
        if (scrimTime <= now) {
            showNotification("L'heure du scrim doit être dans le futur", 'error');
            return false;
        }
    }
    
    // Duration validation
    if (data.duration < 15 || data.duration > 480) {
        showNotification('La durée doit être entre 15 minutes et 8 heures', 'error');
        return false;
    }
    
    // Recurring validation
    if (data.isRecurring) {
        if (data.recurringDays.length === 0) {
            showNotification('Veuillez sélectionner au moins un jour pour la récurrence', 'error');
            return false;
        }
        
        if (data.recurringEnd) {
            const endDate = new Date(data.recurringEnd);
            if (endDate <= scrimDate) {
                showNotification('La date de fin de récurrence doit être après la date de début', 'error');
                return false;
            }
        }
    }
    
    return true;
}

async function createSingleScrim(data) {
    try {
        // 1. Create the scrim with status "pending"
        const scrimData = {
            team_id: currentTeam.id,
            game: currentTeam.game || 'lol',
            title: `Scrim ${data.format.toUpperCase()} - ${currentTeam.name}`,
            opponent_name: data.opponentName || `Recherche adversaire ${data.opponentLevel || 'tous niveaux'}`,
            scrim_date: data.date,
            scrim_time: data.time,
            format: data.format,
            final_score: '0-0', // Score par défaut pour un scrim non joué
            matches: [],
            notes: `Région: ${data.region}${data.opponentLevel ? `\nNiveau recherché: ${data.opponentLevel}` : ''}${data.description ? `\n\n${data.description}` : ''}`,
            status: 'pending', // Important: status pending au lieu de completed
            created_by: currentUser.id
        };
        
        const { data: newScrim, error: scrimError } = await window.supabaseClient
            .from('scrims')
            .insert([scrimData])
            .select()
            .single();
        
        if (scrimError) {
            console.error('Error creating scrim:', scrimError);
            throw scrimError;
        }
        
        // 2. Create simplified scrim request entry (only essential fields)
        const scrimRequestData = {
            scrim_id: newScrim.id,
            requesting_team_id: currentTeam.id,
            status: 'pending',
            message: data.description || `Scrim ${data.format.toUpperCase()} proposé par ${currentTeam.name}`,
            created_by: currentUser.id
        };
        
        const { error: requestError } = await window.supabaseClient
            .from('scrim_requests')
            .insert([scrimRequestData]);
            
        if (requestError) {
            console.warn('Error creating scrim request:', requestError);
            // Don't throw, the scrim was created successfully
        }
        
        // 3. Create event in Team Manager planning (optionnel)
        await createTeamManagerEvent(newScrim, data);
        
        return newScrim;
        
    } catch (error) {
        console.error('Error creating scrim:', error);
        throw error;
    }
}

async function createTeamManagerEvent(scrim, formData) {
    try {
        const eventTitle = `🎮 Scrim Proposé: ${formData.format.toUpperCase()}`;
        const eventDescription = `Scrim ${formData.format.toUpperCase()} recherché
• Niveau: ${formData.opponentLevel || 'Tous niveaux'}
• Région: ${formData.region.toUpperCase()}
• Status: Recherche d'adversaire

${formData.description ? `Description: ${formData.description}` : ''}

ID Scrim: ${scrim.id}`;
        
        const startDateTime = new Date(`${formData.date}T${formData.time}`);
        const endDateTime = new Date(startDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + parseInt(formData.duration));
        
        const eventData = {
            team_id: currentTeam.id,
            title: eventTitle,
            event_type: 'scrim',
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            location: `Online (${formData.region.toUpperCase()})`,
            description: eventDescription,
            created_by: currentUser.id
        };
        
        const { data: event, error: eventError } = await window.supabaseClient
            .from('events')
            .insert([eventData])
            .select()
            .single();
        
        if (eventError) throw eventError;
        
        // Link the event to the scrim
        await window.supabaseClient
            .from('scrims')
            .update({ event_id: event.id })
            .eq('id', scrim.id);
        
        console.log('Event created in Team Manager planning:', event.id);
        
    } catch (error) {
        console.error('Error creating Team Manager event:', error);
        // Don't throw here - scrim creation should succeed even if event creation fails
    }
}

async function createRecurringScrim(data) {
    try {
        const scrims = [];
        const startDate = new Date(data.date);
        const endDate = data.recurringEnd ? new Date(data.recurringEnd) : null;
        const recurringGroupId = generateRecurringGroupId();
        
        // Generate scrims for the next 12 weeks or until end date
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + (12 * 7)); // 12 weeks
        const actualEndDate = endDate && endDate < maxDate ? endDate : maxDate;
        
        // Start from the selected date
        let currentDate = new Date(startDate);
        
        while (currentDate <= actualEndDate) {
            const dayOfWeek = currentDate.getDay();
            
            if (data.recurringDays.includes(dayOfWeek)) {
                const scrimData = {
                    team_id: currentTeam.id,
                    scrim_date: currentDate.toISOString().split('T')[0],
                    scrim_time: data.time,
                    duration: parseInt(data.duration),
                    format: data.format,
                    region: data.region,
                    opponent_level: data.opponentLevel || null,
                    description: data.description || null,
                    allow_lower_level: data.allowLowerLevel,
                    allow_higher_level: data.allowHigherLevel,
                    status: 'open',
                    game: currentTeam.game || 'lol',
                    title: `Scrim ${data.format.toUpperCase()} - ${currentTeam.name}`,
                    created_by: currentUser.id,
                    is_recurring: true,
                    recurring_group_id: recurringGroupId
                };
                
                scrims.push(scrimData);
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        if (scrims.length === 0) {
            throw new Error('Aucun scrim généré pour la récurrence sélectionnée');
        }
        
        // Create all scrims
        const { data: createdScrims, error: scrimError } = await window.supabaseClient
            .from('scrims')
            .insert(scrims)
            .select();
        
        if (scrimError) throw scrimError;
        
        // Create events in Team Manager planning for each scrim
        for (const scrim of createdScrims) {
            const scrimDate = scrim.scrim_date;
            const scrimTime = scrim.scrim_time;
            
            await createTeamManagerEvent(scrim, {
                ...data,
                date: scrimDate,
                time: scrimTime
            });
        }
        
        showNotification(`${createdScrims.length} scrims récurrents créés et ajoutés au planning`, 'success');
        
    } catch (error) {
        console.error('Error creating recurring scrims:', error);
        throw error;
    }
}

function generateRecurringGroupId() {
    return 'recurring_' + Date.now() + '_' + Math.random().toString(36).substring(7);
}

async function saveDraft() {
    const formData = new FormData(document.getElementById('propose-scrim-form'));
    const data = collectFormData(formData);
    
    // Save to localStorage
    localStorage.setItem('scrim_draft', JSON.stringify({
        ...data,
        teamId: currentTeam?.id,
        savedAt: new Date().toISOString()
    }));
    
    isDraft = true;
    showNotification('Brouillon sauvegardé', 'info');
    
    setTimeout(() => {
        isDraft = false;
    }, 2000);
}

function autoSaveDraft() {
    if (document.hidden) return; // Don't save if tab is not active
    
    const formData = new FormData(document.getElementById('propose-scrim-form'));
    const data = collectFormData(formData);
    
    // Only save if there's meaningful data
    if (data.date || data.time || data.description) {
        localStorage.setItem('scrim_auto_draft', JSON.stringify({
            ...data,
            teamId: currentTeam?.id,
            savedAt: new Date().toISOString()
        }));
    }
}

function loadDraftIfExists() {
    // Check for manual draft first
    let draft = localStorage.getItem('scrim_draft');
    if (!draft) {
        // Check for auto-saved draft
        draft = localStorage.getItem('scrim_auto_draft');
    }
    
    if (draft && currentTeam) {
        try {
            const draftData = JSON.parse(draft);
            
            // Only load if draft is for current team and less than 7 days old
            if (draftData.teamId === currentTeam.id) {
                const savedAt = new Date(draftData.savedAt);
                const now = new Date();
                const daysDiff = (now - savedAt) / (1000 * 60 * 60 * 24);
                
                if (daysDiff < 7) {
                    if (confirm('Un brouillon de scrim a été trouvé. Voulez-vous le charger?')) {
                        populateFormWithDraft(draftData);
                    }
                } else {
                    // Clear old draft
                    clearDraft();
                }
            }
        } catch (error) {
            console.error('Error loading draft:', error);
        }
    }
}

function populateFormWithDraft(data) {
    // Populate form fields
    const fields = [
        { id: 'scrim-date', value: data.date },
        { id: 'scrim-time', value: data.time },
        { id: 'scrim-duration', value: data.duration },
        { id: 'scrim-format', value: data.format },
        { id: 'scrim-region', value: data.region },
        { id: 'opponent-level', value: data.opponentLevel },
        { id: 'scrim-description', value: data.description }
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element && field.value) {
            element.value = field.value;
        }
    });
    
    // Populate checkboxes
    const checkboxes = [
        { id: 'allow-lower-level', value: data.allowLowerLevel },
        { id: 'allow-higher-level', value: data.allowHigherLevel },
        { id: 'is-recurring', value: data.isRecurring }
    ];
    
    checkboxes.forEach(checkbox => {
        const element = document.getElementById(checkbox.id);
        if (element) {
            element.checked = checkbox.value || false;
        }
    });
    
    // Trigger change events to update UI
    document.getElementById('scrim-duration')?.dispatchEvent(new Event('change'));
    document.getElementById('is-recurring')?.dispatchEvent(new Event('change'));
    
    // Populate recurring options
    if (data.isRecurring && data.recurringDays) {
        data.recurringDays.forEach(day => {
            const checkbox = document.querySelector(`input[name="recurring-days"][value="${day}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
        
        const recurringEnd = document.getElementById('recurring-end');
        if (recurringEnd && data.recurringEnd) {
            recurringEnd.value = data.recurringEnd;
        }
    }
    
    showNotification('Brouillon chargé', 'info');
}

function clearDraft() {
    localStorage.removeItem('scrim_draft');
    localStorage.removeItem('scrim_auto_draft');
}

// Export functions
window.ScrimPropose = {
    saveDraft,
    clearDraft,
    loadDraftIfExists
};
