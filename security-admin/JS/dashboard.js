// Dashboard Management for Admin Panel

class AdminDashboard {
    constructor() {
        this.stats = {
            totalUsers: 0,
            premiumUsers: 0,
            totalTeams: 0,
            pendingReports: 0
        };

        this.initializeDashboard();
    }

    async initializeDashboard() {
        // Load dashboard data
        await this.loadStats();
        await this.loadRecentActivity();
        await this.loadNewUsersChart();
    }

    async loadStats() {
        try {
            console.log('Loading stats...');
            console.log('Current admin user:', window.AdminState.currentAdmin);
            
            // Test: Try a simple query first to see what we get
            const simpleTest = await window.AdminState.supabase
                .from('profiles')
                .select('id, phone, role');
            
            console.log('Simple test query result:', simpleTest);
            
            // Total users - get ALL users without any filter
            const { data: allUsers, count: totalUsers, error: usersError } = await window.AdminState.supabase
                .from('profiles')
                .select('id', { count: 'exact' });

            console.log('Total users query:', { totalUsers, usersError, dataLength: allUsers?.length });
            console.log('All users data:', allUsers);

            // Admin users specifically 
            const { data: adminUsersData, count: adminUsers, error: adminError } = await window.AdminState.supabase
                .from('profiles')
                .select('id', { count: 'exact' })
                .eq('role', 'admin');

            console.log('Admin users query:', { adminUsers, adminError, dataLength: adminUsersData?.length });

            // Total teams (if table exists, otherwise set to 0)
            let totalTeams = 0;
            try {
                const { count } = await window.AdminState.supabase
                    .from('teams')
                    .select('id', { count: 'exact' });
                totalTeams = count || 0;
            } catch (error) {
                console.log('Teams table not found, setting to 0');
            }

            // Pending reports (set to 0 for now as table doesn't exist)
            const pendingReports = 0;

            // Update stats
            this.stats = {
                totalUsers: totalUsers || 0,
                premiumUsers: adminUsers || 0, // Admin users count
                totalTeams: totalTeams,
                pendingReports: pendingReports || 0
            };

            console.log('Final stats:', this.stats);
            this.renderStats();

        } catch (error) {
            console.error('Error loading stats:', error);
            // Set default values if there's an error
            this.renderStats();
        }
    }

    renderStats() {
        const elements = {
            totalUsers: document.getElementById('totalUsers'),
            premiumUsers: document.getElementById('premiumUsers'),
            totalTeams: document.getElementById('totalTeams'),
            pendingReports: document.getElementById('pendingReports')
        };

        Object.keys(elements).forEach(key => {
            if (elements[key]) {
                this.animateCounter(elements[key], this.stats[key]);
            }
        });
    }

    animateCounter(element, targetValue) {
        const duration = 1000;
        const startValue = 0;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
            element.textContent = currentValue.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    async loadRecentActivity() {
        try {
            // For now, create mock activity data since admin_logs table doesn't exist
            const mockLogs = [
                {
                    id: 1,
                    level: 'info',
                    module: 'auth',
                    message: 'Admin login successful',
                    created_at: new Date().toISOString(),
                    user_email: window.AdminState.currentAdmin?.user?.email || 'admin'
                },
                {
                    id: 2,
                    level: 'info',
                    module: 'dashboard',
                    message: 'Dashboard loaded',
                    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                    user_email: 'admin'
                }
            ];

            this.renderRecentActivity(mockLogs);

        } catch (error) {
            console.error('Error loading recent activity:', error);
            this.renderRecentActivity([]);
        }
    }

    renderRecentActivity(activities) {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history" style="font-size: 2rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p>Aucune activité récente</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => {
            const adminName = activity.admin?.profiles?.pseudo || 'Administrateur';
            const timeAgo = Utils.formatRelativeTime(activity.created_at);
            const iconClass = this.getActivityIcon(activity.action);
            const iconColor = this.getActivityColor(activity.action);

            return `
                <div class="activity-item">
                    <div class="activity-icon" style="background: ${iconColor};">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="activity-content">
                        <h4>${activity.description}</h4>
                        <p>Par ${adminName}</p>
                    </div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
            `;
        }).join('');
    }

    getActivityIcon(action) {
        const icons = {
            'login': 'fa-sign-in-alt',
            'logout': 'fa-sign-out-alt',
            'ban_user': 'fa-ban',
            'unban_user': 'fa-check',
            'delete_user': 'fa-trash',
            'update_user': 'fa-edit',
            'create_team': 'fa-users',
            'delete_team': 'fa-times',
            'handle_report': 'fa-flag'
        };
        return icons[action] || 'fa-cog';
    }

    getActivityColor(action) {
        const colors = {
            'login': 'rgba(0, 255, 136, 0.1)',
            'logout': 'rgba(255, 170, 0, 0.1)',
            'ban_user': 'rgba(255, 51, 68, 0.1)',
            'unban_user': 'rgba(0, 255, 136, 0.1)',
            'delete_user': 'rgba(255, 51, 68, 0.1)',
            'update_user': 'rgba(0, 56, 255, 0.1)',
            'create_team': 'rgba(0, 56, 255, 0.1)',
            'delete_team': 'rgba(255, 51, 68, 0.1)',
            'handle_report': 'rgba(255, 170, 0, 0.1)'
        };
        return colors[action] || 'rgba(255, 255, 255, 0.1)';
    }

