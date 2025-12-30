// Rocket League Manager
class RocketLeagueManager {
  constructor() {
    this.currentPlayer = null;
    this.formations = [];
    this.strategies = [];
    this.carsList = [
      { name: 'Octane', icon: '🚗' },
      { name: 'Fennec', icon: '🏎️' },
      { name: 'Dominus', icon: '🚙' },
      { name: 'Batmobile', icon: '🦇' },
      { name: 'Takumi', icon: '🚕' },
      { name: 'Breakout', icon: '🚐' },
      { name: 'Merc', icon: '🚛' },
      { name: 'Scarab', icon: '🐞' }
    ];
  }

  // Initialize Rocket League sections
  init() {
    this.initCarPool();
    this.initFormations();
    this.initStrategies();
  }

  // ==================== CAR POOL ====================
  initCarPool() {
    const content = document.getElementById('roles-content');
    if (!content) return;

    // Load players and their car pools
    this.loadCarPool();

    // Event listeners
    document.addEventListener('click', (e) => {
      if (e.target.closest('.player-tab')) {
        const playerId = e.target.closest('.player-tab').dataset.playerId;
        this.switchPlayer(playerId);
      }

      if (e.target.closest('.car-card')) {
        const card = e.target.closest('.car-card');
        const tier = card.closest('.car-tier-section')?.dataset.tier;
        const carName = card.dataset.car;
        this.toggleCarSelection(tier, carName);
      }
    });
  }

  async loadCarPool() {
    try {
      const teamId = window.currentTeam?.id;
      if (!teamId) return;

      // Load team members
      const { data: members, error } = await supabase
        .from('team_members')
        .select(`
          profiles (
            id,
            pseudo,
            avatar_url
          )
        `)
        .eq('team_id', teamId);

      if (error) throw error;

      // Load car pools for all members
      const { data: carPools, error: poolError } = await supabase
        .from('rl_car_pools')
        .select('*')
        .eq('team_id', teamId);

      if (poolError) throw poolError;

      this.renderPlayerTabs(members, carPools);
      
      // Select first player by default
      if (members && members.length > 0) {
        this.currentPlayer = members[0].profiles.id;
        this.renderCarPool(carPools);
      }

    } catch (error) {
      console.error('Error loading car pool:', error);
    }
  }

  renderPlayerTabs(members, carPools) {
    const container = document.getElementById('car-player-tabs');
    if (!container) return;

    container.innerHTML = members.map((member, index) => {
      const profile = member.profiles;
      const activeClass = index === 0 ? 'active' : '';
      return `
        <button class="player-tab ${activeClass}" data-player-id="${profile.id}">
          <i class="fas fa-user"></i>
          ${profile.pseudo}
        </button>
      `;
    }).join('');
  }

