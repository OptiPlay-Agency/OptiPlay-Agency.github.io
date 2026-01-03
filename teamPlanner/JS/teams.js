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

  // Generate invitation code (not link)
  async generateInviteCode() {
    try {
      const inviteCode = this.generateRandomCode();
      
      // Définir expiration à 24h
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const { data, error } = await AppState.supabase
        .from('invitation_links')
        .insert({
          team_id: AppState.currentTeam.id,
          invite_code: inviteCode,
          created_by: AppState.currentUser.id,
          expires_at: expiresAt.toISOString(),
          max_uses: null
        })
        .select()
        .single();

      if (error) throw error;

      // Afficher le code dans un modal/alert simple
      this.showInviteCodeModal(inviteCode, expiresAt);
      
      return inviteCode;
    } catch (error) {
      console.error('Error generating invite code:', error);
      showToast('Erreur lors de la génération du code', 'error');
    }
  },

  // Show invite code modal
  showInviteCodeModal(inviteCode, expiresAt) {
    // Formater la date d'expiration
    const expirationText = expiresAt.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Créer un modal simple pour afficher le code
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    modal.innerHTML = `
      <div style="
        background: var(--bg-primary);
        padding: 2rem;
        border-radius: 12px;
        border: 2px solid var(--primary-color);
        max-width: 450px;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      ">
        <h3 style="color: var(--primary-color); margin: 0 0 1rem 0;">
          <i class="fas fa-key"></i> Code d'invitation
        </h3>
        <p style="margin: 0 0 1rem 0; color: var(--text-muted);">
          Partagez ce code avec la personne à inviter :
        </p>
        <div style="
          background: var(--bg-darker);
          padding: 1rem;
          border-radius: 8px;
          font-family: monospace;
          font-size: 1.2rem;
          font-weight: bold;
          color: var(--primary-color);
          margin: 1rem 0;
          border: 2px dashed var(--primary-color);
          user-select: all;
          cursor: pointer;
        " onclick="navigator.clipboard.writeText('${inviteCode}'); showToast('Code copié !', 'success');">
          ${inviteCode}
        </div>
        <div style="
          background: rgba(255, 193, 7, 0.1);
          border: 1px solid #ffc107;
          border-radius: 6px;
          padding: 0.75rem;
          margin: 1rem 0;
        ">
          <p style="margin: 0; font-size: 0.9rem; color: #ffc107;">
            <i class="fas fa-clock"></i> <strong>Expire le ${expirationText}</strong>
          </p>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: var(--text-muted);">
            Le code sera automatiquement supprimé dans 24h
          </p>
        </div>
        <p style="margin: 0 0 1.5rem 0; font-size: 0.9rem; color: var(--text-muted);">
          <i class="fas fa-info-circle"></i> Cliquez sur le code pour le copier
        </p>
        <button onclick="this.closest('div').parentElement.remove()" style="
          background: var(--primary-color);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
        ">
          <i class="fas fa-times"></i> Fermer
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Copier automatiquement
    navigator.clipboard.writeText(inviteCode);
    showToast('Code d\'invitation généré et copié !', 'success');
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

    // Load user profile first
    let userProfile = null;
    try {
      const { data: profile, error } = await AppState.supabase
        .from('profiles')
        .select('*')
        .eq('id', AppState.currentUser.id)
        .single();
      
      if (!error) {
        userProfile = profile;
      }
    } catch (error) {
      console.warn('Could not load user profile:', error);
    }

    // Team settings form
    teamSettings.innerHTML = `
      <div class="settings-section">
        <h4><i class="fas fa-user"></i> Paramètres du profil</h4>
        <form id="update-profile-form" style="margin-bottom: 2rem;">
          <div class="form-group">
            <label for="edit-pseudo">Pseudo</label>
            <input type="text" id="edit-pseudo" value="${userProfile?.pseudo || ''}" placeholder="Votre pseudo">
          </div>
          <div class="form-group">
            <label for="edit-first-name">Prénom</label>
            <input type="text" id="edit-first-name" value="${userProfile?.first_name || ''}" placeholder="Votre prénom">
          </div>
          <div class="form-group">
            <label for="edit-last-name">Nom</label>
            <input type="text" id="edit-last-name" value="${userProfile?.last_name || ''}" placeholder="Votre nom">
          </div>
          <div class="form-group">
            <label for="edit-company">Entreprise</label>
            <input type="text" id="edit-company" value="${userProfile?.company || ''}" placeholder="Votre entreprise (optionnel)">
          </div>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i>
            Mettre à jour le profil
          </button>
        </form>
      </div>

      <div class="settings-section">
        <h4><i class="fas fa-users"></i> Informations de l'équipe</h4>
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
      </div>
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
    const updateProfileForm = document.getElementById('update-profile-form');
    if (updateProfileForm) {
      updateProfileForm.addEventListener('submit', (e) => this.handleUpdateProfile(e));
    }

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

  // Update user profile
  async handleUpdateProfile(e) {
    e.preventDefault();
    
    const pseudo = document.getElementById('edit-pseudo').value;
    const firstName = document.getElementById('edit-first-name').value;
    const lastName = document.getElementById('edit-last-name').value;
    const company = document.getElementById('edit-company').value;

    try {
      // Upsert profile (create if not exists, update if exists)
      const { error } = await AppState.supabase
        .from('profiles')
        .upsert({
          id: AppState.currentUser.id,
          email: AppState.currentUser.email,
          pseudo,
          first_name: firstName,
          last_name: lastName,
          company: company || null,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update AppState with new profile data
      AppState.currentProfile = {
        ...AppState.currentProfile,
        pseudo,
        first_name: firstName,
        last_name: lastName,
        company: company || null
      };

      showToast('Profil mis à jour avec succès', 'success');
      
      // Update user name display
      const displayName = pseudo || `${firstName} ${lastName}`.trim() || 'Utilisateur';
      document.getElementById('user-name').textContent = displayName;
      
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Erreur lors de la mise à jour du profil', 'error');
    }
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
    inviteBtn.addEventListener('click', () => TeamManager.generateInviteCode());
  }
});

// Export
window.TeamManager = TeamManager;
