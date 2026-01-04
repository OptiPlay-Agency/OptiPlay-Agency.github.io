// Main Admin Panel JavaScript

class AdminPanel {
    constructor() {
        this.initialize();
    }

    async initialize() {
        // Wait for auth to initialize
        await this.waitForAuth();
        
        // Initialize components
        this.initializeGlobalEventListeners();
        this.initializeTooltips();
        
        console.log('Admin Panel initialized');
    }

    async waitForAuth() {
        // Wait for AdminState to be ready
        let attempts = 0;
        while (!window.AdminState && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.AdminState) {
            console.error('AdminState not available');
            return;
        }
    }

    initializeGlobalEventListeners() {
        // Handle modal close on background click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });

        // Handle ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    activeModal.classList.remove('active');
                }
            }
        });

        // Handle form submissions
        document.addEventListener('submit', (e) => {
            // Prevent default form submission for AJAX handling
            if (e.target.classList.contains('ajax-form')) {
                e.preventDefault();
            }
        });
    }

    initializeTooltips() {
        // Simple tooltip implementation
        const tooltipElements = document.querySelectorAll('[title]');
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', this.showTooltip);
            element.addEventListener('mouseleave', this.hideTooltip);
        });
    }

    showTooltip(e) {
        const title = e.target.getAttribute('title');
        if (!title) return;

        // Remove title to prevent default tooltip
        e.target.setAttribute('data-title', title);
        e.target.removeAttribute('title');

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = title;
        document.body.appendChild(tooltip);

        // Position tooltip
        const rect = e.target.getBoundingClientRect();
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
        tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
    }

    hideTooltip(e) {
        // Restore title attribute
        const title = e.target.getAttribute('data-title');
        if (title) {
            e.target.setAttribute('title', title);
            e.target.removeAttribute('data-title');
        }

        // Remove tooltip
        const tooltip = document.querySelector('.custom-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }
}

// Global utility functions
window.AdminUtils = {
    // Confirm action with custom modal
    async confirm(message, title = 'Confirmation') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove(); window.confirmResolve(false);">
                            Annuler
                        </button>
                        <button class="btn btn-danger" onclick="this.closest('.modal').remove(); window.confirmResolve(true);">
                            Confirmer
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            window.confirmResolve = resolve;
        });
    },

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Export data to CSV
    exportToCSV(data, filename) {
        const csvContent = this.arrayToCSV(data);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    },

    arrayToCSV(data) {
        if (!data.length) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [];
        
        // Add headers
        csvRows.push(headers.join(','));
        
        // Add data rows
        for (const row of data) {
            const values = headers.map(header => {
                const val = row[header];
                return `"${val}"`;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    },

    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            Utils.showToast('Copié dans le presse-papiers', 'success');
        } catch (error) {
            console.error('Failed to copy:', error);
            Utils.showToast('Erreur lors de la copie', 'error');
        }
    },

    // Sanitize HTML
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }
};

// Global modal management
window.ModalManager = {
    open(modalId, data = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Pass data to modal if needed
        modal._modalData = data;
        modal.classList.add('active');
    },

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.classList.remove('active');
        delete modal._modalData;
    },

    closeAll() {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => modal.classList.remove('active'));
    }
};

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});

// Error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    
    // Don't show error toast in production
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        Utils.showToast('Une erreur s\'est produite', 'error');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    e.preventDefault();
});

// Add custom tooltip styles
if (!document.querySelector('#tooltip-styles')) {
    const tooltipStyles = document.createElement('style');
    tooltipStyles.id = 'tooltip-styles';
    tooltipStyles.textContent = `
        .custom-tooltip {
            position: absolute;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 0.5rem 0.75rem;
            font-size: 0.85rem;
            color: var(--text-primary);
            z-index: 10002;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: fadeIn 0.2s ease;
        }

        .custom-tooltip::before {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 4px solid transparent;
            border-top-color: var(--border-color);
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Loading overlay */
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10003;
        }

        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid var(--border-color);
            border-top: 4px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        /* Confirm modal styles */
        .modal .modal-content {
            animation: modalSlideIn 0.3s ease;
        }

        @keyframes modalSlideIn {
            from {
                transform: translateY(-50px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        /* Enhanced table styles */
        .admin-table .sortable-header {
            cursor: pointer;
            user-select: none;
        }

        .admin-table .sortable-header:hover {
            background: rgba(255, 255, 255, 0.08);
        }

        .admin-table .sort-icon {
            margin-left: 0.5rem;
            opacity: 0.5;
        }

        .admin-table .sort-icon.active {
            opacity: 1;
        }

        /* Status indicators */
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 0.5rem;
        }

        .status-indicator.online {
            background: var(--success-color);
        }

        .status-indicator.offline {
            background: var(--text-muted);
        }

        .status-indicator.banned {
            background: var(--danger-color);
        }
    `;
    document.head.appendChild(tooltipStyles);
}

// Simple Utils class for basic functionality
window.Utils = {
    showToast(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // You can implement actual toast notifications later
    },

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('fr-FR');
        } catch {
            return 'N/A';
        }
    },

    formatRelativeTime(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
            if (hours > 0) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
            if (minutes > 0) return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
            return 'À l\'instant';
        } catch {
            return 'N/A';
        }
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};