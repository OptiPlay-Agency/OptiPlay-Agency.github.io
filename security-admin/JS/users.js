// User Management for Admin Panel

class UserManager {
    constructor() {
        this.currentPage = 1;
        this.usersPerPage = 20;
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.users = [];
        this.totalUsers = 0;
        
        this.initializeUserManagement();
    }

    initializeUserManagement() {
        console.log('Initializing User Management...');
        
        // Setup search
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.addEventListener('input', 
                Utils.debounce((e) => this.handleSearch(e.target.value), 300)
            );
        }

        // Setup filter
        const filterSelect = document.getElementById('userFilter');
        if (filterSelect) {
            // Ensure it starts with "all"
            filterSelect.value = 'all';
            filterSelect.addEventListener('change', (e) => this.handleFilter(e.target.value));
        }

        // Force load all users
        console.log('Force loading all users...');
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.loadUsers(1);
    }

    async loadUsers(page = 1) {
        try {
            console.log('Loading users, page:', page);
            console.log('Current authenticated user:', await window.AdminState.supabase.auth.getUser());
            
            this.currentPage = page;
            const offset = (page - 1) * this.usersPerPage;

            // Test: Try different query approaches
            console.log('Testing different query approaches...');
            
            // Test 1: Simple select all
            const test1 = await window.AdminState.supabase.from('profiles').select('*');
            console.log('Test 1 - Simple select all:', test1);
            
            // Test 2: Count only
            const test2 = await window.AdminState.supabase.from('profiles').select('*', { count: 'exact', head: true });
            console.log('Test 2 - Count only:', test2);

            // Build query - get ALL users by default
            let query = window.AdminState.supabase
                .from('profiles')
                .select('*', { count: 'exact' })
                .range(offset, offset + this.usersPerPage - 1)
                .order('created_at', { ascending: false });

            // Apply search filter ONLY if there's a search term
            if (this.currentSearch && this.currentSearch.trim()) {
                query = query.or(`phone.ilike.%${this.currentSearch}%,role.ilike.%${this.currentSearch}%`);
            }

            // Apply status filter ONLY if not "all"
            if (this.currentFilter && this.currentFilter !== 'all') {
                switch (this.currentFilter) {
                    case 'premium':
                        query = query.eq('role', 'admin'); // Admin users
                        break;
                    case 'free':
                        query = query.eq('role', 'user'); // Regular users
                        break;
                    case 'banned':
                        query = query.eq('is_verified', false);
                        break;
                }
            }

            const { data, error, count } = await query;

            console.log('Users query result:', { data, error, count, filter: this.currentFilter, search: this.currentSearch });
            console.log('Individual users returned:', data);
            
            if (data && data.length > 0) {
                console.log('First user details:', data[0]);
                console.log('All user IDs:', data.map(u => u.id));
            }

            if (error) throw error;

            this.users = data || [];
            this.totalUsers = count || 0;

            // Load subscription data for each user
            if (this.users.length > 0) {
                console.log('Loading subscription data for users...');
                
                // Get all user IDs
                const userIds = this.users.map(user => user.id);
                
                // Load all subscriptions for these users
                try {
                    const { data: subscriptions, error: subError } = await window.AdminState.supabase
                        .from('subscriptions')
                        .select('*')
                        .in('user_id', userIds);
                    
                    if (subError) {
                        console.error('Error loading subscriptions:', subError);
                    } else {
                        console.log('Loaded subscriptions:', subscriptions);
                        
                        // Merge subscription data with user data
                        this.users = this.users.map(user => {
                            // Find ACTIVE subscription first, ignore canceled ones
                            const activeSubscription = subscriptions?.find(sub => 
                                sub.user_id === user.id && sub.status === 'active'
                            );
                            
                            // If no active subscription, find any subscription for debugging
                            const anySubscription = subscriptions?.find(sub => sub.user_id === user.id);
                            
                            return {
                                ...user,
                                plan: activeSubscription ? activeSubscription.plan_type : 'free',
                                subscription_status: activeSubscription?.status || 'free',
                                billing_type: activeSubscription?.billing_type || 'monthly',
                                amount: activeSubscription?.amount || 0,
                                raw_subscription: activeSubscription || anySubscription // Keep original subscription data for debugging
                            };
                        });
                        
                        console.log('Users with subscription data:', this.users);
                    }
                } catch (subscriptionError) {
                    console.error('Failed to load subscriptions:', subscriptionError);
                    // Set all users to free plan if subscriptions can't be loaded
                    this.users = this.users.map(user => ({
                        ...user,
                        plan: 'free',
                        subscription_status: 'free'
                    }));
                }
            }

            console.log('Loaded users:', this.users.length, 'Total:', this.totalUsers);
            console.log('First user structure:', this.users[0]); // Debug: voir la structure des données

            this.renderUsersTable();
            this.renderPagination();

        } catch (error) {
            console.error('Error loading users:', error);
            console.log('Erreur lors du chargement des utilisateurs'); // Temporary replacement for Utils.showToast
        }
    }

    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                        <div>Aucun utilisateur trouvé</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.users.map(user => this.renderUserRow(user)).join('');
    }

    renderUserRow(user) {
        // Simplified user row rendering based on available data
        const userId = user.id ? user.id.substring(0, 8) : 'N/A';
        
        // Try different possible fields for username/pseudo
        const userDisplayName = user.pseudo || user.username || user.display_name || 
                               user.full_name || user.name || user.phone || userId;

        return `
            <tr data-user-id="${user.id}">
                <td>
                    <div class="user-info">
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-details">
                            <h4>${userDisplayName}</h4>
                            <span>Téléphone: ${user.phone || 'N/A'}</span>
                        </div>
                    </div>
                </td>
                <td>${userId}</td>
                <td>
                    <span class="status-badge ${user.role === 'admin' ? 'status-premium' : 'status-free'}">
                        ${user.role === 'admin' ? '<i class="fas fa-crown"></i>' : ''}
                        ${user.role || 'user'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${this.getPlanClass(user.plan)}">
                        ${this.getPlanDisplay(user.plan)}
                    </span>
                </td>
                <td>${new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
                <td>${user.updated_at ? new Date(user.updated_at).toLocaleDateString('fr-FR') : 'N/A'}</td>
                <td>
                    <span class="status-badge ${user.is_verified ? 'status-active' : 'status-inactive'}">
                        ${user.is_verified ? 'Vérifié' : 'Non vérifié'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="userManager.viewUser('${user.id}')" title="Voir le profil">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="userManager.editUser('${user.id}')" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${!user.is_banned 
                            ? `<button class="btn-icon danger" onclick="userManager.banUser('${user.id}')" title="Bannir">
                                <i class="fas fa-ban"></i>
                               </button>`
                            : `<button class="btn-icon" onclick="userManager.unbanUser('${user.id}')" title="Débannir">
                                <i class="fas fa-check"></i>
                               </button>`
                        }
                        <button class="btn-icon danger" onclick="userManager.deleteUser('${user.id}')" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    renderPagination() {
        const pagination = document.getElementById('usersPagination');
        if (!pagination) return;

        const totalPages = Math.ceil(this.totalUsers / this.usersPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination-controls">';
        
        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `
                <button class="btn btn-secondary" onclick="userManager.loadUsers(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i> Précédent
                </button>
            `;
        }

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? 'btn-primary' : 'btn-secondary';
            paginationHTML += `
                <button class="btn ${activeClass}" onclick="userManager.loadUsers(${i})">
                    ${i}
                </button>
            `;
        }

        // Next button
        if (this.currentPage < totalPages) {
            paginationHTML += `
                <button class="btn btn-secondary" onclick="userManager.loadUsers(${this.currentPage + 1})">
                    Suivant <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }

        paginationHTML += '</div>';
        paginationHTML += `<div class="pagination-info">Page ${this.currentPage} sur ${totalPages} (${this.totalUsers} utilisateurs)</div>`;

        pagination.innerHTML = paginationHTML;
    }

    handleSearch(searchTerm) {
        this.currentSearch = searchTerm;
        this.loadUsers(1);
    }

    handleFilter(filter) {
        this.currentFilter = filter;
        this.loadUsers(1);
    }

    async viewUser(userId) {
        try {
            // Get user details (simplified query without joins)
            const { data: user, error } = await window.AdminState.supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            this.showUserModal(user, 'view');

        } catch (error) {
            console.error('Error loading user details:', error);
            Utils.showToast('Erreur lors du chargement des détails utilisateur', 'error');
        }
    }

    async editUser(userId) {
        try {
            // Get user profile data
            const { data: user, error: userError } = await window.AdminState.supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (userError) throw userError;

            // Get subscription data - simplified approach
            let subscription = null;
            let subError = null;
            
            try {
                const result = await window.AdminState.supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', userId)
                    .single();
                    
                subscription = result.data;
                subError = result.error;
            } catch (error) {
                console.log('No subscription found or RLS blocking access:', error);
                subError = error;
            }

            // Don't throw error if no subscription exists (user might be on free plan)
            if (subError && subError.code !== 'PGRST116') {
                console.error('Subscription fetch error:', subError);
            }

            // Merge subscription data with user data
            const userWithPlan = {
                ...user,
                plan: subscription?.plan_type || 'free',
                subscription_status: subscription?.status || 'free',
                billing_type: subscription?.billing_type || 'monthly',
                amount: subscription?.amount || 0
            };

            this.showUserModal(userWithPlan, 'edit');

        } catch (error) {
            console.error('Error loading user for edit:', error);
            alert('Erreur lors du chargement des données utilisateur: ' + error.message);
        }
    }

    showUserModal(user, mode = 'view') {
        const modal = document.getElementById('userActionModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        if (mode === 'view') {
            modalTitle.textContent = `Profil de ${user.pseudo || 'Utilisateur'}`;
            modalBody.innerHTML = this.renderUserDetailsView(user);
        } else if (mode === 'edit') {
            modalTitle.textContent = `Modifier ${user.pseudo || 'Utilisateur'}`;
            modalBody.innerHTML = this.renderUserEditForm(user);
        }

        modal.classList.add('active');
    }

    renderUserDetailsView(user) {
        const createdAt = Utils.formatDate(user.created_at);
        const lastActivity = user.last_sign_in_at 
            ? Utils.formatDate(user.last_sign_in_at)
            : 'Jamais connecté';

        return `
            <div class="user-details-grid">
                <div class="detail-section">
                    <h4>Informations personnelles</h4>
                    <div class="detail-row">
                        <label>Pseudo:</label>
                        <span>${user.pseudo || 'Non défini'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Email:</label>
                        <span>${user.email || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Plan:</label>
                        <span class="status-badge ${this.getPlanClass(user.plan)}">
                            ${this.getPlanDisplay(user.plan)}
                        </span>
                    </div>
                    <div class="detail-row">
                        <label>Statut:</label>
                        <span class="status-badge ${user.is_banned ? 'status-banned' : 'status-active'}">
                            ${user.is_banned ? 'Banni' : 'Actif'}
                        </span>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>Informations de compte</h4>
                    <div class="detail-row">
                        <label>Inscription:</label>
                        <span>${createdAt}</span>
                    </div>
                    <div class="detail-row">
                        <label>Dernière activité:</label>
                        <span>${lastActivity}</span>
                    </div>
                    <div class="detail-row">
                        <label>Email confirmé:</label>
                        <span>${user.email_confirmed_at ? 'Oui' : 'Non'}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>Équipes</h4>
                    <div class="teams-list">
                        ${user.team_members && user.team_members.length > 0 
                            ? user.team_members.map(member => `
                                <div class="team-item">
                                    <strong>${member.teams.name}</strong>
                                    <span class="team-role">${member.role}</span>
                                    <span class="team-game">${member.teams.game_type}</span>
                                </div>
                            `).join('')
                            : '<p style="color: var(--text-muted);">Aucune équipe</p>'
                        }
                    </div>
                </div>
            </div>

            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="closeModal('userActionModal')">
                    Fermer
                </button>
                <button class="btn btn-primary" onclick="userManager.editUser('${user.id}')">
                    <i class="fas fa-edit"></i> Modifier
                </button>
            </div>
        `;
    }

    renderUserEditForm(user) {
        return `
            <form id="editUserForm" class="edit-user-form">
                <input type="hidden" id="userId" value="${user.id}">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="editPlan">Plan d'abonnement:</label>
                        <select id="editPlan" class="form-select">
                            <option value="free" ${(!user.plan || user.plan === 'free') ? 'selected' : ''}>Gratuit</option>
                            <option value="beginner" ${user.plan === 'beginner' ? 'selected' : ''}>Beginner</option>
                            <option value="advanced" ${user.plan === 'advanced' ? 'selected' : ''}>Advanced</option>
                            <option value="premium" ${user.plan === 'premium' ? 'selected' : ''}>Premium</option>
                        </select>
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('userActionModal')">
                        Annuler
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Sauvegarder
                    </button>
                </div>
            </form>
        `;
    }

    async banUser(userId) {
        if (!confirm('Êtes-vous sûr de vouloir bannir cet utilisateur ?')) return;

        try {
            const { error } = await window.AdminState.supabase
                .from('profiles')
                .update({ 
                    is_banned: true,
                    ban_reason: 'Banni par un administrateur',
                    banned_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;

            // Log admin action
            await adminAuth.logAdminActivity('ban_user', `Utilisateur banni: ${userId}`);

            Utils.showToast('Utilisateur banni avec succès', 'success');
            this.loadUsers(this.currentPage);

        } catch (error) {
            console.error('Error banning user:', error);
            Utils.showToast('Erreur lors du bannissement', 'error');
        }
    }

    async unbanUser(userId) {
        if (!confirm('Êtes-vous sûr de vouloir débannir cet utilisateur ?')) return;

        try {
            const { error } = await window.AdminState.supabase
                .from('profiles')
                .update({ 
                    is_banned: false,
                    ban_reason: null,
                    banned_at: null
                })
                .eq('id', userId);

            if (error) throw error;

            // Log admin action
            await adminAuth.logAdminActivity('unban_user', `Utilisateur débanni: ${userId}`);

            Utils.showToast('Utilisateur débanni avec succès', 'success');
            this.loadUsers(this.currentPage);

        } catch (error) {
            console.error('Error unbanning user:', error);
            Utils.showToast('Erreur lors du débannissement', 'error');
        }
    }

    async deleteUser(userId) {
        if (!confirm('⚠️ ATTENTION: Cette action est irréversible!\n\nÊtes-vous sûr de vouloir supprimer définitivement cet utilisateur et toutes ses données ?')) return;

        try {
            const { error } = await window.AdminState.supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (error) throw error;

            // Log admin action
            await adminAuth.logAdminActivity('delete_user', `Utilisateur supprimé: ${userId}`);

            Utils.showToast('Utilisateur supprimé avec succès', 'success');
            this.loadUsers(this.currentPage);

        } catch (error) {
            console.error('Error deleting user:', error);
            Utils.showToast('Erreur lors de la suppression', 'error');
        }
    }

    // Helper methods for plan display
    getPlanClass(plan) {
        switch(plan) {
            case 'premium':
                return 'status-premium';
            case 'advanced':
                return 'status-advanced';
            case 'beginner':
                return 'status-beginner';
            case 'free':
            default:
                return 'status-free';
        }
    }

    getPlanDisplay(plan) {
        switch(plan) {
            case 'premium':
                return '<i class="fas fa-crown"></i> Premium';
            case 'advanced':
                return '<i class="fas fa-star"></i> Advanced';
            case 'beginner':
                return '<i class="fas fa-seedling"></i> Beginner';
            case 'free':
            default:
                return '<i class="fas fa-user"></i> Gratuit';
        }
    }
}

// Modal utility functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Initialize user manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('users-section') || typeof window !== 'undefined') {
        window.userManager = new UserManager();
        
        // Handle edit form submission
        document.addEventListener('submit', async (e) => {
            if (e.target.id === 'editUserForm') {
                e.preventDefault();
                await handleUserEdit(e.target);
            }
        });
    }
});