    async loadNewUsersChart() {
        try {
            // Get users from last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: users, error } = await window.AdminState.supabase
                .from('profiles')
                .select('created_at')
                .gte('created_at', sevenDaysAgo.toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;

            this.renderNewUsersChart(users || []);

        } catch (error) {
            console.error('Error loading new users chart:', error);
            this.renderNewUsersChart([]);
        }
    }

    renderNewUsersChart(users) {
        const container = document.getElementById('newUsersChart');
        if (!container) return;

        // Group users by day
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last7Days.push({
                date: date.toISOString().split('T')[0],
                label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
                count: 0
            });
        }

        users.forEach(user => {
            const userDate = new Date(user.created_at).toISOString().split('T')[0];
            const dayData = last7Days.find(day => day.date === userDate);
            if (dayData) {
                dayData.count++;
            }
        });

        // Simple chart visualization
        const maxCount = Math.max(...last7Days.map(day => day.count), 1);
        
        container.innerHTML = `
            <div class="simple-chart">
                ${last7Days.map(day => `
                    <div class="chart-bar">
                        <div class="bar" style="height: ${(day.count / maxCount) * 100}%"></div>
                        <div class="bar-label">${day.label}</div>
                        <div class="bar-value">${day.count}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async refreshDashboard() {
        const refreshBtn = document.querySelector('[onclick="refreshDashboard()"]');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualisation...';
        }

        try {
            await this.loadStats();
            await this.loadRecentActivity();
            await this.loadNewUsersChart();
            
            Utils.showToast('Dashboard actualisé', 'success');

        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            Utils.showToast('Erreur lors de l\'actualisation', 'error');
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualiser';
            }
        }
    }
}

// Navigation Management
class NavigationManager {
    constructor() {
        this.currentSection = 'dashboard';
        this.initializeNavigation();
    }

    initializeNavigation() {
        // Add click listeners to navigation items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                if (section) {
                    this.showSection(section);
                }
            });
        });

        // Show initial section
        this.showSection(this.currentSection);
    }

    showSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
        });

        const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        this.currentSection = sectionName;

        // Trigger section-specific initialization if needed
        this.handleSectionChange(sectionName);
    }

    handleSectionChange(sectionName) {
        switch (sectionName) {
            case 'users':
                if (window.userManager && typeof window.userManager.loadUsers === 'function') {
                    window.userManager.loadUsers(1);
                }
                break;
            // Add other section initializations as needed
        }
    }
}

// Global functions
function refreshDashboard() {
    if (window.adminDashboard) {
        window.adminDashboard.refreshDashboard();
    }
}

// Initialize dashboard and navigation
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('dashboard-section')) {
        window.adminDashboard = new AdminDashboard();
        window.navigationManager = new NavigationManager();
    }
});

// Add chart styles
if (!document.querySelector('#chart-styles')) {
    const chartStyles = document.createElement('style');
    chartStyles.id = 'chart-styles';
    chartStyles.textContent = `
        .simple-chart {
            display: flex;
            align-items: end;
            gap: 1rem;
            height: 150px;
            padding: 1rem 0;
        }

        .chart-bar {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
        }

        .bar {
            width: 100%;
            background: var(--gradient-primary);
            border-radius: 4px 4px 0 0;
            min-height: 4px;
            transition: height 0.8s ease;
        }

        .bar-label {
            font-size: 0.8rem;
            color: var(--text-muted);
        }

        .bar-value {
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .pagination-controls {
            display: flex;
            gap: 0.5rem;
            align-items: center;
            margin-bottom: 1rem;
        }

        .pagination-info {
            color: var(--text-muted);
            font-size: 0.9rem;
        }

        .empty-state {
            text-align: center;
            padding: 2rem;
            color: var(--text-muted);
        }

        .user-details-grid {
            display: grid;
            gap: 2rem;
        }

        .detail-section {
            background: rgba(255, 255, 255, 0.05);
            padding: 1.5rem;
            border-radius: 8px;
        }

        .detail-section h4 {
            margin-bottom: 1rem;
            color: var(--primary-color);
            font-size: 1.1rem;
        }

        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid var(--border-color);
        }

        .detail-row:last-child {
            border-bottom: none;
        }

        .detail-row label {
            font-weight: 500;
            color: var(--text-secondary);
        }

        .teams-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .team-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.75rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 6px;
        }

        .team-role {
            padding: 0.25rem 0.5rem;
            background: var(--primary-color);
            color: white;
            border-radius: 12px;
            font-size: 0.8rem;
        }

        .team-game {
            padding: 0.25rem 0.5rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            font-size: 0.8rem;
        }

        .edit-user-form {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .form-group label {
            font-weight: 500;
            color: var(--text-secondary);
        }

        .form-input,
        .form-select,
        .form-textarea {
            padding: 0.75rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            color: var(--text-primary);
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
            outline: none;
            border-color: var(--primary-color);
        }

        .form-textarea {
            resize: vertical;
            min-height: 80px;
        }

        .modal-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border-color);
        }

        @media (max-width: 768px) {
            .form-grid {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(chartStyles);
}