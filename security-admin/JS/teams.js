// Team Management for Admin Panel

class TeamManager {
    constructor() {
        this.currentPage = 1;
        this.teamsPerPage = 15;
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.teams = [];
        this.totalTeams = 0;
        
        this.initializeTeamManagement();
    }

    async initializeTeamManagement() {
        console.log('Initializing Team Management...');
        
        // Setup search and filters for the modal
        this.setupTeamsModalControls();
        
        // Load team stats for dashboard
        await this.loadTeamStats();
        
        // Load recent teams preview
        await this.loadRecentTeams();
    }

    setupTeamsModalControls() {
        // Setup search
        const searchInput = document.getElementById('teamSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentSearch = e.target.value;
                this.loadTeams(1);
            });
        }

        // Setup filter
        const filterSelect = document.getElementById('teamFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.loadTeams(1);
            });
        }
    }

    async loadTeamStats() {
        try {
            console.log('Loading team statistics...');

            // Get total teams count
            const { count: totalTeamsCount, error: teamsError } = await window.AdminState.supabase
                .from('teams')
                .select('*', { count: 'exact', head: true });

            if (teamsError) throw teamsError;

            // Get total team members count
            const { count: membersCount, error: membersError } = await window.AdminState.supabase
                .from('team_members')
                .select('*', { count: 'exact', head: true });

            if (membersError) throw membersError;

            // Get active teams (teams with members)
            const { data: activeTeamsData, error: activeError } = await window.AdminState.supabase
                .from('teams')
                .select('id, team_members(count)')
                .not('team_members', 'is', null);

            if (activeError) throw activeError;

            // Update UI
            document.getElementById('totalTeams').textContent = totalTeamsCount || 0;
            document.getElementById('totalTeamMembers').textContent = membersCount || 0;
            document.getElementById('activeTeams').textContent = activeTeamsData?.length || 0;

        } catch (error) {
            console.error('Error loading team stats:', error);
            document.getElementById('totalTeams').textContent = '?';
            document.getElementById('totalTeamMembers').textContent = '?';
            document.getElementById('activeTeams').textContent = '?';
        }
    }

    async loadRecentTeams() {
        try {
            console.log('Loading recent teams...');

            // First get teams without complex joins
            const { data: teams, error } = await window.AdminState.supabase
                .from('teams')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            // Then get member counts for each team
            if (teams && teams.length > 0) {
                for (const team of teams) {
                    try {
                        const { count } = await window.AdminState.supabase
                            .from('team_members')
                            .select('*', { count: 'exact', head: true })
                            .eq('team_id', team.id);
                        
                        team.member_count = count || 0;
                    } catch (memberError) {
                        console.log('Could not load member count for team:', team.id);
                        team.member_count = 0;
                    }
                }
            }

            this.renderRecentTeamsList(teams || []);

        } catch (error) {
            console.error('Error loading recent teams:', error);
            const container = document.getElementById('recentTeamsList');
            if (container) {
                container.innerHTML = '<p class="error-message">Impossible de charger les équipes récentes</p>';
            }
        }
    }

    renderRecentTeamsList(teams) {
        const container = document.getElementById('recentTeamsList');
        if (!container) return;

        if (teams.length === 0) {
            container.innerHTML = '<p class="empty-message">Aucune équipe trouvée</p>';
            return;
        }

        const html = teams.map(team => `
            <div class="team-preview-card" onclick="teamManager.viewTeamDetails('${team.id}')">
                <div class="team-info">
                    <h4>${team.name}</h4>
                    <p><i class="fas fa-gamepad"></i> ${team.game_type || 'Non spécifié'}</p>
                    <p><i class="fas fa-users"></i> ${team.member_count || 0} membres</p>
                </div>
                <div class="team-date">
                    <small>${new Date(team.created_at).toLocaleDateString('fr-FR')}</small>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    async openTeamsModal() {
        // Show modal
        const modal = document.getElementById('teamsModal');
        if (modal) {
            modal.classList.add('active');
        }

        // Load teams data
        await this.loadTeams(1);
    }

    async loadTeams(page = 1) {
        try {
            console.log('Loading teams, page:', page, 'filter:', this.currentFilter, 'search:', this.currentSearch);
            
            this.currentPage = page;
            const offset = (page - 1) * this.teamsPerPage;

            // Build query - simplified without complex joins
            let query = window.AdminState.supabase
                .from('teams')
                .select('*', { count: 'exact' })
                .range(offset, offset + this.teamsPerPage - 1)
                .order('created_at', { ascending: false });

            // Apply search filter
            if (this.currentSearch && this.currentSearch.trim()) {
                query = query.ilike('name', `%${this.currentSearch}%`);
            }

            // Apply game filter
            if (this.currentFilter && this.currentFilter !== 'all') {
                query = query.eq('game_type', this.currentFilter);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            this.teams = data || [];
            this.totalTeams = count || 0;

            // Load member counts for each team
            if (this.teams.length > 0) {
                for (const team of this.teams) {
                    try {
                        const { count: memberCount } = await window.AdminState.supabase
                            .from('team_members')
                            .select('*', { count: 'exact', head: true })
                            .eq('team_id', team.id);
                        
                        team.member_count = memberCount || 0;
                    } catch (memberError) {
                        console.log('Could not load member count for team:', team.id);
                        team.member_count = 0;
                    }
                }
            }

            console.log('Loaded teams:', this.teams.length, 'Total:', this.totalTeams);

            this.renderTeamsTable();
            this.renderTeamsPagination();

        } catch (error) {
            console.error('Error loading teams:', error);
            const tbody = document.getElementById('teamsTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="error-message">Erreur lors du chargement des équipes</td></tr>';
            }
        }
    }

    renderTeamsTable() {
        const tbody = document.getElementById('teamsTableBody');
        if (!tbody) return;

        if (this.teams.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        <i class="fas fa-users-cog" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                        <div>Aucune équipe trouvée</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.teams.map(team => this.renderTeamRow(team)).join('');
    }

    renderTeamRow(team) {
        const memberCount = team.member_count || 0;
        const gameType = team.game_type || 'Non spécifié';
        const status = memberCount > 0 ? 'active' : 'inactive';
        
        return `
            <tr data-team-id="${team.id}">
                <td>
                    <div class="team-info">
                        <div class="team-avatar">
                            <i class="fas fa-users-cog"></i>
                        </div>
                        <div class="team-details">
                            <h4>${team.name}</h4>
                            <span>ID: ${team.id.substring(0, 8)}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="game-badge ${gameType.toLowerCase().replace(' ', '_')}">
                        <i class="fas fa-gamepad"></i>
                        ${gameType}
                    </span>
                </td>
                <td>
                    <span class="member-count">
                        <i class="fas fa-users"></i>
                        ${memberCount}
                    </span>
                </td>
                <td>${new Date(team.created_at).toLocaleDateString('fr-FR')}</td>
                <td>
                    <span class="status-badge ${status === 'active' ? 'status-active' : 'status-inactive'}">
                        ${status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="teamManager.viewTeamDetails('${team.id}')" title="Voir les détails">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="teamManager.editTeam('${team.id}')" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon danger" onclick="teamManager.deleteTeam('${team.id}')" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    renderTeamsPagination() {
        const paginationContainer = document.getElementById('teamsPagination');
        if (!paginationContainer) return;

        const totalPages = Math.ceil(this.totalTeams / this.teamsPerPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination-info">';
        paginationHTML += `<span>Page ${this.currentPage} sur ${totalPages} (${this.totalTeams} équipes)</span>`;
        paginationHTML += '</div><div class="pagination-controls">';

        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `<button onclick="teamManager.loadTeams(${this.currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
        }

        // Page numbers
        for (let i = Math.max(1, this.currentPage - 2); i <= Math.min(totalPages, this.currentPage + 2); i++) {
            paginationHTML += `<button class="${i === this.currentPage ? 'active' : ''}" onclick="teamManager.loadTeams(${i})">${i}</button>`;
        }

        // Next button
        if (this.currentPage < totalPages) {
            paginationHTML += `<button onclick="teamManager.loadTeams(${this.currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
        }

        paginationHTML += '</div>';
        paginationContainer.innerHTML = paginationHTML;
    }

    async viewTeamDetails(teamId) {
        try {
            console.log('Loading team details for:', teamId);

            // First get team basic info
            const { data: team, error: teamError } = await window.AdminState.supabase
                .from('teams')
                .select('*')
                .eq('id', teamId)
                .single();

            if (teamError) throw teamError;

            // Then get team members
            const { data: members, error: membersError } = await window.AdminState.supabase
                .from('team_members')
                .select('*')
                .eq('team_id', teamId);

            if (membersError) {
                console.error('Error loading team members:', membersError);
                team.team_members = [];
            } else {
                // Get profile info for each member
                team.team_members = [];
                if (members && members.length > 0) {
                    for (const member of members) {
                        try {
                            const { data: profile } = await window.AdminState.supabase
                                .from('profiles')
                                .select('*')
                                .eq('id', member.user_id)
                                .single();
                            
                            team.team_members.push({
                                ...member,
                                profiles: profile
                            });
                        } catch (profileError) {
                            console.log('Could not load profile for member:', member.user_id);
                            team.team_members.push({
                                ...member,
                                profiles: null
                            });
                        }
                    }
                }
            }

            this.showTeamDetailsModal(team);

        } catch (error) {
            console.error('Error loading team details:', error);
            alert('Erreur lors du chargement des détails de l\'équipe: ' + error.message);
        }
    }

    showTeamDetailsModal(team) {
        const modal = document.getElementById('teamDetailsModal');
        const title = document.getElementById('teamDetailsTitle');
        const body = document.getElementById('teamDetailsBody');

        if (!modal || !title || !body) return;

        title.textContent = `Équipe ${team.name}`;
        body.innerHTML = this.renderTeamDetailsContent(team);

        modal.classList.add('active');
    }

    renderTeamDetailsContent(team) {
        const members = team.team_members || [];
        
        return `
            <div class="team-details-content">
                <div class="team-header">
                    <h3>${team.name}</h3>
                    <div class="team-meta">
                        <span class="meta-item">
                            <i class="fas fa-gamepad"></i>
                            ${team.game_type || 'Non spécifié'}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-calendar"></i>
                            Créée le ${new Date(team.created_at).toLocaleDateString('fr-FR')}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-users"></i>
                            ${members.length} membre(s)
                        </span>
                    </div>
                </div>

                <div class="team-members-section">
                    <h4><i class="fas fa-users"></i> Membres de l'équipe</h4>
                    ${members.length === 0 ? 
                        '<p class="empty-message">Cette équipe n\'a aucun membre</p>' :
                        `<div class="members-list">
                            ${members.map(member => `
                                <div class="member-card">
                                    <div class="member-avatar">
                                        <i class="fas fa-user"></i>
                                    </div>
                                    <div class="member-info">
                                        <h5>${member.profiles?.phone || 'Utilisateur inconnu'}</h5>
                                        <p class="member-role">
                                            <i class="fas fa-crown"></i>
                                            ${member.role || 'Membre'}
                                        </p>
                                        <p class="member-joined">
                                            <i class="fas fa-calendar"></i>
                                            Rejoint le ${new Date(member.joined_at).toLocaleDateString('fr-FR')}
                                        </p>
                                        ${member.profiles?.phone ? 
                                            `<p class="member-phone">
                                                <i class="fas fa-phone"></i>
                                                ${member.profiles.phone}
                                            </p>` : ''
                                        }
                                    </div>
                                    <div class="member-actions">
                                        <button class="btn-icon" onclick="teamManager.viewMember('${member.profiles?.id}')" title="Voir le profil">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn-icon danger" onclick="teamManager.removeMember('${member.id}')" title="Retirer de l'équipe">
                                            <i class="fas fa-user-times"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>`
                    }
                </div>

                <div class="team-actions">
                    <button class="btn btn-secondary" onclick="closeModal('teamDetailsModal')">
                        Fermer
                    </button>
                    <button class="btn btn-primary" onclick="teamManager.editTeam('${team.id}')">
                        <i class="fas fa-edit"></i>
                        Modifier l'équipe
                    </button>
                    <button class="btn btn-danger" onclick="teamManager.deleteTeam('${team.id}')">
                        <i class="fas fa-trash"></i>
                        Supprimer l'équipe
                    </button>
                </div>
            </div>
        `;
    }

    async editTeam(teamId) {
        alert('Fonctionnalité d\'édition d\'équipe en cours de développement');
    }

    async deleteTeam(teamId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette équipe ? Cette action est irréversible.')) return;
        
        try {
            const { error } = await window.AdminState.supabase
                .from('teams')
                .delete()
                .eq('id', teamId);

            if (error) throw error;

            alert('Équipe supprimée avec succès');
            
            // Refresh the teams list
            await this.loadTeams(this.currentPage);
            await this.loadTeamStats();
            await this.loadRecentTeams();
            
            // Close modals if open
            closeModal('teamDetailsModal');

        } catch (error) {
            console.error('Error deleting team:', error);
            alert('Erreur lors de la suppression de l\'équipe: ' + error.message);
        }
    }

    async removeMember(memberId) {
        if (!confirm('Êtes-vous sûr de vouloir retirer ce membre de l\'équipe ?')) return;
        
        try {
            const { error } = await window.AdminState.supabase
                .from('team_members')
                .delete()
                .eq('id', memberId);

            if (error) throw error;

            alert('Membre retiré avec succès');
            
            // Refresh data
            await this.loadTeams(this.currentPage);
            await this.loadTeamStats();
            
            // Close and reopen team details to refresh
            closeModal('teamDetailsModal');

        } catch (error) {
            console.error('Error removing team member:', error);
            alert('Erreur lors de la suppression du membre: ' + error.message);
        }
    }

    async viewMember(userId) {
        // Use the existing user manager to view user details
        if (window.userManager) {
            closeModal('teamDetailsModal');
            await window.userManager.viewUser(userId);
        }
    }
}

// Initialize team manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window !== 'undefined') {
        window.teamManager = new TeamManager();
    }
});