async function handleUserEdit(form) {
    try {
        // Get form data
        const userId = document.getElementById('userId').value;
        const plan = document.getElementById('editPlan').value;

        console.log('Saving subscription data:', { userId, plan });

        // For now, only update subscription data since we're not sure about profiles table structure
        // The profiles table might not have the columns we expect

        // Handle subscription data - simplified approach
        if (plan && plan !== 'free') {
            const supabase = window.AdminState.supabase;
            
            // Try to get existing subscription
            let existingSub = null;
            
            try {
                const result = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', userId)
                    .single();
                    
                if (!result.error) {
                    existingSub = result.data;
                }
            } catch (error) {
                console.log('No existing subscription found:', error);
            }

            const planPrices = {
                'beginner': 9.99,
                'advanced': 29.99,
                'premium': 49.99
            };

            const subscriptionData = {
                user_id: userId,
                plan_type: plan,
                billing_type: 'monthly',
                status: 'active',
                amount: planPrices[plan] || 0,
                currency: 'EUR'
            };

            if (existingSub) {
                // Update existing subscription
                try {
                    const { error } = await supabase
                        .from('subscriptions')
                        .update({
                            plan_type: plan,
                            billing_type: 'monthly',
                            status: 'active',
                            amount: planPrices[plan] || 0,
                            currency: 'EUR'
                        })
                        .eq('user_id', userId);

                    if (error) {
                        console.error('Subscription update error:', error);
                        alert('Impossible de mettre à jour l\'abonnement: ' + error.message);
                    } else {
                        console.log('Subscription updated successfully');
                    }
                } catch (error) {
                    console.error('Error updating subscription:', error);
                    alert('Erreur lors de la mise à jour de l\'abonnement');
                }
            } else {
                // Create new subscription
                try {
                    const { error } = await supabase
                        .from('subscriptions')
                        .insert([{
                            user_id: userId,
                            plan_type: plan,
                            billing_type: 'monthly',
                            status: 'active',
                            amount: planPrices[plan] || 0,
                            currency: 'EUR'
                        }]);

                    if (error) {
                        console.error('Subscription insert error:', error);
                        alert('Impossible de créer l\'abonnement: ' + error.message);
                    } else {
                        console.log('Subscription created successfully');
                    }
                } catch (error) {
                    console.error('Error creating subscription:', error);
                    alert('Erreur lors de la création de l\'abonnement');
                }
            }
        } else if (plan === 'free') {
            // Remove subscription if switching to free plan
            try {
                const { error } = await window.AdminState.supabase
                    .from('subscriptions')
                    .delete()
                    .eq('user_id', userId);

                if (error && error.code !== 'PGRST116') {
                    console.error('Subscription delete error:', error);
                    alert('Impossible de supprimer l\'abonnement: ' + error.message);
                } else {
                    console.log('Subscription deleted or none existed');
                }
            } catch (error) {
                console.error('Error deleting subscription:', error);
                console.log('Note: Could not delete subscription, might not exist');
            }
        }

        // Close modal and refresh user list
        closeModal('userActionModal');
        
        // Show success message
        console.log('User updated successfully');
        
        // Reload users to show updated data
        if (window.userManager) {
            window.userManager.loadUsers(window.userManager.currentPage);
        }
        
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Erreur lors de la mise à jour: ' + (error.message || 'Erreur inconnue'));
    }
}