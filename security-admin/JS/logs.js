// Admin Logs System

class AdminLogs {
    constructor() {
        this.supabase = window.AdminState?.supabase || null;
        this.logsContainer = null;
        this.currentPage = 1;
        this.logsPerPage = 20;
        this.totalLogs = 0;
        this.filters = {
            level: 'all',
            module: 'all',
            userId: null,
            dateRange: 'all'
        };
    }

    async initialize() {
        if (!this.supabase) {
            console.error('Supabase not initialized');
            return;
        }

        this.setupUI();
        this.setupEventListeners();
        await this.loadLogs();
    }

    setupUI() {
        this.logsContainer = document.getElementById('logs-container');
        if (!this.logsContainer) return;

        this.logsContainer.innerHTML = `
            <div class="logs-header">
                <h3><i class="fas fa-file-alt"></i> Journaux d'activité</h3>
                <div class="logs-actions">
                    <button id="refresh-logs" class="btn btn-secondary">
                        <i class="fas fa-sync"></i> Actualiser
                    </button>
                    <button id="export-logs" class="btn btn-primary">
                        <i class="fas fa-download"></i> Exporter
                    </button>
                </div>
            </div>

            <div class="logs-filters">
                <div class="filter-group">
                    <label>Niveau :</label>
                    <select id="filter-level">
                        <option value="all">Tous</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="error">Erreur</option>
                        <option value="critical">Critique</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label>Module :</label>
                    <select id="filter-module">
                        <option value="all">Tous</option>
                        <option value="auth">Authentification</option>
                        <option value="users">Utilisateurs</option>
                        <option value="teams">Équipes</option>
                        <option value="subscription">Abonnements</option>
                        <option value="moderation">Modération</option>
                        <option value="system">Système</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label>Période :</label>
                    <select id="filter-date">
                        <option value="all">Toutes</option>
                        <option value="today">Aujourd'hui</option>
                        <option value="week">Cette semaine</option>
                        <option value="month">Ce mois</option>
                    </select>
                </div>

                <div class="filter-group">
                    <button id="clear-filters" class="btn btn-ghost">
                        <i class="fas fa-times"></i> Effacer
                    </button>
                </div>
            </div>

            <div class="logs-content">
                <div id="logs-loading" class="loading-spinner" style="display: none;"></div>
                <div id="logs-list"></div>
                <div id="logs-pagination" class="pagination"></div>
            </div>
        `;
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refresh-logs')?.addEventListener('click', () => {
            this.currentPage = 1;
            this.loadLogs();
        });

        // Export button
        document.getElementById('export-logs')?.addEventListener('click', () => {
            this.exportLogs();
        });

        // Filters
        document.getElementById('filter-level')?.addEventListener('change', (e) => {
            this.filters.level = e.target.value;
            this.currentPage = 1;
            this.loadLogs();
        });

        document.getElementById('filter-module')?.addEventListener('change', (e) => {
            this.filters.module = e.target.value;
            this.currentPage = 1;
            this.loadLogs();
        });

        document.getElementById('filter-date')?.addEventListener('change', (e) => {
            this.filters.dateRange = e.target.value;
            this.currentPage = 1;
            this.loadLogs();
        });

        // Clear filters
        document.getElementById('clear-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });
    }

    clearFilters() {
        this.filters = {
            level: 'all',
            module: 'all',
            userId: null,
            dateRange: 'all'
        };

        // Reset UI
        document.getElementById('filter-level').value = 'all';
        document.getElementById('filter-module').value = 'all';
        document.getElementById('filter-date').value = 'all';

        this.currentPage = 1;
        this.loadLogs();
    }

    async loadLogs() {
        const loadingEl = document.getElementById('logs-loading');
        const listEl = document.getElementById('logs-list');

        if (!loadingEl || !listEl) return;

        loadingEl.style.display = 'block';
        listEl.innerHTML = '';

        try {
            // Build query
            let query = this.supabase
                .from('admin_logs')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(
                    (this.currentPage - 1) * this.logsPerPage,
                    this.currentPage * this.logsPerPage - 1
                );

            // Apply filters
            if (this.filters.level !== 'all') {
                query = query.eq('level', this.filters.level);
            }

            if (this.filters.module !== 'all') {
                query = query.eq('module', this.filters.module);
            }

            if (this.filters.userId) {
                query = query.eq('user_id', this.filters.userId);
            }

            if (this.filters.dateRange !== 'all') {
                const dateFilter = this.getDateFilter(this.filters.dateRange);
                query = query.gte('created_at', dateFilter);
            }

            const { data: logs, count, error } = await query;

            if (error) throw error;

            this.totalLogs = count || 0;
            this.renderLogs(logs || []);
            this.renderPagination();

        } catch (error) {
            console.error('Error loading logs:', error);
            listEl.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    Erreur lors du chargement des logs
                </div>
            `;
        } finally {
            loadingEl.style.display = 'none';
        }
    }

    getDateFilter(range) {
        const now = new Date();
        switch (range) {
            case 'today':
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                return today.toISOString();
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return weekAgo.toISOString();
            case 'month':
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return monthAgo.toISOString();
            default:
                return new Date(0).toISOString();
        }
    }

    renderLogs(logs) {
        const listEl = document.getElementById('logs-list');
        if (!listEl) return;

        if (logs.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <p>Aucun log trouvé</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = `
            <div class="logs-table">
                ${logs.map(log => this.renderLogItem(log)).join('')}
            </div>
        `;
    }

    renderLogItem(log) {
        const levelIcon = this.getLevelIcon(log.level);
        const levelClass = `log-level-${log.level}`;
        const timestamp = new Date(log.created_at).toLocaleString('fr-FR');

        return `
            <div class="log-item ${levelClass}">
                <div class="log-header">
                    <div class="log-level">
                        <i class="${levelIcon}"></i>
                        ${log.level.toUpperCase()}
                    </div>
                    <div class="log-module">[${log.module}]</div>
                    <div class="log-timestamp">${timestamp}</div>
                </div>
                <div class="log-message">${this.escapeHtml(log.message)}</div>
                ${log.details ? `
                    <div class="log-details">
                        <button class="btn-text" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                            <i class="fas fa-chevron-down"></i> Détails
                        </button>
                        <pre style="display: none;">${this.escapeHtml(JSON.stringify(log.details, null, 2))}</pre>
                    </div>
                ` : ''}
                ${log.user_id ? `
                    <div class="log-user">
                        <small>Utilisateur: ${log.user_id}</small>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getLevelIcon(level) {
        switch (level) {
            case 'info':
                return 'fas fa-info-circle';
            case 'warning':
                return 'fas fa-exclamation-triangle';
            case 'error':
                return 'fas fa-times-circle';
            case 'critical':
                return 'fas fa-skull-crossbones';
            default:
                return 'fas fa-circle';
        }
    }

    renderPagination() {
        const paginationEl = document.getElementById('logs-pagination');
        if (!paginationEl) return;

        const totalPages = Math.ceil(this.totalLogs / this.logsPerPage);
        
        if (totalPages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        const pagination = [];
        
        // Previous button
        if (this.currentPage > 1) {
            pagination.push(`
                <button class="btn btn-ghost" onclick="window.adminLogs.goToPage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `);
        }

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            pagination.push(`<button class="btn btn-ghost" onclick="window.adminLogs.goToPage(1)">1</button>`);
            if (startPage > 2) pagination.push(`<span>...</span>`);
        }

        for (let i = startPage; i <= endPage; i++) {
            const active = i === this.currentPage ? 'active' : '';
            pagination.push(`
                <button class="btn btn-ghost ${active}" onclick="window.adminLogs.goToPage(${i})">
                    ${i}
                </button>
            `);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) pagination.push(`<span>...</span>`);
            pagination.push(`<button class="btn btn-ghost" onclick="window.adminLogs.goToPage(${totalPages})">${totalPages}</button>`);
        }

        // Next button
        if (this.currentPage < totalPages) {
            pagination.push(`
                <button class="btn btn-ghost" onclick="window.adminLogs.goToPage(${this.currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `);
        }

        paginationEl.innerHTML = `
            <div class="pagination-info">
                Showing ${((this.currentPage - 1) * this.logsPerPage) + 1} - 
                ${Math.min(this.currentPage * this.logsPerPage, this.totalLogs)} 
                of ${this.totalLogs} logs
            </div>
            <div class="pagination-controls">
                ${pagination.join('')}
            </div>
        `;
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadLogs();
    }

    async exportLogs() {
        try {
            let query = this.supabase
                .from('admin_logs')
                .select('*')
                .order('created_at', { ascending: false });

            // Apply current filters
            if (this.filters.level !== 'all') {
                query = query.eq('level', this.filters.level);
            }
            if (this.filters.module !== 'all') {
                query = query.eq('module', this.filters.module);
            }
            if (this.filters.userId) {
                query = query.eq('user_id', this.filters.userId);
            }
            if (this.filters.dateRange !== 'all') {
                const dateFilter = this.getDateFilter(this.filters.dateRange);
                query = query.gte('created_at', dateFilter);
            }

            const { data: logs, error } = await query;

            if (error) throw error;

            // Format data for CSV
            const csvData = logs.map(log => ({
                timestamp: new Date(log.created_at).toLocaleString('fr-FR'),
                level: log.level,
                module: log.module,
                message: log.message,
                user_id: log.user_id || '',
                details: log.details ? JSON.stringify(log.details) : ''
            }));

            // Export to CSV
            const filename = `admin_logs_${new Date().toISOString().split('T')[0]}.csv`;
            AdminUtils.exportToCSV(csvData, filename);

        } catch (error) {
            console.error('Error exporting logs:', error);
            Utils.showToast('Erreur lors de l\'export des logs', 'error');
        }
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    // Static method to log an action
    static async log(level, module, message, details = null, userId = null) {
        try {
            const supabase = window.AdminState?.supabase;
            if (!supabase) return;

            const logData = {
                level,
                module,
                message,
                details,
                user_id: userId,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('admin_logs')
                .insert([logData]);

            if (error) {
                console.error('Error logging action:', error);
            }

        } catch (error) {
            console.error('Error in log method:', error);
        }
    }
}

// Global access to logs
window.AdminLogs = AdminLogs;
window.adminLogs = null;

// Initialize logs when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for AdminState to be ready
    const initLogs = () => {
        if (window.AdminState?.supabase) {
            window.adminLogs = new AdminLogs();
            if (document.getElementById('logs-container')) {
                window.adminLogs.initialize();
            }
        } else {
            setTimeout(initLogs, 100);
        }
    };
    initLogs();
});

