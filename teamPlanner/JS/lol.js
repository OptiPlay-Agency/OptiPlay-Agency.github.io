// League of Legends Manager
class LeagueOfLegendsManager {
    constructor() {
        this.currentTeam = null;
        this.selectedPlayer = null;
        this.teamMembers = [];
        this.championPools = [];
        this.compositions = [];
        this.champions = [
            'Aatrox', 'Ahri', 'Akali', 'Akshan', 'Alistar', 'Ambessa', 'Amumu', 'Anivia', 'Annie', 'Aphelios',
            'Ashe', 'Aurelion Sol', 'Aurora', 'Azir', 'Bard', "Bel'Veth", 'Blitzcrank', 'Brand', 'Braum', 'Briar',
            'Caitlyn', 'Camille', 'Cassiopeia', "Cho'Gath", 'Corki', 'Darius', 'Diana', 'Dr. Mundo', 'Draven',
            'Ekko', 'Elise', 'Evelynn', 'Ezreal', 'Fiddlesticks', 'Fiora', 'Fizz', 'Galio', 'Gangplank', 'Garen',
            'Gnar', 'Gragas', 'Graves', 'Gwen', 'Hecarim', 'Heimerdinger', 'Hwei', 'Illaoi', 'Irelia', 'Ivern',
            'Janna', 'Jarvan IV', 'Jax', 'Jayce', 'Jhin', 'Jinx', "K'Sante", "Kai'Sa", 'Kalista', 'Karma',
            'Karthus', 'Kassadin', 'Katarina', 'Kayle', 'Kayn', 'Kennen', "Kha'Zix", 'Kindred', 'Kled', "Kog'Maw",
            'LeBlanc', 'Lee Sin', 'Leona', 'Lillia', 'Lissandra', 'Lucian', 'Lulu', 'Lux', 'Malphite', 'Malzahar',
            'Maokai', 'Master Yi', 'Milio', 'Miss Fortune', 'Mordekaiser', 'Morgana', 'Naafiri', 'Nami', 'Nasus',
            'Nautilus', 'Neeko', 'Nidalee', 'Nilah', 'Nocturne', 'Nunu', 'Olaf', 'Orianna', 'Ornn', 'Pantheon',
            'Poppy', 'Pyke', 'Qiyana', 'Quinn', 'Rakan', 'Rammus', "Rek'Sai", 'Rell', 'Renata Glasc', 'Renekton',
            'Rengar', 'Riven', 'Rumble', 'Ryze', 'Samira', 'Sejuani', 'Senna', 'Seraphine', 'Sett', 'Shaco',
            'Shen', 'Shyvana', 'Singed', 'Sion', 'Sivir', 'Skarner', 'Smolder', 'Sona', 'Soraka', 'Swain',
            'Sylas', 'Syndra', 'Tahm Kench', 'Taliyah', 'Talon', 'Taric', 'Teemo', 'Thresh', 'Tristana',
            'Trundle', 'Tryndamere', 'Twisted Fate', 'Twitch', 'Udyr', 'Urgot', 'Varus', 'Vayne', 'Veigar',
            "Vel'Koz", 'Vex', 'Vi', 'Viego', 'Viktor', 'Vladimir', 'Volibear', 'Warwick', 'Wukong', 'Xayah',
            'Xerath', 'Xin Zhao', 'Yasuo', 'Yone', 'Yorick', 'Yuumi', 'Zac', 'Zed', 'Zeri', 'Ziggs',
            'Zilean', 'Zoe', 'Zyra'
        ];

        this.roleLabels = {
            toplane: 'Toplane',
            jungle: 'Jungle',
            midlane: 'Midlane',
            adc: 'ADC',
            support: 'Support'
        };

        this.tierLabels = {
            S: { name: 'Tier S', description: 'Main', editable: false },
            A: { name: 'Tier A', description: 'Good', editable: false },
            B: { name: 'Tier B', description: 'Average', editable: false },
            C: { name: 'Tier C', description: 'To train', editable: false }
        };
        
        this.customTiers = []; // Tiers personnalisés créés par l'utilisateur
        this.userSubscription = null; // Plan d'abonnement de l'utilisateur
    }

    // Initialize all LoL sections
    init() {
        this.initChampionPool();
        this.initCompositions();
    }

    // ==================== CHAMPION POOL ====================

