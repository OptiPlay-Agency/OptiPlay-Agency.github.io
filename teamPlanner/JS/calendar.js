// =====================================================
// CALENDAR MANAGER - Event Management Module
// =====================================================

const CalendarManager = {
  events: [],
  currentView: 'week',
  currentDate: new Date(),
  selectedDate: null,

  // Load events
  async loadEvents(teamId) {
    try {
      const { data, error } = await AppState.supabase
        .from('events')
        .select('*')
        .eq('team_id', teamId)
        .order('start_time', { ascending: true });

      if (error) throw error;

      this.events = data.map(event => ({
        ...event,
        start_time: new Date(event.start_time),
        end_time: new Date(event.end_time)
      }));

      return this.events;
    } catch (error) {
      console.error('Error loading events:', error);
      this.events = [];
      return [];
    }
  },

  // Render calendar
  async renderCalendar() {
    const container = document.getElementById('calendar-container');
    if (!container) return;

    // Load events first
    await this.loadEvents(AppState.currentTeam.id);

    // Simple week view
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;">
        <button class="btn btn-secondary" onclick="CalendarManager.previousWeek()">
          <i class="fas fa-chevron-left"></i>
        </button>
        <h3>${this.getWeekLabel()}</h3>
        <button class="btn btn-secondary" onclick="CalendarManager.nextWeek()">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
      <div id="week-view"></div>
      <div id="day-detail-view" style="display:none;"></div>
    `;

    this.renderWeekView();
  },

  // Render week view
  renderWeekView() {
    const weekView = document.getElementById('week-view');
    if (!weekView) return;

    const weekStart = this.getWeekStart(this.currentDate);
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }

    weekView.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1rem;">
        ${days.map(day => this.renderDay(day)).join('')}
      </div>
    `;
  },

  // Render single day
  renderDay(date) {
    const dayEvents = this.events.filter(event => 
      this.isSameDay(event.start_time, date)
    );

    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const isToday = this.isSameDay(date, new Date());
    const dateStr = date.toISOString();

    return `
      <div style="background:var(--bg-darker);border:2px solid ${isToday ? 'var(--primary-color)' : 'var(--border-color)'};border-radius:var(--border-radius);padding:1rem;cursor:pointer;transition:all 0.3s;" 
           onclick="CalendarManager.openDayDetail('${dateStr}')"
           onmouseover="this.style.borderColor='var(--primary-color)'"
           onmouseout="this.style.borderColor='${isToday ? 'var(--primary-color)' : 'var(--border-color)'}'">
        <div style="text-align:center;margin-bottom:1rem;">
          <div style="font-weight:600;color:${isToday ? 'var(--primary-color)' : 'var(--text-primary)'};">${dayNames[date.getDay()]}</div>
          <div style="font-size:1.5rem;font-weight:700;color:${isToday ? 'var(--primary-color)' : 'var(--text-primary)'};">${date.getDate()}</div>
        </div>
        <div style="min-height:100px;">
          ${dayEvents.length > 0 ? dayEvents.map(event => `
            <div style="background:var(--gradient-primary);border-radius:6px;padding:0.5rem;margin-bottom:0.5rem;">
              <div style="font-size:0.85rem;font-weight:600;">${event.title}</div>
              <div style="font-size:0.75rem;opacity:0.9;">${this.formatTime(event.start_time)}</div>
            </div>
          `).join('') : '<p style="font-size:0.85rem;color:var(--text-muted);text-align:center;">Aucun événement</p>'}
        </div>
      </div>
    `;
  },

  // Open day detail in full screen
  openDayDetail(dateStr) {
    this.selectedDate = new Date(dateStr);
    const weekView = document.getElementById('week-view');
    const dayDetailView = document.getElementById('day-detail-view');
    
    weekView.style.display = 'none';
    dayDetailView.style.display = 'block';
    
    this.renderDayDetail();
  },

  // Render day detail full screen
  renderDayDetail() {
    const dayDetailView = document.getElementById('day-detail-view');
    const dayEvents = this.events.filter(event => 
      this.isSameDay(event.start_time, this.selectedDate)
    );

    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    dayDetailView.innerHTML = `
      <div style="background:var(--bg-darker);border-radius:var(--border-radius);padding:2rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;">
          <button class="btn btn-secondary" onclick="CalendarManager.closeDayDetail()">
            <i class="fas fa-arrow-left"></i> Retour
          </button>
          <h2>${dayNames[this.selectedDate.getDay()]} ${this.selectedDate.getDate()} ${months[this.selectedDate.getMonth()]} ${this.selectedDate.getFullYear()}</h2>
          <button class="btn btn-primary" onclick="CalendarManager.addEventToDay()">
            <i class="fas fa-plus"></i> Ajouter un événement
          </button>
        </div>

        <div style="display:grid;gap:1rem;">
          ${dayEvents.length > 0 ? dayEvents.map(event => `
            <div style="background:var(--bg-primary);border-left:4px solid var(--primary-color);border-radius:var(--border-radius);padding:1.5rem;display:grid;grid-template-columns:auto 1fr auto;gap:1.5rem;align-items:start;">
              <div style="text-align:center;min-width:80px;">
                <div style="font-size:0.85rem;color:var(--text-muted);">${this.formatTime(event.start_time)}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">à</div>
                <div style="font-size:0.85rem;color:var(--text-muted);">${this.formatTime(event.end_time)}</div>
              </div>
              <div>
                <h3 style="margin:0 0 0.5rem 0;color:var(--text-primary);">${event.title}</h3>
                ${event.description ? `<p style="color:var(--text-secondary);margin:0 0 0.75rem 0;">${event.description}</p>` : ''}
                <div style="display:flex;gap:1rem;font-size:0.85rem;">
                  <span style="color:var(--text-muted);">
                    <i class="fas fa-tag"></i> ${this.getEventTypeLabel(event.event_type)}
                  </span>
                  ${event.location ? `<span style="color:var(--text-muted);"><i class="fas fa-map-marker-alt"></i> ${event.location}</span>` : ''}
                </div>
              </div>
              <div style="display:flex;gap:0.5rem;">
                <button class="btn btn-secondary" style="padding:0.5rem 1rem;" onclick="CalendarManager.editEvent('${event.id}')">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" style="padding:0.5rem 1rem;" onclick="CalendarManager.deleteEvent('${event.id}')">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          `).join('') : `
            <div style="text-align:center;padding:4rem;color:var(--text-muted);">
              <i class="fas fa-calendar-times" style="font-size:4rem;margin-bottom:1rem;opacity:0.3;"></i>
              <p>Aucun événement pour cette journée</p>
            </div>
          `}
        </div>
      </div>
    `;
  },

  // Close day detail
  closeDayDetail() {
    const weekView = document.getElementById('week-view');
    const dayDetailView = document.getElementById('day-detail-view');
    
    weekView.style.display = 'block';
    dayDetailView.style.display = 'none';
    this.selectedDate = null;
  },

  // Get event type label
  getEventTypeLabel(type) {
    const labels = {
      'training': 'Entraînement',
      'scrim': 'Scrim',
      'match': 'Match',
      'meeting': 'Réunion',
      'other': 'Autre'
    };
    return labels[type] || type;
  },

  // Add event to selected day
  async addEventToDay() {
    this.showEventModal();
  },

  // Show event modal for create/edit
  showEventModal(eventId = null) {
    const modal = document.getElementById('event-modal');
    const modalTitle = document.getElementById('event-modal-title');
    const submitBtnText = document.getElementById('event-submit-btn-text');
    const form = document.getElementById('event-form');
    
    // Reset form
    form.reset();
    document.getElementById('event-id').value = '';
    
    if (eventId) {
      // Edit mode
      const event = this.events.find(e => e.id === eventId);
      if (!event) return;
      
      modalTitle.textContent = 'Modifier l\'événement';
      submitBtnText.textContent = 'Enregistrer';
      
      // Populate form
      document.getElementById('event-id').value = event.id;
      document.getElementById('event-title').value = event.title;
      document.getElementById('event-type').value = event.event_type;
      document.getElementById('event-date').value = this.formatDateForInput(event.start_time);
      document.getElementById('event-start-time').value = this.formatTimeForInput(event.start_time);
      document.getElementById('event-end-time').value = this.formatTimeForInput(event.end_time);
      document.getElementById('event-location').value = event.location || '';
      document.getElementById('event-description').value = event.description || '';
    } else {
      // Create mode
      modalTitle.textContent = 'Nouvel événement';
      submitBtnText.textContent = 'Créer l\'événement';
      
      // Pre-fill date if we have a selected date
      if (this.selectedDate) {
        document.getElementById('event-date').value = this.formatDateForInput(this.selectedDate);
      } else {
        document.getElementById('event-date').value = this.formatDateForInput(new Date());
      }
      
      // Set default time
      document.getElementById('event-start-time').value = '18:00';
      document.getElementById('event-end-time').value = '20:00';
    }
    
    modal.style.display = 'flex';
  },

  // Hide event modal
  hideEventModal() {
    const modal = document.getElementById('event-modal');
    modal.style.display = 'none';
  },

  // Save event (create or update)
  async saveEvent() {
    const eventId = document.getElementById('event-id').value;
    const title = document.getElementById('event-title').value.trim();
    const eventType = document.getElementById('event-type').value;
    const date = document.getElementById('event-date').value;
    const startTime = document.getElementById('event-start-time').value;
    const endTime = document.getElementById('event-end-time').value;
    const location = document.getElementById('event-location').value.trim();
    const description = document.getElementById('event-description').value.trim();

    if (!title || !date || !startTime || !endTime) {
      showToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    // Combine date and time
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    // Validate times
    if (endDateTime <= startDateTime) {
      showToast('L\'heure de fin doit être après l\'heure de début', 'error');
      return;
    }

    try {
      const eventData = {
        team_id: AppState.currentTeam.id,
        title,
        event_type: eventType,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: location || null,
        description: description || null,
        created_by: AppState.currentUser.id
      };

      if (eventId) {
        // Update existing event
        const { error } = await AppState.supabase
          .from('events')
          .update(eventData)
          .eq('id', eventId);

        if (error) throw error;
        
        showToast('Événement modifié avec succès', 'success');
      } else {
        // Create new event
        const { error } = await AppState.supabase
          .from('events')
          .insert(eventData);

        if (error) throw error;
        
        showToast('Événement créé avec succès', 'success');
      }

      // Reload events
      await this.loadEvents(AppState.currentTeam.id);
      
      // Refresh view based on current state
      if (this.selectedDate) {
        // We're in day detail view
        this.renderDayDetail();
      } else {
        // We're in week view
        this.renderWeekView();
      }
      
      // Close modal
      this.hideEventModal();

    } catch (error) {
      console.error('Error saving event:', error);
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  },

  // Format date for input field (YYYY-MM-DD)
  formatDateForInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Format time for input field (HH:MM)
  formatTimeForInput(date) {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // Edit event
  async editEvent(eventId) {
    this.showEventModal(eventId);
  },

  // Delete event
  async deleteEvent(eventId) {
    if (!confirm('Supprimer cet événement ?')) return;

    try {
      // Get event to check if it's a scrim
      const { data: event, error: fetchError } = await AppState.supabase
        .from('events')
        .select('event_type')
        .eq('id', eventId)
        .single();

      if (fetchError) throw fetchError;

      // Delete event
      const { error } = await AppState.supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      // If it's a scrim, delete the associated scrim record
      if (event?.event_type === 'scrim') {
        await AppState.supabase
          .from('scrims')
          .delete()
          .eq('event_id', eventId);

        // Reload scrims if ScrimManager exists
        if (window.ScrimManager) {
          await window.ScrimManager.loadScrims(AppState.currentTeam.id);
        }
      }

      showToast('Événement supprimé', 'success');
      await this.loadEvents(AppState.currentTeam.id);
      this.renderDayDetail();
    } catch (error) {
      console.error('Error deleting event:', error);
      showToast('Erreur lors de la suppression', 'error');
    }
  },

  // Get week start (Monday)
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  },

  // Get week label
  getWeekLabel() {
    const weekStart = this.getWeekStart(this.currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    
    return `${weekStart.getDate()} ${months[weekStart.getMonth()]} - ${weekEnd.getDate()} ${months[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
  },

  // Navigation
  previousWeek() {
    this.currentDate.setDate(this.currentDate.getDate() - 7);
    this.renderCalendar();
  },

  nextWeek() {
    this.currentDate.setDate(this.currentDate.getDate() + 7);
    this.renderCalendar();
  },

  // Check if same day
  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  },

  // Format time
  formatTime(date) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  },

  // View event
  viewEvent(eventId) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    alert(`Événement: ${event.title}\n\nDescription: ${event.description || 'Aucune'}\n\nDébut: ${event.start_time.toLocaleString('fr-FR')}\nFin: ${event.end_time.toLocaleString('fr-FR')}`);
  }
};

// Setup add event button listener
document.addEventListener('DOMContentLoaded', () => {
  const addEventBtn = document.getElementById('add-event-btn');
  if (addEventBtn) {
    addEventBtn.addEventListener('click', () => {
      showToast('Fonctionnalité d\'ajout d\'événement à venir', 'info');
    });
  }
});

// Export
window.CalendarManager = CalendarManager;
