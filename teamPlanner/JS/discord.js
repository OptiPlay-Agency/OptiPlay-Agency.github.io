// =====================================================
// DISCORD MANAGER - Discord Integration Module
// =====================================================

const DiscordManager = {
  connectedAccount: null,
  linkedGuild: null,

  // Connect Discord (OAuth2)
  async connectDiscord() {
    showToast('Intégration Discord à venir dans une prochaine version', 'info');
    
    // TODO: Implement Discord OAuth2 flow
    // 1. Redirect to Discord OAuth
    // 2. Handle callback
    // 3. Store tokens in discord_accounts table
    // 4. Allow guild/channel selection
    // 5. Setup webhooks for notifications
    
    /*
    const DISCORD_CLIENT_ID = 'YOUR_DISCORD_CLIENT_ID';
    const REDIRECT_URI = encodeURIComponent(window.location.origin + '/discord-callback');
    const DISCORD_OAUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify%20guilds`;
    
    window.location.href = DISCORD_OAUTH_URL;
    */
  },

  // Load Discord account
  async loadDiscordAccount() {
    try {
      const { data, error } = await AppState.supabase
        .from('discord_accounts')
        .select('*')
        .eq('user_id', AppState.currentUser.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No account found
          this.connectedAccount = null;
          return null;
        }
        throw error;
      }

      this.connectedAccount = data;
      return data;
    } catch (error) {
      console.error('Error loading Discord account:', error);
      return null;
    }
  },

  // Load team Discord link
  async loadTeamDiscordLink(teamId) {
    try {
      const { data, error } = await AppState.supabase
        .from('team_discord_links')
        .select('*')
        .eq('team_id', teamId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No link found
          this.linkedGuild = null;
          return null;
        }
        throw error;
      }

      this.linkedGuild = data;
      return data;
    } catch (error) {
      console.error('Error loading team Discord link:', error);
      return null;
    }
  },

  // Send notification to Discord
  async sendNotification(teamId, message) {
    try {
      const link = await this.loadTeamDiscordLink(teamId);
      
      if (!link || !link.notifications_enabled) {
        console.log('Discord notifications not enabled for this team');
        return;
      }

      // TODO: Send webhook message to Discord channel
      // Use Discord webhook API or bot API
      
      console.log('Discord notification would be sent:', message);
      
    } catch (error) {
      console.error('Error sending Discord notification:', error);
    }
  },

  // Create event notification
  createEventNotification(event) {
    return {
      embeds: [{
        title: `📅 Nouvel événement: ${event.title}`,
        description: event.description || 'Aucune description',
        color: 0x0038ff,
        fields: [
          {
            name: 'Début',
            value: new Date(event.start_time).toLocaleString('fr-FR'),
            inline: true
          },
          {
            name: 'Fin',
            value: new Date(event.end_time).toLocaleString('fr-FR'),
            inline: true
          },
          {
            name: 'Type',
            value: event.event_type || 'Autre',
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'OptiPlay Manager'
        }
      }]
    };
  }
};

// Export
window.DiscordManager = DiscordManager;
