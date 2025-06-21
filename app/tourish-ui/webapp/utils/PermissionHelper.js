// app/tourish-ui/webapp/utils/PermissionHelper.js
sap.ui.define([], function () {
    "use strict";

    /**
     * Simple Permission Helper
     * Basic role-based UI control without complex permission matrix
     */
    return {

        /**
         * Role hierarchy and capabilities
         */
        ROLES: {
            Admin: {
                level: 4,
                capabilities: [
                    'manageUsers', 'manageWorkspace', 'manageTours', 'manageCustomers', 
                    'manageOrders', 'manageSuppliers', 'manageFinance', 'viewReports'
                ]
            },
            Manager: {
                level: 3,
                capabilities: [
                    'manageTours', 'manageCustomers', 'manageOrders', 'manageSuppliers', 'viewReports'
                ]
            },
            Staff: {
                level: 2,
                capabilities: [
                    'manageSuppliers', 'manageOrders', 'viewTours'
                ]
            },
            Accountant: {
                level: 2,
                capabilities: [
                    'manageFinance', 'viewReports', 'viewOrders', 'viewCustomers'
                ]
            }
        },

        /**
         * Get current user role from session
         * @returns {string} User role
         */
        getCurrentUserRole: function() {
            try {
                // Get from localStorage
                const session = localStorage.getItem('tourishUserSession');
                if (session) {
                    const sessionData = JSON.parse(session);
                    return sessionData.user?.Role || null;
                }
                return null;
            } catch (error) {
                console.error("Error getting user role:", error);
                return null;
            }
        },

        /**
         * Check if current user is specific role
         * @param {string} role - Role to check
         * @returns {boolean}
         */
        isRole: function(role) {
            return this.getCurrentUserRole() === role;
        },

        /**
         * Check if current user is Admin
         * @returns {boolean}
         */
        isAdmin: function() {
            return this.isRole('Admin');
        },

        /**
         * Check if current user is Manager
         * @returns {boolean}
         */
        isManager: function() {
            return this.isRole('Manager');
        },

        /**
         * Check if current user is Staff
         * @returns {boolean}
         */
        isStaff: function() {
            return this.isRole('Staff');
        },

        /**
         * Check if current user is Accountant
         * @returns {boolean}
         */
        isAccountant: function() {
            return this.isRole('Accountant');
        },

        /**
         * Check if user has minimum role level
         * @param {string} requiredRole - Required role
         * @returns {boolean}
         */
        hasMinimumRole: function(requiredRole) {
            const currentRole = this.getCurrentUserRole();
            if (!currentRole || !requiredRole) return false;

            const currentLevel = this.ROLES[currentRole]?.level || 0;
            const requiredLevel = this.ROLES[requiredRole]?.level || 999;

            return currentLevel >= requiredLevel;
        },

        /**
         * Check if user can perform specific capability
         * @param {string} capability - Capability to check
         * @returns {boolean}
         */
        canDo: function(capability) {
            const currentRole = this.getCurrentUserRole();
            if (!currentRole) return false;

            const roleData = this.ROLES[currentRole];
            return roleData ? roleData.capabilities.includes(capability) : false;
        },

        // ===== SPECIFIC CAPABILITY CHECKS =====

        canManageUsers: function() {
            return this.canDo('manageUsers'); // Only Admin
        },

        canManageWorkspace: function() {
            return this.canDo('manageWorkspace'); // Only Admin
        },

        canManageTours: function() {
            return this.canDo('manageTours'); // Admin, Manager
        },

        canManageCustomers: function() {
            return this.canDo('manageCustomers'); // Admin, Manager, Staff
        },

        canManageOrders: function() {
            return this.canDo('manageOrders'); // Admin, Manager, Staff
        },

        canManageSuppliers: function() {
            return this.canDo('manageSuppliers'); // Admin, Manager
        },

        canManageFinance: function() {
            return this.canDo('manageFinance'); // Admin, Accountant
        },

        canViewReports: function() {
            return this.canDo('viewReports'); // Admin, Manager, Accountant
        },

        // ===== UI CONTROL METHODS =====

        /**
         * Show/hide control based on role
         * @param {sap.ui.core.Control} control - UI control
         * @param {Array|string} allowedRoles - Allowed roles (array or single role)
         */
        showForRoles: function(control, allowedRoles) {
            if (!control) return;

            const currentRole = this.getCurrentUserRole();
            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
            const isAllowed = roles.includes(currentRole);

            control.setVisible(isAllowed);
            console.log(`🎭 ${control.getId()} visible for [${roles.join(', ')}]: ${isAllowed} (user: ${currentRole})`);
        },

        /**
         * Hide control for specific roles
         * @param {sap.ui.core.Control} control - UI control
         * @param {Array|string} hiddenRoles - Roles to hide for
         */
        hideForRoles: function(control, hiddenRoles) {
            if (!control) return;

            const currentRole = this.getCurrentUserRole();
            const roles = Array.isArray(hiddenRoles) ? hiddenRoles : [hiddenRoles];
            const shouldHide = roles.includes(currentRole);

            control.setVisible(!shouldHide);
        },

        /**
         * Show control only for Admin
         * @param {sap.ui.core.Control} control - UI control
         */
        adminOnly: function(control) {
            this.showForRoles(control, ['Admin']);
        },

        /**
         * Show control for Manager and above
         * @param {sap.ui.core.Control} control - UI control
         */
        managerAndAbove: function(control) {
            this.showForRoles(control, ['Admin', 'Manager']);
        },

        /**
         * Show control for Staff and above (everyone except Accountant in some contexts)
         * @param {sap.ui.core.Control} control - UI control
         */
        staffAndAbove: function(control) {
            this.showForRoles(control, ['Admin', 'Manager', 'Staff']);
        },

        /**
         * Show control for finance roles (Admin + Accountant)
         * @param {sap.ui.core.Control} control - UI control
         */
        financeOnly: function(control) {
            this.showForRoles(control, ['Admin', 'Accountant']);
        },

        // ===== BATCH UI CONFIGURATION =====

        /**
         * Configure navigation list based on role
         * @param {sap.tnt.NavigationList} navList - Navigation list
         */
        configureNavigation: function(navList) {
            if (!navList) return;

            const currentRole = this.getCurrentUserRole();
            console.log(`🧭 Configuring navigation for role: ${currentRole}`);

            // Get all navigation items
            const items = navList.getItems();

            items.forEach(item => {
                const key = item.getKey();
                let visible = true;

                // Configure visibility based on item key
                switch (key) {
                    case 'userManagement':
                    case 'workspace':
                        visible = this.isAdmin();
                        break;
                    case 'tourManagement':
                    case 'supplierManagement':
                        visible = this.isAdmin() || this.isManager();
                        break;
                    case 'customerManagement':
                    case 'orderManagement':
                        visible = this.isAdmin() || this.isManager() || this.isStaff();
                        break;
                    case 'financialManagement':
                    case 'reports':
                        visible = this.isAdmin() || this.isAccountant();
                        break;
                    case 'dashboard':
                    case 'profile':
                        visible = true; // Everyone can access
                        break;
                    default:
                        visible = true; // Default allow
                }

                item.setVisible(visible);
                console.log(`📋 Navigation ${key}: ${visible ? 'visible' : 'hidden'}`);
            });
        },

        /**
         * Configure table toolbar based on role and context
         * @param {sap.m.Table} table - Table control
         * @param {string} context - Context (tour, customer, order, etc.)
         */
        configureTableToolbar: function(table, context) {
            if (!table) return;

            const toolbar = table.getHeaderToolbar();
            if (!toolbar) return;

            console.log(`📋 Configuring table toolbar for context: ${context}`);

            // Get toolbar content
            const controls = toolbar.getContent();

            controls.forEach(control => {
                if (control.getMetadata().getName() === "sap.m.Button") {
                    const buttonId = control.getId();
                    const buttonText = control.getText().toLowerCase();
                    
                    let visible = true;

                    // Configure based on button type and context
                    if (buttonText.includes('create') || buttonText.includes('add') || buttonId.includes('create')) {
                        switch (context) {
                            case 'user':
                                visible = this.canManageUsers();
                                break;
                            case 'tour':
                                visible = this.canManageTours();
                                break;
                            case 'customer':
                                visible = this.canManageCustomers();
                                break;
                            case 'order':
                                visible = this.canManageOrders();
                                break;
                            case 'supplier':
                                visible = this.canManageSuppliers();
                                break;
                            default:
                                visible = true;
                        }
                    } else if (buttonText.includes('delete') || buttonText.includes('remove')) {
                        // Delete usually requires higher privileges
                        switch (context) {
                            case 'user':
                                visible = this.isAdmin();
                                break;
                            case 'tour':
                                visible = this.isAdmin() || this.isManager();
                                break;
                            case 'customer':
                            case 'order':
                                visible = this.isAdmin() || this.isManager();
                                break;
                            case 'supplier':
                                visible = this.isAdmin() || this.isManager();
                                break;
                            default:
                                visible = this.isAdmin();
                        }
                    }

                    control.setVisible(visible);
                    console.log(`🔘 Button ${buttonText} in ${context}: ${visible ? 'visible' : 'hidden'}`);
                }
            });
        },

        /**
         * Get welcome message based on role
         * @returns {string}
         */
        getWelcomeMessage: function() {
            const currentRole = this.getCurrentUserRole();
            
            // Try to get user name from session
            let userName = 'User';
            try {
                const session = localStorage.getItem('tourishUserSession');
                if (session) {
                    const sessionData = JSON.parse(session);
                    userName = sessionData.user?.FullName || sessionData.user?.Username || 'User';
                }
            } catch (error) {
                // Use default
            }

            const messages = {
                'Admin': `Welcome back, ${userName}! You have full system access.`,
                'Manager': `Hello ${userName}! Ready to manage your business operations?`,
                'Staff': `Hi ${userName}! Let's handle today's orders efficiently.`,
                'Accountant': `Welcome ${userName}! Time to review finances and reports.`
            };

            return messages[currentRole] || `Welcome, ${userName}!`;
        },

        /**
         * Debug: Print current user permissions
         */
        debugPermissions: function() {
            const role = this.getCurrentUserRole();
            console.log(`🔍 Current User Role: ${role}`);
            
            if (role && this.ROLES[role]) {
                console.log(`📋 Capabilities:`, this.ROLES[role].capabilities);
                console.log(`📊 Level:`, this.ROLES[role].level);
            }

            // Test all capabilities
            const capabilities = [
                'manageUsers', 'manageWorkspace', 'manageTours', 'manageCustomers',
                'manageOrders', 'manageSuppliers', 'manageFinance', 'viewReports'
            ];

            capabilities.forEach(cap => {
                console.log(`  ${cap}: ${this.canDo(cap) ? '✅' : '❌'}`);
            });
        }
    };
});