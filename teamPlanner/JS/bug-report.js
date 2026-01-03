// =====================================================
// BUG REPORT MANAGER
// Gestion des rapports de bug vers GitHub
// =====================================================

class BugReportManager {
  constructor() {
    this.setupEventListeners();
    this.fillTechnicalInfo();
    // File upload désactivé temporairement
    // this.selectedFiles = [];
    // this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  setupEventListeners() {
    // Bouton pour ouvrir le modal
    const reportBugBtn = document.getElementById('report-bug-btn');
    if (reportBugBtn) {
      reportBugBtn.addEventListener('click', () => this.showBugReportModal());
    }

    // Gestion du formulaire
    const bugForm = document.getElementById('bug-report-form');
    if (bugForm) {
      bugForm.addEventListener('submit', (e) => this.handleBugReport(e));
    }

    // Gestion des fichiers - désactivé temporairement
    // this.setupFileUpload();

    // Fermeture du modal
    const modal = document.getElementById('bug-report-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('modal-close')) {
          this.hideBugReportModal();
        }
      });
    }
  }

  setupFileUpload() {
    const fileInput = document.getElementById('bug-attachments');
    const uploadArea = document.getElementById('file-upload-area');
    const placeholder = uploadArea.querySelector('.file-upload-placeholder');

    // Click to select files
    placeholder.addEventListener('click', () => {
      fileInput.click();
    });

    // File selection
    fileInput.addEventListener('change', (e) => {
      this.handleFileSelection(e.target.files);
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      this.handleFileSelection(e.dataTransfer.files);
    });
  }

  fillTechnicalInfo() {
    // Detect browser
    const browserInfo = this.getBrowserInfo();
    document.getElementById('bug-browser').value = browserInfo;

    // Detect device
    const deviceInfo = this.getDeviceInfo();
    document.getElementById('bug-device').value = deviceInfo;
  }

  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';

    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      browserName = 'Chrome';
      browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Firefox')) {
      browserName = 'Firefox';
      browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browserName = 'Safari';
      browserVersion = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Edg')) {
      browserName = 'Edge';
      browserVersion = ua.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
    }

    return `${browserName} ${browserVersion}`;
  }

  getDeviceInfo() {
    const ua = navigator.userAgent;
    let os = 'Unknown OS';

    if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
    else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
    else if (ua.includes('Windows NT 6.2')) os = 'Windows 8';
    else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
    else if (ua.includes('Mac OS X')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return os;
  }

  handleFileSelection(files) {
    const selectedFilesContainer = document.getElementById('selected-files');
    
    Array.from(files).forEach(file => {
      // Check file size
      if (file.size > this.maxFileSize) {
        showToast(`Le fichier "${file.name}" est trop volumineux (max 10MB)`, 'error');
        return;
      }

      // Check if already selected
      if (this.selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        return;
      }

      this.selectedFiles.push(file);
      this.renderFileList();
    });
  }

  renderFileList() {
    const container = document.getElementById('selected-files');
    container.innerHTML = '';

    if (this.selectedFiles.length === 0) {
      return;
    }

    this.selectedFiles.forEach((file, index) => {
      const fileElement = document.createElement('div');
      fileElement.className = 'selected-file';
      fileElement.innerHTML = `
        <div class="file-info">
          <i class="fas fa-file"></i>
          <span class="file-name">${file.name}</span>
          <span class="file-size">(${this.formatFileSize(file.size)})</span>
        </div>
        <button type="button" class="remove-file" onclick="bugReportManager.removeFile(${index})">
          <i class="fas fa-times"></i>
        </button>
      `;
      container.appendChild(fileElement);
    });
  }

  removeFile(index) {
    this.selectedFiles.splice(index, 1);
    this.renderFileList();
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  showBugReportModal() {
    const modal = document.getElementById('bug-report-modal');
    modal.style.display = 'flex';
    
    // Reset form
    document.getElementById('bug-report-form').reset();
    // File reset désactivé
    // this.selectedFiles = [];
    // this.renderFileList();
    this.fillTechnicalInfo();
    
    // Auto-fill contact email
    if (AppState.currentUser?.email) {
      document.getElementById('bug-contact').value = AppState.currentUser.email;
    }
  }

  hideBugReportModal() {
    const modal = document.getElementById('bug-report-modal');
    modal.style.display = 'none';
  }

  async handleBugReport(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-bug-report');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
    submitBtn.disabled = true;

    try {
      await this.submitBugReport();
      showToast('Rapport de bug envoyé avec succès ! Merci pour votre contribution.', 'success');
      this.hideBugReportModal();
    } catch (error) {
      console.error('Error submitting bug report:', error);
      showToast('Erreur lors de l\'envoi du rapport. Veuillez réessayer.', 'error');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  async submitBugReport() {
    // Collect form data
    const formData = {
      title: document.getElementById('bug-title').value,
      type: document.getElementById('bug-type').value,
      priority: document.getElementById('bug-priority').value,
      description: document.getElementById('bug-description').value,
      steps: document.getElementById('bug-steps').value,
      browser: document.getElementById('bug-browser').value,
      device: document.getElementById('bug-device').value,
      contact: document.getElementById('bug-contact').value || AppState.currentUser?.email || 'Anonymous'
    };

    // Create GitHub issue body
    let issueBody = this.formatIssueBody(formData);

    // Submit to GitHub Issues API
    await this.createGitHubIssue(formData.title, issueBody, formData.type, formData.priority);
  }

  formatIssueBody(formData) {
    const typeEmojis = {
      bug: '🐛',
      feature: '💡',
      improvement: '✨',
      performance: '⚡',
      ui: '🎨',
      docs: '📚',
      other: '🤔'
    };

    const priorityEmojis = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };

    return `
## ${typeEmojis[formData.type] || '🤔'} Type
${formData.type}

## ${priorityEmojis[formData.priority] || '🟡'} Priorité
${formData.priority}

## 📝 Description
${formData.description}

${formData.steps ? `## 🔄 Étapes pour reproduire
${formData.steps}` : ''}

## 💻 Informations techniques
- **Navigateur:** ${formData.browser}
- **Système:** ${formData.device}
- **URL:** ${window.location.href}
- **Timestamp:** ${new Date().toISOString()}

## 👤 Contact
${formData.contact}

---
*Rapport automatique généré par OptiPlay Manager*
    `.trim();
  }

  async uploadAttachments() {
    const uploadedUrls = [];
    
    for (const file of this.selectedFiles) {
      try {
        if (file.type.startsWith('image/')) {
          // Upload images via Supabase function (tokens sécurisés)
          const url = await this.uploadImageViaSupabase(file);
          if (url) {
            uploadedUrls.push(url);
          }
        } else {
          // For non-images, we'll mention them in the issue but can't upload
          console.log(`Non-image file "${file.name}" will be mentioned but not uploaded`);
        }
      } catch (error) {
        console.error('Error uploading file:', file.name, error);
        showToast(`Erreur lors de l'upload de "${file.name}"`, 'warning');
      }
    }
    
    return uploadedUrls;
  }

  async uploadImageViaSupabase(file) {
    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      if (!base64) return null;

      // Call Supabase Edge Function (tokens stay server-side)
      const { data, error } = await window.supabaseClient.functions.invoke('upload-image', {
        body: {
          image_base64: base64.split(',')[1], // Remove data:image/xxx;base64, prefix
          filename: file.name
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        return null;
      }

      if (data?.success && data?.data?.url) {
        console.log('✅ Image uploaded via Edge Function:', data.data.url);
        return data.data.url;
      } else {
        console.error('Upload failed:', data);
        return null;
      }
    } catch (error) {
      console.error('Error uploading via Edge Function:', error);
      return null;
    }
  }

  // Helper function to convert file to base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  async createGitHubIssue(title, body, type, priority) {
    try {
      // Load GitHub token from config (temporary direct approach)
      const config = await window.githubConfig.loadConfigFromSupabase();
      
      if (!config.githubToken) {
        throw new Error('GitHub token not available');
      }

      const issueData = {
        title: `[${type.toUpperCase()}] ${title}`,
        body: body,
        labels: [
          'bug-report',
          `priority-${priority}`,
          `type-${type}`,
          'manager',
          'user-report'
        ]
      };

      const response = await fetch('https://api.github.com/repos/OptiPlay-Agency/OptiPlay-Agency.github.io/issues', {
        method: 'POST',
        headers: {
          'Authorization': `token ${config.githubToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'OptiPlay-Manager'
        },
        body: JSON.stringify(issueData)
      });

      const result = await response.json();

      if (result.html_url) {
        console.log('✅ GitHub issue created:', result.html_url);
        showToast(`Issue créée avec succès ! Voir: ${result.html_url}`, 'success');
        return {
          success: true,
          issue_url: result.html_url,
          issue_number: result.number
        };
      } else {
        throw new Error('GitHub issue creation failed: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to create GitHub issue:', error);
      
      // Fallback to mock issue
      showToast('Impossible de créer l\'issue GitHub. Le rapport a été sauvegardé localement.', 'warning');
      return this.createMockIssue(title, body, type, priority);
    }
  }

  createMockIssue(title, body, type, priority) {
    // Create a local backup of the issue
    const issueData = {
      title: `[${type.toUpperCase()}] ${title}`,
      body: body,
      type: type,
      priority: priority,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userEmail: AppState.currentUser?.email || 'Anonymous'
    };

    // Save to localStorage as backup
    const savedIssues = JSON.parse(localStorage.getItem('optiplay-bug-reports') || '[]');
    savedIssues.push(issueData);
    localStorage.setItem('optiplay-bug-reports', JSON.stringify(savedIssues));

    // Log for developer
    console.log('Bug report saved locally:', issueData);
    
    // Show instructions to user
    showToast('Rapport sauvegardé. Veuillez contacter support@optiplay.com avec les détails.', 'info', 8000);
    
    return { success: true, data: issueData, isLocal: true };
  }
}

// Global instance
let bugReportManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (!bugReportManager) {
    bugReportManager = new BugReportManager();
  }
});

// CSS Styles for bug report modal
const bugReportStyles = `
  .file-upload-area {
    border: 2px dashed var(--border-color);
    border-radius: var(--border-radius);
    padding: 2rem;
    text-align: center;
    transition: all 0.3s ease;
    background: var(--bg-darker);
  }

  .file-upload-area.drag-over {
    border-color: var(--primary-color);
    background: rgba(var(--primary-color-rgb), 0.1);
  }

  .file-upload-placeholder {
    cursor: pointer;
    color: var(--text-muted);
  }

  .file-upload-placeholder:hover {
    color: var(--text-primary);
  }

  .selected-files {
    margin-top: 1rem;
  }

  .selected-file {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    margin-bottom: 0.5rem;
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .file-name {
    font-weight: 500;
  }

  .file-size {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .remove-file {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }

  .remove-file:hover {
    background: var(--danger-color);
    color: white;
  }

  .bug-report-info {
    margin-top: 1.5rem;
  }

  .modal-large {
    max-width: 800px;
  }
`;

// Add styles to head
if (!document.getElementById('bug-report-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'bug-report-styles';
  styleElement.textContent = bugReportStyles;
  document.head.appendChild(styleElement);
}