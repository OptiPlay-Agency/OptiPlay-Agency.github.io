// =====================================================
// TEAMS MANAGER - Team Management Module
// =====================================================

const TeamManager = {
  members: [],
  currentTeamData: null,

  // Load team members
  async loadMembers(teamId) {
    try {
      // Use RPC function to get members with user info
      const { data, error } = await AppState.supabase
        .rpc('get_team_members_with_info', { p_team_id: teamId });

      if (error) throw error;

      this.members = data.map(member => ({
        ...member,
        user_pseudo: member.user_pseudo || 'Membre #' + member.user_id.substring(0, 4),
        user_name: member.user_pseudo || 'Membre'
      }));

      return this.members;
    } catch (error) {
      console.error('Error loading members:', error);
      this.members = [];
      return [];
    }
  },

  // Render members view
  async renderMembers() {
    const container = document.getElementById('members-grid');
    if (!container) return;

    if (this.members.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;">Aucun membre dans cette équipe</p>';
      return;
    }

    container.innerHTML = this.members.map(member => `
      <div class="member-card">
        <div class="member-avatar">
          <i class="fas fa-user"></i>
        </div>
        <div class="member-name">${member.user_pseudo || member.user_name}</div>
        <span class="member-role ${member.role}">${this.getRoleLabel(member.role)}</span>
        ${this.canManageMembers() && member.user_id !== AppState.currentUser.id ? `
          <div style="margin-top:1rem;display:flex;gap:0.5rem;justify-content:center;">
            <button class="btn btn-secondary" style="padding:0.5rem 1rem;font-size:0.85rem;" onclick="TeamManager.changeRole('${member.id}')">
              <i class="fas fa-exchange-alt"></i>
            </button>
            <button class="btn btn-danger" style="padding:0.5rem 1rem;font-size:0.85rem;" onclick="TeamManager.removeMember('${member.id}')">
              <i class="fas fa-user-times"></i>
            </button>
          </div>
        ` : ''}
      </div>
    `).join('');
  },

  // Get role label
  getRoleLabel(role) {
    const labels = {
      'owner': 'Propriétaire',
      'coach': 'Coach',
      'joueur': 'Joueur'
    };
    return labels[role] || role;
  },

  // Check if current user can manage members
  canManageMembers() {
    return AppState.currentTeam?.userRole === 'owner' || AppState.currentTeam?.userRole === 'coach';
  },

  // Generate invitation link
  async generateInviteLink() {
    try {
      const inviteCode = this.generateRandomCode();
      
      const { data, error } = await AppState.supabase
        .from('invitation_links')
        .insert({
          team_id: AppState.currentTeam.id,
          invite_code: inviteCode,
          created_by: AppState.currentUser.id,
          expires_at: null,
          max_uses: null
        })
        .select()
        .single();

      if (error) throw error;

      const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${inviteCode}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(inviteUrl);
      showToast('Lien d\'invitation copié !', 'success');
      
      return inviteUrl;
    } catch (error) {
      console.error('Error generating invite link:', error);
      showToast('Erreur lors de la génération du lien', 'error');
    }
  },

  // Generate random code
  generateRandomCode() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  },

  // Render settings
  async renderSettings() {
    const teamSettings = document.getElementById('team-settings-form');
    const discordSettings = document.getElementById('discord-settings');
    const dangerZone = document.getElementById('danger-zone');

    if (!AppState.currentTeam) return;

    // Team settings form
    teamSettings.innerHTML = `
      <form id="update-team-form">
        <div class="form-group">
          <label for="edit-team-name">Nom de l'équipe</label>
          <input type="text" id="edit-team-name" value="${AppState.currentTeam.name}" ${this.canManageTeam() ? '' : 'disabled'}>
        </div>
        <div class="form-group">
          <label for="edit-team-description">Description</label>
          <textarea id="edit-team-description" rows="4" ${this.canManageTeam() ? '' : 'disabled'}>${AppState.currentTeam.description || ''}</textarea>
        </div>
        ${this.canManageTeam() ? `
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i>
            Enregistrer les modifications
          </button>
        ` : ''}
      </form>
    `;

    // Discord settings
    discordSettings.innerHTML = `
      <p style="color:var(--text-muted);margin-bottom:1rem;">Connectez votre serveur Discord pour recevoir des notifications automatiques.</p>
      <button class="btn btn-primary" onclick="DiscordManager.connectDiscord()">
        <i class="fab fa-discord"></i>
        Connecter Discord
      </button>
    `;

    // Danger zone
    const deleteBtn = document.getElementById('delete-team-btn');
    if (AppState.currentTeam.userRole === 'owner') {
      deleteBtn.style.display = 'inline-flex';
    }

    // Event listeners
    const updateForm = document.getElementById('update-team-form');
    if (updateForm) {
      updateForm.addEventListener('submit', (e) => this.handleUpdateTeam(e));
    }

    document.getElementById('leave-team-btn').onclick = () => this.leaveTeam();
    deleteBtn.onclick = () => this.deleteTeam();
  },

  // Can manage team
  canManageTeam() {
    return AppState.currentTeam?.userRole === 'owner';
  },

  // Update team
  async handleUpdateTeam(e) {
    e.preventDefault();
    
    const name = document.getElementById('edit-team-name').value;
    const description = document.getElementById('edit-team-description').value;

    try {
      const { error } = await AppState.supabase
        .from('teams')
        .update({
          name,
          description
        })
        .eq('id', AppState.currentTeam.id);

      if (error) throw error;

      AppState.currentTeam.name = name;
      AppState.currentTeam.description = description;

      showToast('Équipe mise à jour avec succès', 'success');
      
      // Update UI
      document.getElementById('current-team-name').textContent = name;
      await loadUserTeams();
      
    } catch (error) {
      console.error('Error updating team:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    }
  },

  // Leave team
  async leaveTeam() {
    if (!confirm('Êtes-vous sûr de vouloir quitter cette équipe ?')) return;

    try {
      const { error } = await AppState.supabase
        .from('team_members')
        .delete()
        .eq('team_id', AppState.currentTeam.id)
        .eq('user_id', AppState.currentUser.id);

      if (error) throw error;

      showToast('Vous avez quitté l\'équipe', 'success');
      
      // Reload teams
      await loadUserTeams();
      
      // Show no team view
      AppState.currentTeam = null;
      showNoTeamView();
      
    } catch (error) {
      console.error('Error leaving team:', error);
      showToast('Erreur lors de la sortie de l\'équipe', 'error');
    }
  },

  // Delete team
  async deleteTeam() {
    if (!confirm('⚠️ ATTENTION : Êtes-vous sûr de vouloir SUPPRIMER cette équipe ? Cette action est IRRÉVERSIBLE.')) return;

    try {
      const { error } = await AppState.supabase
        .from('teams')
        .delete()
        .eq('id', AppState.currentTeam.id);

      if (error) throw error;

      showToast('Équipe supprimée avec succès', 'success');
      
      // Reload teams
      await loadUserTeams();
      
      // Show no team view
      AppState.currentTeam = null;
      showNoTeamView();
      
    } catch (error) {
      console.error('Error deleting team:', error);
      showToast('Erreur lors de la suppression', 'error');
    }
  },

  // Remove member
  async removeMember(memberId) {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce membre ?')) return;

    try {
      const { error } = await AppState.supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      showToast('Membre retiré avec succès', 'success');
      
      // Reload members
      await this.loadMembers(AppState.currentTeam.id);
      await this.renderMembers();
      
    } catch (error) {
      console.error('Error removing member:', error);
      showToast('Erreur lors du retrait du membre', 'error');
    }
  },

  // Change role
  async changeRole(memberId) {
    const member = this.members.find(m => m.id === memberId);
    if (!member) return;

    const newRole = prompt(`Nouveau rôle pour ${member.user_name} (owner/coach/joueur):`, member.role);
    if (!newRole || !['owner', 'coach', 'joueur'].includes(newRole)) {
      showToast('Rôle invalide', 'error');
      return;
    }

    try {
      const { error } = await AppState.supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      showToast('Rôle modifié avec succès', 'success');
      
      // Reload members
      await this.loadMembers(AppState.currentTeam.id);
      await this.renderMembers();
      
    } catch (error) {
      console.error('Error changing role:', error);
      showToast('Erreur lors du changement de rôle', 'error');
    }
  }
};

// Setup invite button listener
document.addEventListener('DOMContentLoaded', () => {
  const inviteBtn = document.getElementById('invite-member-btn');
  if (inviteBtn) {
    inviteBtn.addEventListener('click', () => TeamManager.generateInviteLink());
  }
});

// Export
window.TeamManager = TeamManager;