  renderCarPool(carPools) {
    const container = document.getElementById('car-pool-content');
    if (!container) return;

    const playerCars = carPools.filter(cp => cp.player_id === this.currentPlayer);

    const tiers = [
      { tier: 'S', label: 'Main', description: 'Voitures maîtrisées parfaitement' },
      { tier: 'A', label: 'Good', description: 'Très bon niveau' },
      { tier: 'B', label: 'Average', description: 'Niveau correct' },
      { tier: 'C', label: 'To train', description: 'À travailler' }
    ];

    container.innerHTML = tiers.map(({ tier, label, description }) => {
      const tierCars = playerCars.filter(c => c.tier === tier);
      
      return `
        <div class="car-tier-section" data-tier="${tier}">
          <div class="tier-header">
            <div class="tier-badge tier-${tier.toLowerCase()}">
              ${tier}
            </div>
            <div>
              <h3>${label}</h3>
              <p class="tier-description">${description}</p>
            </div>
          </div>
          <div class="car-grid">
            ${this.carsList.map(car => {
              const isSelected = tierCars.some(tc => tc.car_name === car.name);
              return `
                <div class="car-card ${isSelected ? 'selected' : ''}" data-car="${car.name}">
                  <div class="car-icon">${car.icon}</div>
                  <div class="car-name">${car.name}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  async toggleCarSelection(tier, carName) {
    if (!this.currentPlayer || !window.currentTeam) return;

    try {
      // Check if car already exists
      const { data: existing, error: checkError } = await supabase
        .from('rl_car_pools')
        .select('id')
        .eq('team_id', window.currentTeam.id)
        .eq('player_id', this.currentPlayer)
        .eq('car_name', carName)
        .single();

      if (existing) {
        // Update tier or delete if same tier
        const { data: currentData } = await supabase
          .from('rl_car_pools')
          .select('tier')
          .eq('id', existing.id)
          .single();

        if (currentData.tier === tier) {
          // Delete
          await supabase
            .from('rl_car_pools')
            .delete()
            .eq('id', existing.id);
        } else {
          // Update tier
          await supabase
            .from('rl_car_pools')
            .update({ tier })
            .eq('id', existing.id);
        }
      } else {
        // Insert new
        await supabase
          .from('rl_car_pools')
          .insert({
            team_id: window.currentTeam.id,
            player_id: this.currentPlayer,
            car_name: carName,
            tier: tier
          });
      }

      // Reload
      this.loadCarPool();

    } catch (error) {
      console.error('Error toggling car:', error);
    }
  }

  switchPlayer(playerId) {
    this.currentPlayer = playerId;
    
    // Update active tab
    document.querySelectorAll('.player-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.playerId === playerId);
    });

    // Reload car pool for this player
    this.loadCarPool();
  }

  // ==================== FORMATIONS ====================
  initFormations() {
    const addBtn = document.getElementById('add-formation-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showFormationModal());
    }

    const form = document.getElementById('formation-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleFormationSubmit(e));
    }

    this.loadFormations();
  }

  async loadFormations() {
    try {
      const teamId = window.currentTeam?.id;
      if (!teamId) return;

      const { data, error } = await supabase
        .from('rl_formations')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.formations = data || [];
      this.renderFormations();

    } catch (error) {
      console.error('Error loading formations:', error);
    }
  }

  renderFormations() {
    const container = document.getElementById('formations-grid');
    if (!container) return;

    if (this.formations.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fas fa-sync-alt fa-3x"></i>
          <h3>Aucune composition</h3>
          <p>Créez votre première composition d'équipe</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.formations.map(formation => `
      <div class="formation-card" data-formation-id="${formation.id}">
        <div class="formation-header">
          <h3>
            <i class="fas fa-sync-alt"></i>
            ${formation.name}
          </h3>
        </div>
        
        <div class="formation-positions-preview">
          <div class="position-preview striker">
            <div class="position-icon">⚡</div>
            <div class="position-info">
              <div class="position-role">1er Homme</div>
              <div class="position-player">${formation.striker_player || 'Non assigné'}</div>
              <div class="position-car">${formation.striker_car || ''}</div>
            </div>
          </div>
          
          <div class="position-preview midfielder">
            <div class="position-icon">🎯</div>
            <div class="position-info">
              <div class="position-role">2ème Homme</div>
              <div class="position-player">${formation.midfielder_player || 'Non assigné'}</div>
              <div class="position-car">${formation.midfielder_car || ''}</div>
            </div>
          </div>
          
          <div class="position-preview defender">
            <div class="position-icon">🛡️</div>
            <div class="position-info">
              <div class="position-role">3ème Homme</div>
              <div class="position-player">${formation.defender_player || 'Non assigné'}</div>
              <div class="position-car">${formation.defender_car || ''}</div>
            </div>
          </div>
        </div>

        ${formation.notes ? `<p class="strategy-description">${formation.notes}</p>` : ''}

        <div class="formation-actions">
          <button class="btn btn-sm btn-secondary" onclick="rlManager.editFormation('${formation.id}')">
            <i class="fas fa-edit"></i> Modifier
          </button>
          <button class="btn btn-sm btn-danger" onclick="rlManager.deleteFormation('${formation.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  async showFormationModal(formationId = null) {
    const modal = document.getElementById('formation-modal');
    if (!modal) return;

    // Load team members for selects
    const { data: members } = await supabase
      .from('team_members')
      .select('profiles(id, pseudo)')
      .eq('team_id', window.currentTeam.id);

    // Populate player selects
    ['striker', 'midfielder', 'defender', 'kickoff-center', 'kickoff-left', 'kickoff-right'].forEach(id => {
      const select = document.getElementById(`${id}-player`);
      if (select) {
        select.innerHTML = '<option value="">Sélectionner...</option>' + 
          members.map(m => `<option value="${m.profiles.pseudo}">${m.profiles.pseudo}</option>`).join('');
      }
    });

    // Populate car selects
    ['striker', 'midfielder', 'defender'].forEach(position => {
      const select = document.getElementById(`${position}-car`);
      if (select) {
        select.innerHTML = '<option value="">Voiture...</option>' +
          this.carsList.map(car => `<option value="${car.name}">${car.icon} ${car.name}</option>`).join('');
      }
    });

    // If editing, load data
    if (formationId) {
      const formation = this.formations.find(f => f.id === formationId);
      if (formation) {
        document.getElementById('formation-name').value = formation.name;
        document.getElementById('striker-player').value = formation.striker_player || '';
        document.getElementById('striker-car').value = formation.striker_car || '';
        // ... populate other fields
      }
    }

    modal.classList.add('active');
  }

  async handleFormationSubmit(e) {
    e.preventDefault();

    const formData = {
      team_id: window.currentTeam.id,
      name: document.getElementById('formation-name').value,
      striker_player: document.getElementById('striker-player').value,
      striker_car: document.getElementById('striker-car').value,
      midfielder_player: document.getElementById('midfielder-player').value,
      midfielder_car: document.getElementById('midfielder-car').value,
      defender_player: document.getElementById('defender-player').value,
      defender_car: document.getElementById('defender-car').value,
      kickoff_center: document.getElementById('kickoff-center').value,
      kickoff_left: document.getElementById('kickoff-left').value,
      kickoff_right: document.getElementById('kickoff-right').value,
      notes: document.getElementById('formation-notes').value
    };

    try {
      const { error } = await supabase
        .from('rl_formations')
        .insert(formData);

      if (error) throw error;

      document.getElementById('formation-modal').classList.remove('active');
      this.loadFormations();

    } catch (error) {
      console.error('Error saving formation:', error);
      alert('Erreur lors de la sauvegarde de la composition');
    }
  }

  async deleteFormation(formationId) {
    if (!confirm('Supprimer cette composition ?')) return;

    try {
      const { error } = await supabase
        .from('rl_formations')
        .delete()
        .eq('id', formationId);

      if (error) throw error;

      this.loadFormations();

    } catch (error) {
      console.error('Error deleting formation:', error);
    }
  }

  // ==================== STRATEGIES ====================
  initStrategies() {
    const addBtn = document.getElementById('add-strategy-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showStrategyModal());
    }

    const form = document.getElementById('strategy-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleStrategySubmit(e));
    }

    this.loadStrategies();
  }

  async loadStrategies() {
    try {
      const teamId = window.currentTeam?.id;
      if (!teamId) return;

      const { data, error } = await supabase
        .from('rl_strategies')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.strategies = data || [];
      this.renderStrategies();

    } catch (error) {
      console.error('Error loading strategies:', error);
    }
  }

  renderStrategies() {
    const container = document.getElementById('strategies-container');
    if (!container) return;

    if (this.strategies.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fas fa-brain fa-3x"></i>
          <h3>Aucune stratégie</h3>
          <p>Créez votre première stratégie d'équipe</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.strategies.map(strategy => `
      <div class="strategy-card" data-strategy-id="${strategy.id}">
        <div class="strategy-header">
          <div>
            <h3>${strategy.name}</h3>
            <span class="strategy-type-badge ${strategy.type}">${strategy.type}</span>
          </div>
        </div>
        
        <p class="strategy-description">${strategy.description}</p>

        ${strategy.diagram_url ? `
          <div class="strategy-diagram">
            <img src="${strategy.diagram_url}" alt="${strategy.name}">
          </div>
        ` : ''}

        <div class="strategy-actions">
          <button class="btn btn-sm btn-secondary" onclick="rlManager.editStrategy('${strategy.id}')">
            <i class="fas fa-edit"></i> Modifier
          </button>
          <button class="btn btn-sm btn-danger" onclick="rlManager.deleteStrategy('${strategy.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  showStrategyModal(strategyId = null) {
    const modal = document.getElementById('strategy-modal');
    if (!modal) return;

    if (strategyId) {
      const strategy = this.strategies.find(s => s.id === strategyId);
      if (strategy) {
        document.getElementById('strategy-name').value = strategy.name;
        document.getElementById('strategy-type').value = strategy.type;
        document.getElementById('strategy-description').value = strategy.description;
        document.getElementById('strategy-diagram').value = strategy.diagram_url || '';
      }
    }

    modal.classList.add('active');
  }

  async handleStrategySubmit(e) {
    e.preventDefault();

    const formData = {
      team_id: window.currentTeam.id,
      name: document.getElementById('strategy-name').value,
      type: document.getElementById('strategy-type').value,
      description: document.getElementById('strategy-description').value,
      diagram_url: document.getElementById('strategy-diagram').value || null
    };

    try {
      const { error } = await supabase
        .from('rl_strategies')
        .insert(formData);

      if (error) throw error;

      document.getElementById('strategy-modal').classList.remove('active');
      e.target.reset();
      this.loadStrategies();

    } catch (error) {
      console.error('Error saving strategy:', error);
      alert('Erreur lors de la sauvegarde de la stratégie');
    }
  }

  async deleteStrategy(strategyId) {
    if (!confirm('Supprimer cette stratégie ?')) return;

    try {
      const { error } = await supabase
        .from('rl_strategies')
        .delete()
        .eq('id', strategyId);

      if (error) throw error;

      this.loadStrategies();

    } catch (error) {
      console.error('Error deleting strategy:', error);
    }
  }

  editStrategy(strategyId) {
    this.showStrategyModal(strategyId);
  }

  editFormation(formationId) {
    this.showFormationModal(formationId);
  }
}

// Initialize
const rlManager = new RocketLeagueManager();

// Export for global access
window.rlManager = rlManager;
