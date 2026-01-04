// =====================================================
// AVAILABILITY MANAGER - Availability Management Module
// =====================================================

const AvailabilityManager = {
  availabilities: [],
  myAvailabilities: [],
  currentWeekStart: null,
  currentUser: null,
  currentView: 'me', // 'me' or 'team'

  // Availability statuses
  STATUS: {
    UNDEFINED: 'undefined',
    PRESENT: 'present',
    ABSENT: 'absent',
    UNSURE: 'unsure'
  },

  // Load availabilities
  async loadAvailabilities(teamId) {
    try {
      // Use RPC function to get availabilities with user info
      const { data, error } = await AppState.supabase
        .rpc('get_availabilities_with_info', { p_team_id: teamId });

      if (error) throw error;

      this.availabilities = data;
      this.myAvailabilities = data.filter(a => a.user_id === AppState.currentUser.id);
      this.currentUser = AppState.currentUser.user_metadata?.pseudo || AppState.currentUser.email.split('@')[0];

      return this.availabilities;
    } catch (error) {
      console.error('Error loading availabilities:', error);
      this.availabilities = [];
      return [];
    }
  },

  // Render availabilities
  async renderAvailabilities() {
    const container = document.getElementById('availability-grid-container');
    if (!container) return;

    // Initialize week if not set
    if (!this.currentWeekStart) {
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
      this.currentWeekStart = new Date(today.setDate(diff));
      this.currentWeekStart.setHours(0, 0, 0, 0);
    }

    this.renderWeekGrid();
  },

  // Switch view
  switchView(viewType) {
    this.currentView = viewType;
    this.renderWeekGrid();
  },

  // Render week grid
  renderWeekGrid() {
    const container = document.getElementById('availability-grid-container');
    
    const weekEnd = new Date(this.currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;">
        <button class="btn btn-secondary" onclick="AvailabilityManager.previousWeek()">
          <i class="fas fa-chevron-left"></i> Last week
        </button>
        <h3>${this.currentWeekStart.getDate()} - ${weekEnd.getDate()} ${monthNames[weekEnd.getMonth()]}, ${weekEnd.getFullYear()}</h3>
        <button class="btn btn-secondary" onclick="AvailabilityManager.nextWeek()">
          Next week <i class="fas fa-chevron-right"></i>
        </button>
      </div>

      <div style="background:var(--bg-darker);border-radius:var(--border-radius);padding:1.5rem;overflow-x:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
          <h4>Availability for : ${this.currentView === 'me' ? this.currentUser : 'Team'}</h4>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn ${this.currentView === 'me' ? 'btn-primary' : 'btn-secondary'}" onclick="AvailabilityManager.switchView('me')" style="padding:0.5rem 1.5rem;">
              <i class="fas fa-user"></i> Moi
            </button>
            <button class="btn ${this.currentView === 'team' ? 'btn-primary' : 'btn-secondary'}" onclick="AvailabilityManager.switchView('team')" style="padding:0.5rem 1.5rem;">
              <i class="fas fa-users"></i> Équipe
            </button>
          </div>
        </div>

        ${this.currentView === 'me' ? this.renderLegend() : ''}

        <div style="display:grid;grid-template-columns:80px repeat(7, 1fr);gap:2px;background:var(--border-color);border:2px solid var(--border-color);border-radius:var(--border-radius);overflow:hidden;">
          ${this.renderGridHeader()}
          ${this.currentView === 'me' ? this.renderMyGridBody() : this.renderTeamGridBody()}
        </div>
      </div>
    `;
  },

  // Render legend for personal view
  renderLegend() {
    return `
      <div style="display:flex;gap:1.5rem;margin-bottom:1rem;padding:1rem;background:var(--bg-primary);border-radius:8px;font-size:0.85rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <div style="width:20px;height:20px;background:#374151;border-radius:4px;"></div>
          <span>Undefined</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <div style="width:20px;height:20px;background:#10b981;border-radius:4px;"></div>
          <span>Présent</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <div style="width:20px;height:20px;background:#ef4444;border-radius:4px;"></div>
          <span>Absent</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <div style="width:20px;height:20px;background:#f59e0b;border-radius:4px;"></div>
          <span>Pas sûr</span>
        </div>
      </div>
    `;
  },

  // Render grid header (days)
  renderGridHeader() {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Empty cell for time column
    let html = '<div style="background:var(--bg-darker);padding:0.75rem;"></div>';
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(date.getDate() + i);
      
      html += `
        <div style="background:var(--bg-darker);padding:0.75rem;text-align:center;">
          <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.25rem;">${dayNames[i]}</div>
          <div style="font-size:0.9rem;font-weight:600;">${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}</div>
        </div>
      `;
    }
    
    return html;
  },

  // Render MY grid body (editable)
  renderMyGridBody() {
    console.log('🎨 Rendering MY grid body, myAvailabilities count:', this.myAvailabilities.length);
    
    let html = '';
    const hours = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0];
    
    hours.forEach(hour => {
      // Time column
      html += `<div style="background:var(--bg-primary);padding:0.75rem;text-align:center;font-size:0.85rem;color:var(--text-muted);">${hour.toString().padStart(2, '0')}h00</div>`;
      
      // Day columns
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const status = this.getMySlotStatus(dayOffset, hour);
        const colors = {
          undefined: '#374151',
          present: '#10b981',
          absent: '#ef4444',
          unsure: '#f59e0b'
        };
        const icons = {
          undefined: '',
          present: '✓',
          absent: '✗',
          unsure: '?'
        };
        
        // Debug for specific slot
        if (dayOffset === 4 && hour === 15) {
          console.log('🎨 Rendering slot [4,15] with status:', status, 'color:', colors[status]);
        }
        
        html += `
          <div style="background:${colors[status]};padding:0.75rem;text-align:center;font-size:1.2rem;color:white;cursor:pointer;transition:all 0.2s;font-weight:600;" 
               onclick="AvailabilityManager.toggleMySlot(${dayOffset}, ${hour})"
               onmouseover="this.style.opacity='0.8'"
               onmouseout="this.style.opacity='1'"
               title="Cliquez pour changer">
            ${icons[status]}
          </div>
        `;
      }
    });
    
    console.log('🎨 Grid HTML generated, length:', html.length);
    return html;
  },

  // Render TEAM grid body (read-only with counts)
  renderTeamGridBody() {
    let html = '';
    const hours = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0];
    
    hours.forEach(hour => {
      // Time column
      html += `<div style="background:var(--bg-primary);padding:0.75rem;text-align:center;font-size:0.85rem;color:var(--text-muted);">${hour.toString().padStart(2, '0')}h00</div>`;
      
      // Day columns
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const { count, members } = this.getTeamSlotInfo(dayOffset, hour);
        
        html += `
          <div style="background:var(--bg-primary);padding:0.75rem;text-align:center;font-size:0.85rem;color:${count > 0 ? '#10b981' : 'var(--text-muted)'};cursor:default;position:relative;" 
               class="team-slot"
               data-members='${JSON.stringify(members).replace(/'/g, "&#39;")}'>
            ${count > 0 ? `${count} présent${count > 1 ? 's' : ''}` : '-'}
          </div>
        `;
      }
    });
    
    // Add tooltip functionality
    setTimeout(() => {
      document.querySelectorAll('.team-slot').forEach(cell => {
        cell.addEventListener('mouseenter', (e) => {
          const members = JSON.parse(cell.dataset.members);
          if (members.length > 0) {
            this.showTooltip(e.target, members);
          }
        });
        cell.addEventListener('mouseleave', () => {
          this.hideTooltip();
        });
      });
    }, 0);
    
    return html;
  },

  // Get my slot status
  getMySlotStatus(dayOffset, hour) {
    const dayOfWeek = (dayOffset + 1) % 7;
    
    // Calculate the actual date for this slot
    const slotDate = new Date(this.currentWeekStart);
    slotDate.setDate(slotDate.getDate() + dayOffset);
    const slotDateStr = this.formatDateForDB(slotDate);
    
    const weekStartStr = this.formatDateForDB(this.currentWeekStart);
    
    // Debug logs
    if (dayOffset === 4 && hour === 15) { // Debug pour le créneau de test
      console.log('🔍 Debug slot [4,15]:', {
        weekStart: weekStartStr,
        availabilities: this.myAvailabilities.length,
        hasWeekStart: this.myAvailabilities.some(a => a.week_start)
      });
    }
    
    const avail = this.myAvailabilities.find(a => {
      // Debug each condition
      const weekMatch = a.week_start === weekStartStr;
      const dayMatch = a.day_of_week === dayOfWeek;
      
      if (dayOffset === 4 && hour === 15 && weekMatch && dayMatch) {
        console.log('✅ Found matching availability:', {
          start_time: a.start_time,
          status: a.status
        });
      }
      
      // Must match both week and day
      if (!weekMatch) return false;
      if (!dayMatch) return false;
      
      // Parse time string (handle both "18:00" and "18:00:00" formats)
      const startHour = parseInt(a.start_time.split(':')[0]);
      const endHour = parseInt(a.end_time.split(':')[0]);
      
      const timeMatch = hour >= startHour && hour < endHour;
      
      if (dayOffset === 4 && hour === 15) {
        console.log('🔍 Time check:', {
          startHour, endHour, hour, timeMatch
        });
      }
      
      return timeMatch;
    });
    
    return avail ? (avail.status || this.STATUS.UNDEFINED) : this.STATUS.UNDEFINED;
  },

  // Format date for database (YYYY-MM-DD)
  formatDateForDB(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Get team slot info
  getTeamSlotInfo(dayOffset, hour) {
    const dayOfWeek = (dayOffset + 1) % 7;
    const weekStartStr = this.formatDateForDB(this.currentWeekStart);
    
    const presentMembers = this.availabilities.filter(a => {
      // Must match both week and day
      if (a.week_start !== weekStartStr) return false;
      if (a.day_of_week !== dayOfWeek) return false;
      
      const startHour = parseInt(a.start_time.split(':')[0]);
      const endHour = parseInt(a.end_time.split(':')[0]);
      const isInTimeRange = hour >= startHour && hour < endHour;
      const isPresent = a.status === this.STATUS.PRESENT;
      return isInTimeRange && isPresent;
    });
    
    const members = presentMembers.map(a => {
      if (a.user_id === AppState.currentUser.id) {
        return this.currentUser;
      }
      // Use pseudo from RPC function
      return a.user_pseudo || 'Membre #' + a.user_id.substring(0, 4);
    });
    
    return { count: members.length, members };
  },

  // Toggle my slot (cycle through statuses)
  async toggleMySlot(dayOffset, hour) {
    console.log('🔄 Toggle slot:', { dayOffset, hour });
    
    const dayOfWeek = (dayOffset + 1) % 7;
    const weekStartStr = this.formatDateForDB(this.currentWeekStart);
    
    // Find existing availability for this slot
    const existingAvail = this.myAvailabilities.find(a => {
      // Must match both week and day
      if (a.week_start !== weekStartStr) return false;
      if (a.day_of_week !== dayOfWeek) return false;
      
      const startHour = parseInt(a.start_time.split(':')[0]);
      const endHour = parseInt(a.end_time.split(':')[0]);
      return hour >= startHour && hour < endHour;
    });
    
    console.log('📋 Existing availability:', existingAvail);
    
    const currentStatus = existingAvail ? (existingAvail.status || this.STATUS.UNDEFINED) : this.STATUS.UNDEFINED;
    
    // Cycle through statuses: undefined -> present -> absent -> unsure -> undefined
    const statusCycle = [this.STATUS.UNDEFINED, this.STATUS.PRESENT, this.STATUS.ABSENT, this.STATUS.UNSURE];
    const currentIndex = statusCycle.indexOf(currentStatus);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    
    console.log('🔀 Status change:', currentStatus, '→', nextStatus);
    
    try {
      if (existingAvail) {
        // Update existing
        if (nextStatus === this.STATUS.UNDEFINED) {
          // Delete if going back to undefined
          const { error } = await AppState.supabase
            .from('availabilities')
            .delete()
            .eq('id', existingAvail.id);
          
          if (error) throw error;
          console.log('🗑️ Deleted availability');
        } else {
          // Update status
          const { error } = await AppState.supabase
            .from('availabilities')
            .update({ status: nextStatus })
            .eq('id', existingAvail.id);
          
          if (error) throw error;
          console.log('✏️ Updated status to:', nextStatus);
        }
      } else if (nextStatus !== this.STATUS.UNDEFINED) {
        // Create new with status
        const { error } = await AppState.supabase
          .from('availabilities')
          .insert({
            team_id: AppState.currentTeam.id,
            user_id: AppState.currentUser.id,
            day_of_week: dayOfWeek,
            week_start: weekStartStr,
            start_time: `${hour.toString().padStart(2, '0')}:00:00`,
            end_time: `${((hour + 1) % 24).toString().padStart(2, '0')}:00:00`,
            status: nextStatus,
            is_recurring: true
          });
        
        if (error) throw error;
        console.log('➕ Created new availability with status:', nextStatus);
      }
      
      // Reload and render
      console.log('🔄 Reloading availabilities...');
      await this.loadAvailabilities(AppState.currentTeam.id);
      this.renderWeekGrid();
      console.log('✅ Render complete');
      
    } catch (error) {
      console.error('❌ Error toggling slot:', error);
      showToast('Erreur lors de la mise à jour: ' + error.message, 'error');
    }
  },

  // Show tooltip
  showTooltip(element, members) {
    // Remove existing tooltip
    this.hideTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.id = 'availability-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      background: var(--bg-darker);
      border: 2px solid var(--primary-color);
      border-radius: 8px;
      padding: 0.75rem;
      z-index: 10000;
      font-size: 0.85rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      pointer-events: none;
      max-width: 200px;
    `;
    
    tooltip.innerHTML = `
      <div style="font-weight:600;margin-bottom:0.5rem;color:var(--primary-color);">Présents:</div>
      ${members.map(m => `<div style="padding:0.25rem 0;color:var(--text-primary);">• ${m}</div>`).join('')}
    `;
    
    document.body.appendChild(tooltip);
    
    // Position tooltip
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
  },

  // Hide tooltip
  hideTooltip() {
    const tooltip = document.getElementById('availability-tooltip');
    if (tooltip) tooltip.remove();
  },

  // Previous week
  previousWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.renderWeekGrid();
  },

  // Next week
  nextWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.renderWeekGrid();
  }
};

// Export
window.AvailabilityManager = AvailabilityManager;
