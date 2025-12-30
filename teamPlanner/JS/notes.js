// =====================================================
// NOTES MANAGER - Notes Management Module
// =====================================================

const NotesManager = {
  notes: [],
  currentNote: null,
  autoSaveInterval: null,

  // Load notes
  async loadNotes(teamId) {
    try {
      const { data, error } = await AppState.supabase
        .from('notes')
        .select('*')
        .eq('team_id', teamId)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) throw error;

      this.notes = data;
      return this.notes;
    } catch (error) {
      console.error('Error loading notes:', error);
      this.notes = [];
      return [];
    }
  },

  // Render notes
  async renderNotes() {
    const container = document.getElementById('notes-container');
    if (!container) return;

    if (this.notes.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;">Aucune note pour le moment</p>';
      return;
    }

    container.innerHTML = this.notes.map(note => `
      <div class="note-card ${note.is_pinned ? 'pinned' : ''}" onclick="NotesManager.openNoteEditor('${note.id}')" style="cursor:pointer;">
        ${note.is_pinned ? '<div style="position:absolute;top:1rem;right:1rem;"><i class="fas fa-thumbtack" style="color:var(--accent-color);"></i></div>' : ''}
        <h4>${note.title}</h4>
        <p style="color:var(--text-secondary);">${note.content ? note.content.substring(0, 150) + (note.content.length > 150 ? '...' : '') : 'Aucun contenu'}</p>
        <div class="note-meta">
          <span>${new Date(note.updated_at).toLocaleDateString('fr-FR')}</span>
        </div>
      </div>
    `).join('');
  },

  // Show create note modal
  showCreateNoteModal() {
    const modal = document.getElementById('create-note-modal');
    if (modal) {
      modal.style.display = 'flex';
      document.getElementById('note-title-input').value = '';
      document.getElementById('note-title-input').focus();
    }
  },

  // Hide create note modal
  hideCreateNoteModal() {
    const modal = document.getElementById('create-note-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  // Create note and open editor
  async createNote() {
    const titleInput = document.getElementById('note-title-input');
    const title = titleInput.value.trim();
    
    if (!title) {
      showToast('Le titre est requis', 'error');
      return;
    }

    try {
      const { data, error } = await AppState.supabase
        .from('notes')
        .insert({
          team_id: AppState.currentTeam.id,
          title,
          content: '',
          created_by: AppState.currentUser.id,
          last_edited_by: AppState.currentUser.id,
          is_pinned: false
        })
        .select()
        .single();

      if (error) throw error;

      this.hideCreateNoteModal();
      showToast('Note créée avec succès', 'success');
      
      await this.loadNotes(AppState.currentTeam.id);
      await this.renderNotes();
      
      // Open editor
      this.openNoteEditor(data.id);

    } catch (error) {
      console.error('Error creating note:', error);
      showToast('Erreur lors de la création', 'error');
    }
  },

  // Open note editor full screen
  openNoteEditor(noteId) {
    const note = this.notes.find(n => n.id === noteId);
    if (!note) return;

    this.currentNote = note;
    
    const notesContainer = document.getElementById('notes-container');
    const notesHeader = document.querySelector('#notes-content .content-header');
    const noteEditor = document.getElementById('note-editor-fullscreen');
    
    // Hide notes list
    notesContainer.style.display = 'none';
    if (notesHeader) notesHeader.style.display = 'none';
    
    // Show editor
    noteEditor.style.display = 'block';
    
    // Populate editor
    document.getElementById('editor-note-title').textContent = note.title;
    document.getElementById('editor-note-content').value = note.content || '';
    document.getElementById('editor-last-saved').textContent = 'Chargé';
    
    // Setup auto-save
    this.setupAutoSave();
  },

  // Close note editor
  closeNoteEditor() {
    this.currentNote = null;
    
    // Clear auto-save
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    const notesContainer = document.getElementById('notes-container');
    const notesHeader = document.querySelector('#notes-content .content-header');
    const noteEditor = document.getElementById('note-editor-fullscreen');
    
    // Show notes list
    notesContainer.style.display = 'grid';
    if (notesHeader) notesHeader.style.display = 'flex';
    
    // Hide editor
    noteEditor.style.display = 'none';
    
    // Reload notes
    this.renderNotes();
  },

  // Setup auto-save
  setupAutoSave() {
    const contentTextarea = document.getElementById('editor-note-content');
    let saveTimeout;

    contentTextarea.addEventListener('input', () => {
      clearTimeout(saveTimeout);
      document.getElementById('editor-last-saved').textContent = 'Enregistrement...';
      
      saveTimeout = setTimeout(() => {
        this.saveNote();
      }, 1000); // Auto-save après 1 seconde d'inactivité
    });
  },

  // Save note
  async saveNote() {
    if (!this.currentNote) return;

    const content = document.getElementById('editor-note-content').value;

    try {
      const { error } = await AppState.supabase
        .from('notes')
        .update({
          content,
          last_edited_by: AppState.currentUser.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentNote.id);

      if (error) throw error;

      const now = new Date();
      document.getElementById('editor-last-saved').textContent = `Enregistré à ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      // Update local note
      this.currentNote.content = content;
      const noteIndex = this.notes.findIndex(n => n.id === this.currentNote.id);
      if (noteIndex !== -1) {
        this.notes[noteIndex].content = content;
      }

    } catch (error) {
      console.error('Error saving note:', error);
      document.getElementById('editor-last-saved').textContent = 'Erreur d\'enregistrement';
    }
  },

  // Toggle pin
  async togglePin() {
    if (!this.currentNote) return;

    try {
      const newPinnedState = !this.currentNote.is_pinned;
      
      const { error } = await AppState.supabase
        .from('notes')
        .update({ is_pinned: newPinnedState })
        .eq('id', this.currentNote.id);

      if (error) throw error;

      this.currentNote.is_pinned = newPinnedState;
      showToast(newPinnedState ? 'Note épinglée' : 'Note désépinglée', 'success');
      
      // Update button icon
      const pinBtn = document.querySelector('#note-editor-fullscreen .btn-secondary i');
      if (pinBtn) {
        pinBtn.className = newPinnedState ? 'fas fa-thumbtack' : 'far fa-thumbtack';
      }

    } catch (error) {
      console.error('Error toggling pin:', error);
      showToast('Erreur', 'error');
    }
  },

  // Delete note from editor
  async deleteNoteFromEditor() {
    if (!this.currentNote) return;
    if (!confirm('Supprimer cette note ?')) return;

    try {
      const { error } = await AppState.supabase
        .from('notes')
        .delete()
        .eq('id', this.currentNote.id);

      if (error) throw error;

      showToast('Note supprimée', 'success');
      
      await this.loadNotes(AppState.currentTeam.id);
      this.closeNoteEditor();

    } catch (error) {
      console.error('Error deleting note:', error);
      showToast('Erreur lors de la suppression', 'error');
    }
  },

  // Can edit note
  canEditNote(note) {
    return note.created_by === AppState.currentUser.id || 
           AppState.currentTeam?.userRole === 'owner' ||
           AppState.currentTeam?.userRole === 'coach';
  }
};

// Export
window.NotesManager = NotesManager;