// Add CSS styles for logs
if (!document.querySelector('#logs-styles')) {
    const logsStyles = document.createElement('style');
    logsStyles.id = 'logs-styles';
    logsStyles.textContent = `
        .logs-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--border-color);
        }

        .logs-actions {
            display: flex;
            gap: 0.5rem;
        }

        .logs-filters {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
            padding: 1rem;
            background: var(--bg-secondary);
            border-radius: 8px;
            flex-wrap: wrap;
        }

        .filter-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .filter-group label {
            font-size: 0.9rem;
            color: var(--text-secondary);
            white-space: nowrap;
        }

        .filter-group select {
            min-width: 120px;
        }

        .logs-table {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .log-item {
            padding: 1rem;
            background: var(--bg-card);
            border-radius: 8px;
            border-left: 4px solid;
        }

        .log-level-info {
            border-left-color: var(--info-color);
        }

        .log-level-warning {
            border-left-color: var(--warning-color);
        }

        .log-level-error {
            border-left-color: var(--danger-color);
        }

        .log-level-critical {
            border-left-color: #ff0080;
        }

        .log-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
        }

        .log-level {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-weight: 600;
            min-width: 80px;
        }

        .log-level-info .log-level { color: var(--info-color); }
        .log-level-warning .log-level { color: var(--warning-color); }
        .log-level-error .log-level { color: var(--danger-color); }
        .log-level-critical .log-level { color: #ff0080; }

        .log-module {
            color: var(--primary-color);
            font-weight: 500;
        }

        .log-timestamp {
            color: var(--text-muted);
            margin-left: auto;
        }

        .log-message {
            color: var(--text-primary);
            line-height: 1.5;
        }

        .log-details {
            margin-top: 0.5rem;
        }

        .log-details pre {
            background: var(--bg-secondary);
            padding: 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
            overflow-x: auto;
            margin-top: 0.5rem;
        }

        .log-user {
            margin-top: 0.5rem;
            color: var(--text-muted);
        }

        .pagination {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border-color);
        }

        .pagination-controls {
            display: flex;
            gap: 0.25rem;
        }

        .pagination-controls .btn.active {
            background: var(--primary-color);
            color: white;
        }

        .pagination-info {
            color: var(--text-muted);
            font-size: 0.9rem;
        }

        @media (max-width: 768px) {
            .logs-filters {
                flex-direction: column;
                gap: 0.75rem;
            }

            .log-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.5rem;
            }

            .log-timestamp {
                margin-left: 0;
            }
        }
    `;
    document.head.appendChild(logsStyles);
}