    // Initialize champion pool functionality
    initChampionPool() {
        console.log('Initializing Champion Pool...');

        // Event listeners for player selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.player-item')) {
                const playerItem = e.target.closest('.player-item');
                const playerId = playerItem.dataset.playerId;
                this.selectPlayer(playerId);
            }
        });

        // Event listeners for adding champions from bottom grid
        document.addEventListener('click', (e) => {
            if (e.target.closest('.champion-selector-item') && !e.target.closest('.champion-selector-item').classList.contains('dimmed')) {
                const item = e.target.closest('.champion-selector-item');
                const champion = item.dataset.champion;
                this.showTierSelector(champion);
            }
        });

        // Drag & drop event listeners
        this.setupDragAndDrop();

        // Event listeners for removing champions from tiers
        document.addEventListener('click', (e) => {
            if (e.target.closest('.champion-item')) {
                const item = e.target.closest('.champion-item');
                const champion = item.dataset.champion;
                const tier = item.dataset.tier;
                this.removeChampionFromTier(champion, tier);
            }
        });

        // Role filter
        const roleFilter = document.getElementById('role-filter');
        if (roleFilter) {
            roleFilter.addEventListener('change', () => {
                this.renderAllChampions();
            });
        }

        // Search input
        const searchInput = document.getElementById('champion-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.renderAllChampions();
            });
        }

        // Load initial data
        this.loadChampionPool();
    }

    // Load champion pool from database
    async loadChampionPool() {
        try {
            // Use AppState.currentTeam from manager.js
            if (!AppState || !AppState.currentTeam) {
                console.log('No team selected');
                return;
            }

            this.currentTeam = AppState.currentTeam;
            console.log('Loading champion pool for team:', this.currentTeam.name);

            // Load user subscription
            await this.loadUserSubscription();

            // Load team members
            await this.loadTeamMembers();

            // Load champion pools
            const { data, error } = await AppState.supabase
                .from('lol_champion_pools')
                .select('*')
                .eq('team_id', this.currentTeam.id);

            if (error) throw error;

            this.championPools = data || [];

            // Load custom tiers
            await this.loadCustomTiers();

            // Load tier renames
            await this.loadTierRenames();

            // Render player list
            this.renderPlayerList();

            // Render all champions grid (even if no player selected yet)
            this.renderAllChampions();

            // Select first player by default
            if (this.teamMembers.length > 0) {
                const firstPlayer = this.teamMembers.find(m => !m.is_substitute) || this.teamMembers[0];
                this.selectPlayer(firstPlayer.profiles.id);
            } else {
                // No players, show empty state
                const header = document.querySelector('.champion-pool-player-header');
                if (header) {
                    header.innerHTML = '<h2>Aucun joueur dans l\'équipe</h2>';
                }
            }
            this.renderAllChampions();

        } catch (error) {
            console.error('Error loading champion pool:', error);
            if (typeof showToast === 'function') {
                showToast('Erreur lors du chargement du champion pool', 'error');
            }
        }
    }

    // Load team members
    async loadTeamMembers() {
        try {
            // Get team members with their user IDs
            const { data: members, error } = await AppState.supabase
                .from('team_members')
                .select('user_id, role')
                .eq('team_id', this.currentTeam.id);

            if (error) throw error;

            // Get all user IDs including owner
            const userIds = members ? members.map(m => m.user_id) : [];
            const ownerId = this.currentTeam.created_by;
            
            if (ownerId && !userIds.includes(ownerId)) {
                userIds.push(ownerId);
            }

            // Get current user for metadata access
            const { data: { user: currentUser } } = await AppState.supabase.auth.getUser();
            const currentUserMetadata = currentUser?.user_metadata || {};

            // Fetch profiles from table
            if (userIds.length > 0) {
                console.log('Fetching profiles for user IDs:', userIds);
                
                const { data: profiles, error: profileError } = await AppState.supabase
                    .from('profiles')
                    .select('id, pseudo, avatar_url')
                    .in('id', userIds);

                console.log('Profiles query result:', { profiles, profileError });

                if (profileError) throw profileError;

                // Map profiles to members
                const profileMap = {};
                if (profiles && profiles.length > 0) {
                    profiles.forEach(p => {
                        // For current user, use user_metadata.pseudo
                        let displayPseudo = p.pseudo || 'Joueur';
                        if (currentUser && p.id === currentUser.id) {
                            displayPseudo = currentUserMetadata.pseudo || p.pseudo || currentUser.email.split('@')[0];
                        }
                        
                        console.log('Profile found:', { 
                            id: p.id, 
                            pseudo: displayPseudo,
                            isCurrentUser: p.id === currentUser?.id
                        });
                        profileMap[p.id] = { 
                            id: p.id,
                            pseudo: displayPseudo,
                            avatar_url: p.avatar_url 
                        };
                    });
                } else {
                    console.warn('No profiles found for user IDs:', userIds);
                }

                // Add owner profile if missing
                if (ownerId && !profileMap[ownerId]) {
                    if (currentUser && ownerId === currentUser.id) {
                        profileMap[ownerId] = {
                            id: ownerId,
                            pseudo: currentUserMetadata.pseudo || currentUser.email.split('@')[0],
                            avatar_url: currentUserMetadata.avatar_url || null
                        };
                    }
                }

                // Build team members array
                this.teamMembers = [];

                // Add owner first if not in members
                if (ownerId && !members.some(m => m.user_id === ownerId)) {
                    const ownerProfile = profileMap[ownerId];
                    console.log('Adding owner:', { ownerId, profile: ownerProfile });
                    this.teamMembers.push({
                        user_id: ownerId,
                        role: 'owner',
                        profiles: ownerProfile || { id: ownerId, pseudo: 'Owner', avatar_url: null }
                    });
                }

                // Add other members
                members.forEach(member => {
                    const memberProfile = profileMap[member.user_id];
                    console.log('Adding member:', { userId: member.user_id, profile: memberProfile });
                    this.teamMembers.push({
                        ...member,
                        profiles: memberProfile || { id: member.user_id, pseudo: 'Unknown', avatar_url: null }
                    });
                });
            }

            console.log('✓ Team members loaded:', this.teamMembers.length, this.teamMembers);
        } catch (error) {
            console.error('Error loading team members:', error);
        }
    }

    // Load user subscription
    async loadUserSubscription() {
        try {
            const { data: { user } } = await AppState.supabase.auth.getUser();
            if (!user) {
                console.log('No user authenticated');
                this.userSubscription = 'free';
                return;
            }

            console.log('Loading subscription for user:', user.id);

            const { data, error } = await AppState.supabase
                .from('subscriptions')
                .select('plan_type')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .single();

            console.log('Subscription query result:', { data, error });

            if (error && error.code !== 'PGRST116') {
                console.warn('Subscription query error:', error);
                this.userSubscription = 'free';
                return;
            }
            
            this.userSubscription = data?.plan_type || 'free';
            console.log('✓ User subscription loaded:', this.userSubscription);
        } catch (error) {
            console.error('Error loading subscription:', error);
            this.userSubscription = 'free';
        }
    }

    // Load custom tiers
    async loadCustomTiers() {
        try {
            const { data, error } = await AppState.supabase
                .from('lol_custom_tiers')
                .select('*')
                .eq('team_id', this.currentTeam.id)
                .order('position', { ascending: true });

            if (error && error.code !== '42P01') throw error; // Ignore table not exists error
            
            this.customTiers = data || [];
        } catch (error) {
            console.error('Error loading custom tiers:', error);
            this.customTiers = [];
        }
    }

    // Load tier renames
    async loadTierRenames() {
        try {
            const { data, error } = await AppState.supabase
                .from('lol_tier_renames')
                .select('*')
                .eq('team_id', this.currentTeam.id);

            if (error && error.code !== '42P01') throw error; // Ignore table not exists error
            
            if (data && data.length > 0) {
                data.forEach(rename => {
                    if (this.tierLabels[rename.tier_id]) {
                        this.tierLabels[rename.tier_id].name = rename.custom_name;
                    }
                });
                console.log('✓ Tier renames loaded:', data.length);
            }
        } catch (error) {
            console.error('Error loading tier renames:', error);
        }
    }

    // Check if user can create custom tiers (advanced plan or higher)
    canCreateCustomTiers() {
        return ['advanced', 'premium'].includes(this.userSubscription);
    }

    // Check if user can rename tiers (beginner plan or higher)
    canRenameTiers() {
        return ['beginner', 'advanced', 'premium'].includes(this.userSubscription);
    }

    // Create custom tier
    async createCustomTier() {
        if (!this.canCreateCustomTiers()) {
            if (typeof showToast === 'function') {
                showToast('Le plan Advanced ou supérieur est requis pour créer des tiers personnalisés', 'error');
            }
            return;
        }

        const tierName = prompt('Nom du nouveau tier:');
        if (!tierName || !tierName.trim()) return;

        const tierDescription = prompt('Description (optionnelle):') || '';

        try {
            const position = Object.keys(this.tierLabels).length + this.customTiers.length;
            
            const { data, error } = await AppState.supabase
                .from('lol_custom_tiers')
                .insert({
                    team_id: this.currentTeam.id,
                    name: tierName.trim(),
                    description: tierDescription.trim(),
                    position: position
                })
                .select()
                .single();

            if (error) throw error;

            this.customTiers.push(data);
            this.renderPlayerChampionPool();
            
            if (typeof showToast === 'function') {
                showToast(`Tier "${tierName}" créé avec succès`, 'success');
            }
        } catch (error) {
            console.error('Error creating custom tier:', error);
            if (typeof showToast === 'function') {
                showToast('Erreur lors de la création du tier', 'error');
            }
        }
    }

    // Rename tier
    async renameTier(tierId, isCustom = false) {
        if (!this.canRenameTiers()) {
            if (typeof showToast === 'function') {
                showToast('Le plan Beginner ou supérieur est requis pour renommer les tiers', 'error');
            }
            return;
        }

        const currentName = isCustom 
            ? this.customTiers.find(t => t.id === tierId)?.name
            : this.tierLabels[tierId]?.name;

        const newName = prompt('Nouveau nom du tier:', currentName);
        if (!newName || !newName.trim() || newName === currentName) return;

        try {
            if (isCustom) {
                const { error } = await AppState.supabase
                    .from('lol_custom_tiers')
                    .update({ name: newName.trim() })
                    .eq('id', tierId);

                if (error) throw error;

                const tier = this.customTiers.find(t => t.id === tierId);
                if (tier) tier.name = newName.trim();
            } else {
                // Pour les tiers par défaut, on sauvegarde dans lol_tier_renames
                const { error } = await AppState.supabase
                    .from('lol_tier_renames')
                    .upsert({
                        team_id: this.currentTeam.id,
                        tier_id: tierId,
                        custom_name: newName.trim()
                    }, {
                        onConflict: 'team_id,tier_id'
                    });

                if (error) throw error;

                this.tierLabels[tierId].name = newName.trim();
            }

            this.renderPlayerChampionPool();
            
            if (typeof showToast === 'function') {
                showToast(`Tier renommé en "${newName}"`, 'success');
            }
        } catch (error) {
            console.error('Error renaming tier:', error);
            if (typeof showToast === 'function') {
                showToast('Erreur lors du renommage du tier', 'error');
            }
        }
    }

    // Delete custom tier
    async deleteCustomTier(tierId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce tier ? Tous les champions associés seront supprimés.')) {
            return;
        }

        try {
            const { error } = await AppState.supabase
                .from('lol_custom_tiers')
                .delete()
                .eq('id', tierId);

            if (error) throw error;

            this.customTiers = this.customTiers.filter(t => t.id !== tierId);
            this.renderPlayerChampionPool();
            
            if (typeof showToast === 'function') {
                showToast('Tier supprimé', 'success');
            }
        } catch (error) {
            console.error('Error deleting custom tier:', error);
            if (typeof showToast === 'function') {
                showToast('Erreur lors de la suppression du tier', 'error');
            }
        }
    }

    // Render player list in sidebar
    renderPlayerList() {
        const playerList = document.getElementById('all-players');

        if (!playerList) {
            console.error('Player list container not found!');
            return;
        }

        // Clear list
        playerList.innerHTML = '';

        console.log('Rendering players:', this.teamMembers.length);

        if (this.teamMembers.length === 0) {
            playerList.innerHTML = '<p style="color:var(--text-secondary);padding:1rem;">Aucun joueur dans l\'équipe</p>';
            return;
        }

        // Render all players
        this.teamMembers.forEach(member => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.dataset.playerId = member.profiles.id;
            
            // Player name
            const playerName = document.createElement('span');
            playerName.className = 'player-name';
            playerName.textContent = member.profiles.pseudo || 'Joueur sans nom';
            
            // Player role badge
            const roleBadge = document.createElement('span');
            roleBadge.className = 'role-badge';
            const roleText = member.role === 'owner' ? 'Owner' : member.role || 'Player';
            roleBadge.textContent = roleText.charAt(0).toUpperCase() + roleText.slice(1);
            
            playerItem.appendChild(playerName);
            playerItem.appendChild(roleBadge);
            playerList.appendChild(playerItem);
        });
    }

    // Select a player and show their champion pool
    selectPlayer(playerId) {
        this.selectedPlayer = playerId;

        // Update active state in sidebar
        document.querySelectorAll('.player-item').forEach(item => {
            item.classList.toggle('active', item.dataset.playerId === playerId);
        });
    }

    // Select a player and show their champion pool
    selectPlayer(playerId) {
        this.selectedPlayer = playerId;

        // Update active state in sidebar
        document.querySelectorAll('.player-item').forEach(item => {
            item.classList.toggle('active', item.dataset.playerId === playerId);
        });

        // Render champion pool for selected player
        this.renderPlayerChampionPool();
    }

    // Render champion pool for the selected player
    renderPlayerChampionPool() {
        const header = document.querySelector('.champion-pool-player-header');
        const tiersContainer = document.querySelector('.champion-tiers');

        if (!header || !tiersContainer) return;

        // Find player data
        const playerMember = this.teamMembers.find(m => m.profiles.id === this.selectedPlayer);
        if (!playerMember) return;

        // Update header
        header.innerHTML = `
            <h2>${playerMember.profiles.pseudo || 'Player'}</h2>
            ${playerMember.role ? `<span class="player-role-badge">${this.roleLabels[playerMember.role] || playerMember.role}</span>` : ''}
        `;

        // Get player's champions
        const playerChampions = this.championPools.filter(c => c.player_id === this.selectedPlayer);

        // Group by tier (default + custom)
        const championsByTier = {
            S: playerChampions.filter(c => c.tier === 'S'),
            A: playerChampions.filter(c => c.tier === 'A'),
            B: playerChampions.filter(c => c.tier === 'B'),
            C: playerChampions.filter(c => c.tier === 'C')
        };

        // Add custom tiers to championsByTier
        this.customTiers.forEach(tier => {
            championsByTier[tier.id] = playerChampions.filter(c => c.tier === tier.id);
        });

        // Render tiers
        tiersContainer.innerHTML = '';
        
        let tierContainer; // Declare variable
        
        // Render default tiers
        ['S', 'A', 'B', 'C'].forEach(tier => {
            tierContainer = this.createTierElement(tier, this.tierLabels[tier], championsByTier[tier], false);
            tiersContainer.appendChild(tierContainer);
        });

        // Render custom tiers
        this.customTiers.forEach(tier => {
            tierContainer = this.createTierElement(tier.id, { name: tier.name, description: tier.description }, championsByTier[tier.id], true);
            tiersContainer.appendChild(tierContainer);
        });

        // Add "Create New Tier" button (always show, but lock if not advanced plan)
        const canCreate = this.canCreateCustomTiers();
        const createTierContainer = document.createElement('div');
        createTierContainer.className = `tier-container create-tier-container ${!canCreate ? 'locked' : ''}`;
        createTierContainer.innerHTML = `
            <div class="create-tier-button">
                <i class="fas fa-plus"></i>
                <span>Créer un nouveau tier</span>
                ${!canCreate ? '<span class="lock-message"><i class="fas fa-lock"></i> Plan Advanced requis</span>' : ''}
            </div>
        `;
        createTierContainer.addEventListener('click', () => this.createCustomTier());
        tiersContainer.appendChild(createTierContainer);

        // Update all champions grid (dim already selected)
        this.renderAllChampions();
    }

    // Create tier element
    createTierElement(tierId, tierInfo, championsInTier = [], isCustom = false) {
        const tierContainer = document.createElement('div');
        tierContainer.className = 'tier-container';
        tierContainer.dataset.tier = tierId;

        const tierBadgeClass = isCustom ? 'tier-custom' : `tier-${tierId.toLowerCase()}`;
        const tierLabel = isCustom ? tierInfo.name.charAt(0).toUpperCase() : tierId;

        // Rename/Delete buttons (always show rename, show delete only for custom)
        const canRename = this.canRenameTiers();
        const renameTitle = canRename ? 'Renommer' : 'Renommer (Plan Beginner requis)';
        
        const actionsHTML = `
            <div class="tier-actions">
                <button class="tier-action-btn rename-btn ${!canRename ? 'locked' : ''}" data-tier="${tierId}" data-custom="${isCustom}" title="${renameTitle}">
                    <i class="fas fa-edit"></i>
                    ${!canRename ? '<i class="fas fa-lock lock-icon"></i>' : ''}
                </button>
                ${isCustom ? `<button class="tier-action-btn delete-btn" data-tier="${tierId}" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>` : ''}
            </div>
        `;

        tierContainer.innerHTML = `
            <div class="tier-header">
                <div class="tier-badge ${tierBadgeClass}">${tierLabel}</div>
                <div class="tier-info">
                    <h3>${tierInfo.name}</h3>
                    <p>${tierInfo.description || ''}</p>
                </div>
                ${actionsHTML}
            </div>
            <div class="tier-champions-grid" data-tier="${tierId}">
                ${championsInTier && championsInTier.length > 0 ? championsInTier.map(c => `
                    <div class="champion-item" data-champion="${c.champion_name}" data-tier="${tierId}">
                        <div class="champion-avatar">
                            <img src="https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${this.formatChampionName(c.champion_name)}.png" 
                                 alt="${c.champion_name}"
                                 onerror="this.onerror=null; this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; this.parentElement.innerHTML='<span style=\\"color:white;font-size:1.2rem;font-weight:bold;\\">${c.champion_name.charAt(0)}</span>';">
                        </div>
                        <span class="champion-name">${c.champion_name}</span>
                    </div>
                `).join('') : '<div class="drag-placeholder">Drag champions here</div>'}
            </div>
        `;

        // Add event listeners for actions
        const renameBtn = tierContainer.querySelector('.rename-btn');
        if (renameBtn) {
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.renameTier(tierId, isCustom);
            });
        }

        const deleteBtn = tierContainer.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteCustomTier(tierId);
            });
        }

        return tierContainer;
    }

    // Show tier selector modal when adding a champion
    showTierSelector(champion) {
        if (!this.selectedPlayer) {
            if (typeof showToast === 'function') {
                showToast('Veuillez sélectionner un joueur d\'abord', 'error');
            }
            return;
        }

        // Simple prompt for tier selection (you can make this a proper modal)
        const tier = prompt(`Add ${champion} to which tier?\nS = Main\nA = Good\nB = Average\nC = To train\n\nEnter S, A, B, or C:`);
        
        if (tier && ['S', 'A', 'B', 'C'].includes(tier.toUpperCase())) {
            this.addChampionToTier(champion, tier.toUpperCase());
        }
    }

    // Add champion to a tier
    async addChampionToTier(champion, tier) {
        try {
            const { data, error } = await AppState.supabase
                .from('lol_champion_pools')
                .insert({
                    team_id: this.currentTeam.id,
                    player_id: this.selectedPlayer,
                    champion_name: champion,
                    tier: tier
                })
                .select();

            if (error) {
                if (error.code === '23505') { // Unique constraint violation
                    if (typeof showToast === 'function') {
                        showToast('Ce champion est déjà dans le pool de ce joueur', 'error');
                    }
                } else {
                    throw error;
                }
                return;
            }

            this.championPools.push(data[0]);
            this.renderPlayerChampionPool();
            if (typeof showToast === 'function') {
                showToast(`${champion} ajouté au Tier ${tier}`, 'success');
            }

        } catch (error) {
            console.error('Error adding champion:', error);
            if (typeof showToast === 'function') {
                showToast('Erreur lors de l\'ajout du champion', 'error');
            }
        }
    }

    // Remove champion from tier
    async removeChampionFromTier(champion, tier) {
        try {
            const { error } = await AppState.supabase
                .from('lol_champion_pools')
                .delete()
                .eq('team_id', this.currentTeam.id)
                .eq('player_id', this.selectedPlayer)
                .eq('champion_name', champion)
                .eq('tier', tier);

            if (error) throw error;

            // Update local data
            this.championPools = this.championPools.filter(c => 
                !(c.player_id === this.selectedPlayer && c.champion_name === champion && c.tier === tier)
            );

            this.renderPlayerChampionPool();
            if (typeof showToast === 'function') {
                showToast(`${champion} retiré du Tier ${tier}`, 'success');
            }

        } catch (error) {
            console.error('Error removing champion:', error);
            if (typeof showToast === 'function') {
                showToast('Erreur lors de la suppression du champion', 'error');
            }
        }
    }

    // Setup drag and drop functionality
    setupDragAndDrop() {
        document.addEventListener('dragstart', (e) => {
            if (e.target.closest('.champion-selector-item')) {
                const item = e.target.closest('.champion-selector-item');
                if (!item.classList.contains('dimmed')) {
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('champion', item.dataset.champion);
                    item.style.opacity = '0.5';
                }
            }
        });

        document.addEventListener('dragend', (e) => {
            if (e.target.closest('.champion-selector-item')) {
                e.target.closest('.champion-selector-item').style.opacity = '1';
            }
        });

        document.addEventListener('dragover', (e) => {
            if (e.target.closest('.tier-champions-grid')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                e.target.closest('.tier-container').style.borderColor = 'var(--primary-color)';
            }
        });

        document.addEventListener('dragleave', (e) => {
            if (e.target.closest('.tier-container')) {
                e.target.closest('.tier-container').style.borderColor = '';
            }
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            const tierContainer = e.target.closest('.tier-container');
            console.log('Drop event:', { tierContainer, target: e.target });
            if (tierContainer) {
                tierContainer.style.borderColor = '';
                const champion = e.dataTransfer.getData('champion');
                const tier = tierContainer.dataset.tier;
                console.log('Drop data:', { champion, tier, selectedPlayer: this.selectedPlayer });
                if (champion && tier && this.selectedPlayer) {
                    console.log('Adding champion to tier...');
                    this.addChampionToTier(champion, tier);
                } else {
                    console.warn('Missing data for drop:', { champion, tier, selectedPlayer: this.selectedPlayer });
                }
            }
        });
    }

    // Render all champions grid at bottom
    renderAllChampions() {
        const grid = document.querySelector('.all-champions-grid');
        if (!grid) return;

        const roleFilter = document.getElementById('role-filter')?.value || 'all';
        const searchQuery = document.getElementById('champion-search-input')?.value.toLowerCase() || '';

        // Get already selected champions for current player
        const selectedChampions = this.selectedPlayer ? 
            this.championPools.filter(c => c.player_id === this.selectedPlayer).map(c => c.champion_name) : 
            [];

        // Filter champions
        let filteredChampions = this.champions;

        if (searchQuery) {
            filteredChampions = filteredChampions.filter(c => c.toLowerCase().includes(searchQuery));
        }

        // Render champions
        grid.innerHTML = filteredChampions.map(champion => {
            const isSelected = selectedChampions.includes(champion);
            const draggableAttr = isSelected ? '' : 'draggable="true"';
            return `
                <div class="champion-selector-item ${isSelected ? 'dimmed' : ''}" data-champion="${champion}" ${draggableAttr}>
                    <div class="champion-avatar">
                        <img src="https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${this.formatChampionName(champion)}.png" 
                             alt="${champion}"
                             onerror="this.onerror=null; this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; this.parentElement.innerHTML='<span style=\"color:white;font-size:1.2rem;font-weight:bold;\">${champion.charAt(0)}</span>';">
                    </div>
                    <span class="champion-name">${champion}</span>
                </div>
            `;
        }).join('');
    }

    // Format champion name for Riot API (handle special cases)
    formatChampionName(name) {
        // Special cases for Riot API
        const specialCases = {
            "Wukong": "MonkeyKing",
            "Dr. Mundo": "DrMundo",
            "Aurelion Sol": "AurelionSol",
            "Jarvan IV": "JarvanIV",
            "Twisted Fate": "TwistedFate",
            "Lee Sin": "LeeSin",
            "Master Yi": "MasterYi",
            "Miss Fortune": "MissFortune",
            "Tahm Kench": "TahmKench",
            "Xin Zhao": "XinZhao",
            "Renata Glasc": "Renata",
            "Nunu": "Nunu"
        };

        if (specialCases[name]) {
            return specialCases[name];
        }

        // Remove all non-alphanumeric characters (spaces, apostrophes, dots)
        return name.replace(/[^a-zA-Z0-9]/g, '');
    }

    // ==================== COMPOSITIONS ====================
    // (Keep existing compositions code from original file)
    initCompositions() {
        // TODO: Implement compositions functionality
        console.log('Compositions initialized');
    }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    window.lolManager = new LeagueOfLegendsManager();
}
