// =====================================================
// SCRIM MANAGER
// Gestion des résultats de scrims
// =====================================================

const ScrimManager = {
  scrims: [],
  currentGame: null,

  // Initialize
  init() {
    console.log('🎮 Initializing Scrim Manager...');
    this.setupEventListeners();
  },

  // Setup event listeners
  setupEventListeners() {
    // Add scrim button
    const addBtn = document.getElementById('add-scrim-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showScrimModal());
    }

    // Form submission
    const form = document.getElementById('scrim-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveScrim();
      });
    }

    // Format change
    const formatSelect = document.getElementById('scrim-format');
    if (formatSelect) {
      formatSelect.addEventListener('change', (e) => this.updateMatchInputs(e.target.value));
    }
  },

  // Load scrims for team
  async loadScrims(teamId) {
    try {
      const supabase = window.supabaseClient || AppState.supabase;
      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }

      const { data, error } = await supabase
        .from('scrims')
        .select('*')
        .eq('team_id', teamId)
        .order('scrim_date', { ascending: false });

      if (error) throw error;

      this.scrims = data || [];
      this.renderScrims();
    } catch (error) {
      console.error('Error loading scrims:', error);
      showToast('Erreur lors du chargement des scrims', 'error');
    }
  },

  // Render scrims list
  renderScrims() {
    const container = document.getElementById('scrims-container');
    if (!container) return;

    if (this.scrims.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-trophy"></i>
          <h3>Aucun scrim enregistré</h3>
          <p>Ajoutez vos premiers résultats de scrim pour suivre vos performances</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="scrims-grid">
        ${this.scrims.map(scrim => this.renderScrimCard(scrim)).join('')}
      </div>
    `;
  },

  // Render single scrim card
  renderScrimCard(scrim) {
    const isWin = this.calculateIsWin(scrim.final_score);
    const resultClass = isWin ? 'win' : 'loss';
    const resultIcon = isWin ? '🏆' : '😔';
    const resultText = isWin ? 'Victoire' : 'Défaite';

    const date = new Date(scrim.scrim_date);
    const formattedDate = date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    const time = scrim.scrim_time ? scrim.scrim_time.substring(0, 5) : '';

    return `
      <div class="scrim-card ${resultClass}" data-scrim-id="${scrim.id}">
        <div class="scrim-header">
          <div class="scrim-result-badge ${resultClass}">
            ${resultIcon} ${resultText}
          </div>
          <div class="scrim-actions">
            <button class="btn-icon" onclick="ScrimManager.editScrim('${scrim.id}')" title="Modifier">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon" onclick="ScrimManager.deleteScrim('${scrim.id}')" title="Supprimer">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        ${scrim.title ? `<h2 class="scrim-title">${scrim.title}</h2>` : ''}
        
        <div class="scrim-info">
          <h3 class="scrim-opponent">
            <i class="fas fa-shield-alt"></i>
            ${scrim.opponent_name}
          </h3>
          <div class="scrim-meta">
            <span class="scrim-date">
              <i class="fas fa-calendar"></i>
              ${formattedDate} ${time ? `à ${time}` : ''}
            </span>
            <span class="scrim-format">
              <i class="fas fa-list-ol"></i>
              ${scrim.format}
            </span>
          </div>
        </div>

        <div class="scrim-score">
          <div class="score-display">
            <span class="final-score">${scrim.final_score}</span>
          </div>
        </div>

        <div class="scrim-matches">
          ${this.renderMatches(scrim.matches, scrim.game)}
        </div>

        ${scrim.notes ? `
          <div class="scrim-notes">
            <i class="fas fa-sticky-note"></i>
            <p>${scrim.notes}</p>
          </div>
        ` : ''}
      </div>
    `;
  },

  // Render matches details
  renderMatches(matches, game) {
    if (!matches || matches.length === 0) return '';

    return `
      <div class="matches-list">
        <h4><i class="fas fa-gamepad"></i> Détails des matchs</h4>
        ${matches.map((match, index) => this.renderMatchDetail(match, index + 1, game)).join('')}
      </div>
    `;
  },

  // Render single match detail
  renderMatchDetail(match, matchNumber, game) {
    const isWin = match.team_score > match.opponent_score;
    const resultClass = isWin ? 'match-win' : 'match-loss';
    const gameType = game?.toLowerCase();

    // Game-specific details
    let extraInfo = '';
    if ((gameType === 'league-of-legends' || gameType === 'lol') && match.duration) {
      extraInfo = `<span class="match-duration"><i class="fas fa-clock"></i> ${match.duration}</span>`;
      if (match.side) {
        extraInfo += ` <span class="match-side side-${match.side}"><i class="fas fa-circle"></i> ${match.side === 'blue' ? 'Bleu' : 'Rouge'}</span>`;
      }
    } else if ((gameType === 'rocket-league' || gameType === 'rl' || gameType === 'valorant') && match.map) {
      extraInfo = `<span class="match-map"><i class="fas fa-map"></i> ${match.map}</span>`;
    }

    return `
      <div class="match-detail ${resultClass}">
        <div class="match-number">Match ${matchNumber}</div>
        <div class="match-score">
          <span class="team-score">${match.team_score}</span>
          <span class="score-separator">-</span>
          <span class="opponent-score">${match.opponent_score}</span>
        </div>
        ${extraInfo ? `<div class="match-extra">${extraInfo}</div>` : ''}
      </div>
    `;
  },

  // Calculate if win from final score
  calculateIsWin(finalScore) {
    const [teamScore, opponentScore] = finalScore.split('-').map(Number);
    return teamScore > opponentScore;
  },

  // Show scrim modal
  showScrimModal(scrimId = null) {
    const modal = document.getElementById('scrim-modal');
    const form = document.getElementById('scrim-form');
    const title = document.getElementById('scrim-modal-title');
    const submitBtn = document.getElementById('scrim-submit-btn-text');

    if (!modal || !form) {
      console.error('Modal elements not found');
      return;
    }

    // Get current team's game
    this.currentGame = AppState.currentTeam?.game_type || 'rocket-league';
    console.log('🎮 Current game:', this.currentGame);

    if (scrimId) {
      // Edit mode
      const scrim = this.scrims.find(s => s.id === scrimId);
      if (!scrim) return;

      title.innerHTML = '<i class="fas fa-trophy"></i> Modifier le scrim';
      submitBtn.textContent = 'Mettre à jour';

      // Fill form
      document.getElementById('scrim-id').value = scrim.id;
      document.getElementById('scrim-title').value = scrim.title || '';
      document.getElementById('scrim-opponent').value = scrim.opponent_name;
      document.getElementById('scrim-date').value = scrim.scrim_date;
      document.getElementById('scrim-time').value = scrim.scrim_time ? scrim.scrim_time.substring(0, 5) : '';
      document.getElementById('scrim-format').value = scrim.format;
      document.getElementById('scrim-result').value = this.calculateIsWin(scrim.final_score) ? 'win' : 'loss';
      document.getElementById('scrim-notes').value = scrim.notes || '';

      // Update match inputs and fill them
      this.updateMatchInputs(scrim.format);
      setTimeout(() => this.fillMatchInputs(scrim.matches), 100);
    } else {
      // Create mode
      title.innerHTML = '<i class="fas fa-trophy"></i> Ajouter un scrim';
      submitBtn.textContent = 'Enregistrer le scrim';
      form.reset();
      document.getElementById('scrim-id').value = '';
      
      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('scrim-date').value = today;
      
      // Set default time to now
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      document.getElementById('scrim-time').value = `${hours}:${minutes}`;
      
      // Clear matches container
      document.getElementById('matches-container').innerHTML = '';
      document.getElementById('matches-info').textContent = 'Format non sélectionné';
    }

    modal.style.display = 'flex';
  },

  // Hide scrim modal
  hideScrimModal() {
    const modal = document.getElementById('scrim-modal');
    modal.style.display = 'none';
  },

  // Update match inputs based on format
  updateMatchInputs(format) {
    const container = document.getElementById('matches-container');
    const infoSpan = document.getElementById('matches-info');

    if (!format) {
      container.innerHTML = '';
      infoSpan.textContent = 'Format non sélectionné';
      return;
    }

    const maxMatches = parseInt(format.replace('BO', ''));
    infoSpan.textContent = `Maximum ${maxMatches} match${maxMatches > 1 ? 's' : ''}`;

    container.innerHTML = '';
    for (let i = 1; i <= maxMatches; i++) {
      container.appendChild(this.createMatchInput(i));
    }
  },

  // Create match input element
  createMatchInput(matchNumber) {
    const div = document.createElement('div');
    div.className = 'match-input';
    div.innerHTML = `
      <div class="match-input-header">
        <span class="match-number">Match ${matchNumber}</span>
      </div>
      <div class="match-input-row">
        <div class="form-group-inline">
          <label>Score équipe</label>
          <input type="number" class="match-team-score" data-match="${matchNumber}" min="0" required>
        </div>
        <div class="score-separator">-</div>
        <div class="form-group-inline">
          <label>Score adverse</label>
          <input type="number" class="match-opponent-score" data-match="${matchNumber}" min="0" required>
        </div>
      </div>
      ${this.getGameSpecificInputs(matchNumber)}
    `;
    return div;
  },

  // Get game-specific inputs
  getGameSpecificInputs(matchNumber) {
    const game = this.currentGame?.toLowerCase();
    
    if (game === 'league-of-legends' || game === 'lol') {
      return `
        <div class="match-input-row">
          <div class="form-group-inline">
            <label><i class="fas fa-clock"></i> Durée</label>
            <input type="text" class="match-duration" data-match="${matchNumber}" placeholder="28:35">
          </div>
          <div class="form-group-inline">
            <label><i class="fas fa-circle"></i> Côté</label>
            <select class="match-side" data-match="${matchNumber}">
              <option value="">-</option>
              <option value="blue">Bleu</option>
              <option value="red">Rouge</option>
            </select>
          </div>
        </div>
      `;
    } else if (game === 'rocket-league' || game === 'rl') {
      return `
        <div class="match-input-row">
          <div class="form-group-inline full-width">
            <label><i class="fas fa-map"></i> Carte</label>
            <input type="text" class="match-map" data-match="${matchNumber}" placeholder="Ex: DFH Stadium">
          </div>
        </div>
      `;
    } else if (game === 'valorant') {
      return `
        <div class="match-input-row">
          <div class="form-group-inline full-width">
            <label><i class="fas fa-map"></i> Carte</label>
            <input type="text" class="match-map" data-match="${matchNumber}" placeholder="Ex: Haven, Bind">
          </div>
        </div>
      `;
    }
    return '';
  },

  // Fill match inputs with existing data
  fillMatchInputs(matches) {
    const game = this.currentGame?.toLowerCase();
    
    matches.forEach((match, index) => {
      const matchNumber = index + 1;
      
      const teamScoreInput = document.querySelector(`.match-team-score[data-match="${matchNumber}"]`);
      const opponentScoreInput = document.querySelector(`.match-opponent-score[data-match="${matchNumber}"]`);
      
      if (teamScoreInput) teamScoreInput.value = match.team_score;
      if (opponentScoreInput) opponentScoreInput.value = match.opponent_score;

      if (game === 'league-of-legends' || game === 'lol') {
        const durationInput = document.querySelector(`.match-duration[data-match="${matchNumber}"]`);
        const sideSelect = document.querySelector(`.match-side[data-match="${matchNumber}"]`);
        
        if (durationInput && match.duration) durationInput.value = match.duration;
        if (sideSelect && match.side) sideSelect.value = match.side;
      } else if (game === 'rocket-league' || game === 'rl' || game === 'valorant') {
        const mapInput = document.querySelector(`.match-map[data-match="${matchNumber}"]`);
        if (mapInput && match.map) mapInput.value = match.map;
      }
    });
  },

  // Collect match data from inputs
  collectMatchData() {
    const game = this.currentGame?.toLowerCase();
    const matches = [];
    const teamScoreInputs = document.querySelectorAll('.match-team-score');

    teamScoreInputs.forEach(input => {
      const matchNumber = parseInt(input.dataset.match);
      const teamScore = parseInt(input.value);
      const opponentScore = parseInt(document.querySelector(`.match-opponent-score[data-match="${matchNumber}"]`).value);

      // Skip if both scores are 0 or empty
      if (isNaN(teamScore) || isNaN(opponentScore)) return;

      const matchData = {
        match_number: matchNumber,
        team_score: teamScore,
        opponent_score: opponentScore
      };

      // Add game-specific data
      if (game === 'league-of-legends' || game === 'lol') {
        const duration = document.querySelector(`.match-duration[data-match="${matchNumber}"]`)?.value;
        const side = document.querySelector(`.match-side[data-match="${matchNumber}"]`)?.value;
        
        if (duration) matchData.duration = duration;
        if (side) matchData.side = side;
      } else if (game === 'rocket-league' || game === 'rl' || game === 'valorant') {
        const map = document.querySelector(`.match-map[data-match="${matchNumber}"]`)?.value;
        if (map) matchData.map = map;
      }

      matches.push(matchData);
    });

    return matches;
  },

  // Calculate final score from matches
  calculateFinalScore(matches) {
    let teamWins = 0;
    let opponentWins = 0;

    matches.forEach(match => {
      if (match.team_score > match.opponent_score) {
        teamWins++;
      } else {
        opponentWins++;
      }
    });

    return `${teamWins}-${opponentWins}`;
  },

  // Save scrim
  async saveScrim() {
    const scrimId = document.getElementById('scrim-id').value;
    const title = document.getElementById('scrim-title').value.trim();
    const opponent = document.getElementById('scrim-opponent').value.trim();
    const date = document.getElementById('scrim-date').value;
    const time = document.getElementById('scrim-time').value;
    const format = document.getElementById('scrim-format').value;
    const notes = document.getElementById('scrim-notes').value.trim();

    if (!title || !opponent || !date || !time || !format) {
      showToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    const matches = this.collectMatchData();
    if (matches.length === 0) {
      showToast('Veuillez entrer les scores d\'au moins un match', 'error');
      return;
    }

    const finalScore = this.calculateFinalScore(matches);

    const scrimData = {
      team_id: AppState.currentTeam.id,
      game: this.currentGame,
      title: title,
      opponent_name: opponent,
      scrim_date: date,
      scrim_time: time,
      format: format,
      final_score: finalScore,
      matches: matches,
      notes: notes || null
    };

    const supabase = window.supabaseClient || AppState.supabase;
    if (!supabase) {
      showToast('Erreur: Client Supabase non disponible', 'error');
      return;
    }

    try {
      let scrimEventId = null;
      
      if (scrimId) {
        // Update existing
        const { error } = await supabase
          .from('scrims')
          .update({ ...scrimData, updated_at: new Date().toISOString() })
          .eq('id', scrimId);

        if (error) throw error;
        
        // Update event in planning if it exists
        const existingScrim = this.scrims.find(s => s.id === scrimId);
        if (existingScrim?.event_id) {
          await this.updatePlanningEvent(existingScrim.event_id, title, opponent, date, time, finalScore);
        }
        
        showToast('Scrim mis à jour avec succès', 'success');
      } else {
        // Create event in planning first
        const startDateTime = new Date(`${date}T${time}`);
        const endDateTime = new Date(startDateTime);
        endDateTime.setHours(endDateTime.getHours() + 2);
        
        const eventData = {
          team_id: AppState.currentTeam.id,
          title: `${title} vs ${opponent}`,
          event_type: 'scrim',
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          location: 'Online',
          description: `${format} - Score final: ${finalScore}\n\n${notes || ''}`,
          created_by: AppState.currentUser.id
        };
        
        const { data: eventResult, error: eventError } = await supabase
          .from('events')
          .insert(eventData)
          .select()
          .single();
        
        if (eventError) throw eventError;
        scrimEventId = eventResult.id;
        
        // Create scrim with event link
        const { error } = await supabase
          .from('scrims')
          .insert({ ...scrimData, event_id: scrimEventId, created_by: AppState.currentUser.id });

        if (error) throw error;
        showToast('Scrim enregistré avec succès et ajouté au planning', 'success');
      }

      this.hideScrimModal();
      await this.loadScrims(AppState.currentTeam.id);

      // Reload calendar if it's loaded
      if (typeof CalendarManager !== 'undefined' && CalendarManager.loadEvents) {
        await CalendarManager.loadEvents();
        if (CalendarManager.renderCalendar) {
          CalendarManager.renderCalendar();
        }
      }
    } catch (error) {
      console.error('Error saving scrim:', error);
      showToast('Erreur lors de l\'enregistrement: ' + error.message, 'error');
    }
  },

  // Edit scrim
  editScrim(scrimId) {
    this.showScrimModal(scrimId);
  },

  // Delete scrim
  async deleteScrim(scrimId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce scrim ?')) return;

    const supabase = window.supabaseClient || AppState.supabase;
    if (!supabase) {
      showToast('Erreur: Client Supabase non disponible', 'error');
      return;
    }

    try {
      // Get scrim to find associated event
      const { data: scrim, error: fetchError } = await supabase
        .from('scrims')
        .select('event_id')
        .eq('id', scrimId)
        .single();

      if (fetchError) throw fetchError;

      // Delete scrim
      const { error } = await supabase
        .from('scrims')
        .delete()
        .eq('id', scrimId);

      if (error) throw error;

      // Delete associated event if it exists
      if (scrim?.event_id) {
        await supabase
          .from('events')
          .delete()
          .eq('id', scrim.event_id);

        // Reload calendar if it exists
        if (window.CalendarManager) {
          await window.CalendarManager.loadEvents(AppState.currentTeam.id);
          window.CalendarManager.renderDayDetail();
        }
      }

      showToast('Scrim supprimé avec succès', 'success');
      await this.loadScrims(AppState.currentTeam.id);
    } catch (error) {
      console.error('Error deleting scrim:', error);
      showToast('Erreur lors de la suppression: ' + error.message, 'error');
    }
  },

  // Calculate end time (add 2 hours)
  calculateEndTime(startTime) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHours = (hours + 2) % 24;
    return `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  },

  // Update planning event
  async updatePlanningEvent(eventId, title, opponent, date, time, score) {
    const supabase = window.supabaseClient || AppState.supabase;
    if (!supabase) return;
    
    const startDateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + 2);
    
    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: `${title} vs ${opponent}`,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          description: `Score final: ${score}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating planning event:', error);
    }
  }
};

// Don't auto-initialize, will be called from manager.js
