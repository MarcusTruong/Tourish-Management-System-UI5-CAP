// app/tourish-ui/webapp/utils/PermissionHelper.js
sap.ui.define([], function () {
    "use strict";

    /**
     * Complete Permission Helper for Tourism Management System
     * Handles all role-based access control, UI visibility, and navigation permissions
     */
    return {

        /**
         * Role hierarchy and detailed capabilities
         */
        ROLES: {
            Admin: {
                level: 4,
                name: "Administrator",
                capabilities: [
                    'manageUsers', 'manageWorkspace', 'manageTours', 'manageCustomers', 
                    'manageOrders', 'manageSuppliers', 'manageFinance', 'viewReports',
                    'systemSettings', 'userPermissions', 'dataExport', 'systemLogs'
                ],
                description: "Full system access and user management"
            },
            Manager: {
                level: 3,
                name: "Manager",
                capabilities: [
                    'manageTours', 'manageCustomers', 'manageOrders', 'manageSuppliers', 
                    'viewReports', 'approveOrders', 'viewFinanceReports'
                ],
                description: "Business operations management without user administration"
            },
            Staff: {
                level: 2,
                name: "Staff Member",
                capabilities: [
                    'manageSuppliers', 'manageOrders', 'manageCustomers', 'viewTours',
                    'processBookings', 'customerSupport'
                ],
                description: "Daily operations and customer service"
            },
            Accountant: {
                level: 2,
                name: "Accountant",
                capabilities: [
                    'manageFinance', 'viewReports', 'viewOrders', 'viewCustomers',
                    'managePayments', 'generateInvoices', 'auditTrails'
                ],
                description: "Financial and accounting operations"
            }
        },

        /**
         * Feature permissions matrix
         */
        FEATURES: {
            // User Management
            USER_CREATE: ['Admin'],
            USER_EDIT: ['Admin'],
            USER_DELETE: ['Admin'],
            USER_VIEW: ['Admin'],
            
            // Workspace Management
            WORKSPACE_MANAGE: ['Admin'],
            WORKSPACE_SETTINGS: ['Admin'],
            
            // Tour Management
            TOUR_CREATE: ['Admin', 'Manager'],
            TOUR_EDIT: ['Admin', 'Manager'],
            TOUR_DELETE: ['Admin', 'Manager'],
            TOUR_VIEW: ['Admin', 'Manager', 'Staff', 'Accountant'],
            TOUR_PUBLISH: ['Admin', 'Manager'],
            
            // Customer Management
            CUSTOMER_CREATE: ['Admin', 'Manager', 'Staff'],
            CUSTOMER_EDIT: ['Admin', 'Manager', 'Staff'],
            CUSTOMER_DELETE: ['Admin', 'Manager'],
            CUSTOMER_VIEW: ['Admin', 'Manager', 'Staff', 'Accountant'],
            
            // Order Management
            ORDER_CREATE: ['Admin', 'Manager', 'Staff'],
            ORDER_EDIT: ['Admin', 'Manager', 'Staff'],
            ORDER_DELETE: ['Admin', 'Manager'],
            ORDER_VIEW: ['Admin', 'Manager', 'Staff', 'Accountant'],
            ORDER_APPROVE: ['Admin', 'Manager'],
            
            // Supplier Management
            SUPPLIER_CREATE: ['Admin', 'Manager', 'Staff'],
            SUPPLIER_EDIT: ['Admin', 'Manager', 'Staff'],
            SUPPLIER_DELETE: ['Admin', 'Manager'],
            SUPPLIER_VIEW: ['Admin', 'Manager', 'Staff', 'Accountant'],
            
            // Financial Management
            FINANCE_VIEW: ['Admin', 'Accountant'],
            FINANCE_EDIT: ['Admin', 'Accountant'],
            PAYMENT_PROCESS: ['Admin', 'Accountant'],
            INVOICE_GENERATE: ['Admin', 'Accountant'],
            
            // Reporting
            REPORTS_FINANCIAL: ['Admin', 'Manager', 'Accountant'],
            REPORTS_OPERATIONAL: ['Admin', 'Manager'],
            REPORTS_EXPORT: ['Admin', 'Manager', 'Accountant'],
            
            // System Features
            SYSTEM_LOGS: ['Admin'],
            DATA_EXPORT: ['Admin'],
            SYSTEM_SETTINGS: ['Admin']
        },

        // =========================
        // CORE USER METHODS
        // =========================

        /**
         * Get current user information from session
         * @returns {Object|null} User object with role information
         */
        getCurrentUser: function() {
            try {
                // Try multiple session storage keys for compatibility
                const sessionKeys = ['tourishUserSession', 'auth'];
                
                for (const key of sessionKeys) {
                    const session = localStorage.getItem(key);
                    if (session) {
                        const sessionData = JSON.parse(session);
                        if (sessionData.user) {
                            return sessionData.user;
                        }
                    }
                }
                return null;
            } catch (error) {
                console.error("Error getting current user:", error);
                return null;
            }
        },

        /**
         * Get current user role
         * @returns {string|null} Current user role
         */
        getCurrentUserRole: function() {
            const user = this.getCurrentUser();
            return user?.Role || null;
        },

        /**
         * Get role information
         * @param {string} role - Role name
         * @returns {Object|null} Role information object
         */
        getRoleInfo: function(role) {
            return this.ROLES[role] || null;
        },

        // =========================
        // ROLE CHECKING METHODS
        // =========================

        /**
         * Check if current user has specific role
         * @param {string} role - Role to check
         * @returns {boolean} True if user has the role
         */
        isRole: function(role) {
            return this.getCurrentUserRole() === role;
        },

        /**
         * Check if current user is Admin
         * @returns {boolean} True if user is Admin
         */
        isAdmin: function() {
            return this.isRole('Admin');
        },

        /**
         * Check if current user is Manager
         * @returns {boolean} True if user is Manager
         */
        isManager: function() {
            return this.isRole('Manager');
        },

        /**
         * Check if current user is Staff
         * @returns {boolean} True if user is Staff
         */
        isStaff: function() {
            return this.isRole('Staff');
        },

        /**
         * Check if current user is Accountant
         * @returns {boolean} True if user is Accountant
         */
        isAccountant: function() {
            return this.isRole('Accountant');
        },

        /**
         * Check if user has minimum role level
         * @param {string} requiredRole - Required minimum role
         * @returns {boolean} True if user meets minimum role requirement
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
         * @returns {boolean} True if user has the capability
         */
        canDo: function(capability) {
            const currentRole = this.getCurrentUserRole();
            if (!currentRole) return false;

            const roleData = this.ROLES[currentRole];
            return roleData ? roleData.capabilities.includes(capability) : false;
        },

        /**
         * Check if user has access to specific feature
         * @param {string} feature - Feature key from FEATURES constant
         * @returns {boolean} True if user has access to feature
         */
        hasFeatureAccess: function(feature) {
            const currentRole = this.getCurrentUserRole();
            if (!currentRole) return false;

            const allowedRoles = this.FEATURES[feature];
            return allowedRoles ? allowedRoles.includes(currentRole) : false;
        },

        /**
         * Check multiple roles at once
         * @param {Array} roles - Array of roles to check
         * @returns {boolean} True if user has any of the specified roles
         */
        hasAnyRole: function(roles) {
            const currentRole = this.getCurrentUserRole();
            return Array.isArray(roles) ? roles.includes(currentRole) : false;
        },

        /**
         * Check if user is in management tier (Admin or Manager)
         * @returns {boolean} True if user is Admin or Manager
         */
        isManagement: function() {
            return this.hasAnyRole(['Admin', 'Manager']);
        },

        /**
         * Check if user has finance access (Admin or Accountant)
         * @returns {boolean} True if user has finance access
         */
        hasFinanceAccess: function() {
            return this.hasAnyRole(['Admin', 'Accountant']);
        },

        /**
         * Check if user has tour access (Admin or Manager)
         * @returns {boolean} True if user has tour access
         */
        hasTourAccess: function() {
            return this.hasAnyRole(['Admin', 'Manager']);
        },

        /**
         * Check if user has operational access (Admin, Manager, Staff)
         * @returns {boolean} True if user has operational access
         */
        hasOperationalAccess: function() {
            return this.hasAnyRole(['Admin', 'Manager', 'Staff']);
        },

        /**
         * Check if user has analytics access (Admin, Manager, Accountant)
         * @returns {boolean} True if user has analytics access
         */
        hasAnalyticsAccess: function() {
            return this.hasAnyRole(['Admin', 'Manager', 'Accountant']);
        },

        // =========================
        // UI CONTROL METHODS
        // =========================

        /**
         * Show/hide control based on role
         * @param {sap.ui.core.Control} control - UI control
         * @param {Array|string} allowedRoles - Allowed roles
         */
        showForRoles: function(control, allowedRoles) {
            if (!control) return;

            const currentRole = this.getCurrentUserRole();
            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
            const isAllowed = roles.includes(currentRole);

            control.setVisible(isAllowed);
            console.log(`🎭 ${control.getId ? control.getId() : 'Control'} visible for [${roles.join(', ')}]: ${isAllowed} (user: ${currentRole})`);
        },

        /**
         * Show/hide control based on feature access
         * @param {sap.ui.core.Control} control - UI control
         * @param {string} feature - Feature key
         */
        showForFeature: function(control, feature) {
            if (!control) return;

            const hasAccess = this.hasFeatureAccess(feature);
            control.setVisible(hasAccess);
            
            console.log(`🔑 ${control.getId ? control.getId() : 'Control'} feature ${feature}: ${hasAccess}`);
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
         * Enable/disable control based on permissions
         * @param {sap.ui.core.Control} control - UI control
         * @param {Array|string} allowedRoles - Allowed roles
         */
        enableForRoles: function(control, allowedRoles) {
            if (!control) return;

            const currentRole = this.getCurrentUserRole();
            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
            const isAllowed = roles.includes(currentRole);

            control.setEnabled(isAllowed);
            console.log(`🔧 ${control.getId ? control.getId() : 'Control'} enabled for [${roles.join(', ')}]: ${isAllowed} (user: ${currentRole})`);
        },

        // =========================
        // CONVENIENCE METHODS
        // =========================

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
         * Show control for Staff level and above
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

        // =========================
        // NAVIGATION METHODS
        // =========================

        /**
         * Filter navigation items based on user role
         * @param {Array} navigationItems - Array of navigation items
         * @param {string} userRole - Current user role
         * @returns {Array} Filtered navigation items
         */
        filterNavigationByRole: function(navigationItems, userRole) {
            if (!Array.isArray(navigationItems) || !userRole) {
                return navigationItems || [];
            }
            
            return navigationItems.filter(item => {
                // Check if user has permission for this item
                if (item.allowedRoles && !item.allowedRoles.includes(userRole)) {
                    return false; // Hide this item
                }
                
                // Filter sub-items if they exist
                if (item.items && Array.isArray(item.items)) {
                    item.items = this.filterNavigationByRole(item.items, userRole);
                    
                    // Hide parent if no visible children
                    if (item.items.length === 0 && item.allowedRoles && item.allowedRoles.length > 0) {
                        return item.allowedRoles.includes(userRole);
                    }
                }
                
                return true; // Show this item
            });
        },

        /**
         * Check if user can access specific navigation item
         * @param {Object} navigationItem - Navigation item object
         * @param {string} userRole - Current user role
         * @returns {boolean} True if user can access
         */
        canAccessNavigationItem: function(navigationItem, userRole) {
            if (!navigationItem || !userRole) return false;
            
            // If no allowedRoles specified, allow access
            if (!navigationItem.allowedRoles) return true;
            
            return navigationItem.allowedRoles.includes(userRole);
        },

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
                    case 'tourTemplates':
                    case 'activeTours':
                        visible = this.isManagement();
                        break;
                    case 'customerManagement':
                    case 'orderManagement':
                    case 'supplierManagement':
                        visible = this.hasOperationalAccess();
                        break;
                    case 'financialAccounting':
                    case 'payments':
                    case 'debts':
                        visible = this.hasFinanceAccess();
                        break;
                    case 'reports':
                        visible = this.hasAnalyticsAccess();
                        break;
                    case 'dashboard':
                    case 'myProfile':
                        visible = true; // Everyone can see these
                        break;
                }

                item.setVisible(visible);
                console.log(`📌 Navigation item ${key}: ${visible ? 'visible' : 'hidden'}`);
            });
        },

        /**
         * Validate if current user can access a route
         * @param {string} routeName - Route name
         * @returns {boolean} True if user can access route
         */
        canAccessRoute: function(routeName) {
            const routePermissions = {
                "dashboard": ["Admin", "Manager", "Staff", "Accountant"],
                "myProfile": ["Admin", "Manager", "Staff", "Accountant"],
                "userManagement": ["Admin"],
                "workspace": ["Admin"],
                "tourTemplates": ["Admin", "Manager"],
                "createSampleTour": ["Admin", "Manager"],
                "activeTours": ["Admin", "Manager"],
                "saleTour": ["Admin", "Manager"],
                "customer": ["Admin", "Manager", "Staff"],
                "customers": ["Admin", "Manager", "Staff"],
                "orders": ["Admin", "Manager", "Staff"],
                "orderManagement": ["Admin", "Manager", "Staff"],
                "suppliers": ["Admin", "Manager", "Staff"],
                "supplierInformation": ["Admin", "Manager", "Staff"],
                "supplierDetail": ["Admin", "Manager", "Staff"],
                "services": ["Admin", "Manager", "Staff"],
                "report": ["Admin", "Manager", "Accountant"],
                "financialReports": ["Admin", "Manager", "Accountant"],
                "payments": ["Admin", "Accountant"],
                "debt": ["Admin", "Accountant"],
                "settings": ["Admin"]
            };

            const allowedRoles = routePermissions[routeName] || [];
            return this.hasAnyRole(allowedRoles);
        },

        // =========================
        // PAGE CONTROL METHODS
        // =========================

        /**
         * Apply role-based visibility to page controls
         * @param {sap.ui.core.mvc.View} oView - View containing controls
         * @param {Object} oControlConfig - Control configuration object
         * Example: {
         *   "addButton": { roles: ["Admin", "Manager"] },
         *   "deleteButton": { roles: ["Admin"] },
         *   "editButton": { roles: ["Admin", "Manager", "Staff"] }
         * }
         */
        applyPageControlPermissions: function(oView, oControlConfig) {
            if (!oView || !oControlConfig) return;
            
            const sUserRole = this.getCurrentUserRole();
            
            Object.keys(oControlConfig).forEach(sControlId => {
                const oControl = oView.byId(sControlId);
                const oConfig = oControlConfig[sControlId];
                
                if (oControl && oConfig) {
                    if (oConfig.roles) {
                        this.showForRoles(oControl, oConfig.roles);
                    }
                    
                    if (oConfig.enabled) {
                        this.enableForRoles(oControl, oConfig.enabled);
                    }
                    
                    if (oConfig.feature) {
                        this.showForFeature(oControl, oConfig.feature);
                    }
                }
            });
            
            console.log(`🔧 Applied permissions to page controls for role: ${sUserRole}`);
        },

        // =========================
        // DASHBOARD-SPECIFIC METHODS
        // =========================

        /**
         * Dashboard-specific permission checks
         */
        dashboard: {
            /**
             * Check if user can see financial KPIs
             * @returns {boolean} True if user can see financial data
             */
            canViewFinancialKPIs: function() {
                return ['Admin', 'Accountant'].includes(PermissionHelper.getCurrentUserRole());
            },
            
            /**
             * Check if user can see detailed profit information
             * @returns {boolean} True if user can see profit details
             */
            canViewProfitDetails: function() {
                return ['Admin', 'Manager', 'Accountant'].includes(PermissionHelper.getCurrentUserRole());
            },
            
            /**
             * Check if user can see tour management KPIs
             * @returns {boolean} True if user can see tour KPIs
             */
            canViewTourKPIs: function() {
                return ['Admin', 'Manager'].includes(PermissionHelper.getCurrentUserRole());
            },
            
            /**
             * Check if user can see operational KPIs (customers, orders, suppliers)
             * @returns {boolean} True if user can see operational KPIs
             */
            canViewOperationalKPIs: function() {
                return ['Admin', 'Manager', 'Staff'].includes(PermissionHelper.getCurrentUserRole());
            },
            
            /**
             * Check if user can run automated processes
             * @returns {boolean} True if user can run automation
             */
            canRunAutomation: function() {
                return ['Admin', 'Manager'].includes(PermissionHelper.getCurrentUserRole());
            },
            
            /**
             * Check if user can access workspace settings
             * @returns {boolean} True if user can access workspace
             */
            canAccessWorkspace: function() {
                return PermissionHelper.getCurrentUserRole() === 'Admin';
            },
            
            /**
             * Check if user can see customer analytics
             * @returns {boolean} True if user can see customer data
             */
            canViewCustomerAnalytics: function() {
                return ['Admin', 'Manager', 'Staff'].includes(PermissionHelper.getCurrentUserRole());
            },
            
            /**
             * Check if user can see supplier analytics
             * @returns {boolean} True if user can see supplier data
             */
            canViewSupplierAnalytics: function() {
                return ['Admin', 'Manager', 'Staff'].includes(PermissionHelper.getCurrentUserRole());
            },
            
            /**
             * Get allowed dashboard sections for current user
             * @returns {Array} Array of allowed section names
             */
            getAllowedSections: function() {
                const sUserRole = PermissionHelper.getCurrentUserRole();
                const oSectionPermissions = {
                    'Admin': ['financial', 'tours', 'operational', 'workspace', 'users', 'analytics'],
                    'Manager': ['financial', 'tours', 'operational', 'analytics'],
                    'Staff': ['operational', 'basicAnalytics'],
                    'Accountant': ['financial', 'payments', 'basicAnalytics']
                };
                
                return oSectionPermissions[sUserRole] || ['basic'];
            },
            
            /**
             * Check if user should see simplified dashboard
             * @returns {boolean} True if user should see simplified version
             */
            shouldShowSimplifiedDashboard: function() {
                return ['Staff'].includes(PermissionHelper.getCurrentUserRole());
            }
        },

        // =========================
        // QUICK ACCESS PERMISSIONS
        // =========================

        /**
         * Quick permission check for common scenarios
         */
        permissions: {
            canManageUsers: function() {
                return PermissionHelper.getCurrentUserRole() === 'Admin';
            },
            
            canManageTours: function() {
                return ['Admin', 'Manager'].includes(PermissionHelper.getCurrentUserRole());
            },
            
            canManageCustomers: function() {
                return ['Admin', 'Manager', 'Staff'].includes(PermissionHelper.getCurrentUserRole());
            },
            
            canManageOrders: function() {
                return ['Admin', 'Manager', 'Staff'].includes(PermissionHelper.getCurrentUserRole());
            },
            
            canManageSuppliers: function() {
                return ['Admin', 'Manager', 'Staff'].includes(PermissionHelper.getCurrentUserRole());
            },
            
            canManageFinance: function() {
                return ['Admin', 'Accountant'].includes(PermissionHelper.getCurrentUserRole());
            },
            
            canViewReports: function() {
                return ['Admin', 'Manager', 'Accountant'].includes(PermissionHelper.getCurrentUserRole());
            },
            
            canExportData: function() {
                return ['Admin', 'Manager'].includes(PermissionHelper.getCurrentUserRole());
            },
            
            canImportData: function() {
                return ['Admin'].includes(PermissionHelper.getCurrentUserRole());
            },
            
            canAccessSystemSettings: function() {
                return PermissionHelper.getCurrentUserRole() === 'Admin';
            }
        },

        // =========================
        // UTILITY METHODS
        // =========================

        /**
         * Get user capabilities for display
         * @returns {Array} Array of capability descriptions
         */
        getUserCapabilities: function() {
            const currentRole = this.getCurrentUserRole();
            if (!currentRole) return [];

            const roleData = this.ROLES[currentRole];
            return roleData ? roleData.capabilities : [];
        },

        /**
         * Get role display information
         * @returns {Object} Role display information
         */
        getRoleDisplayInfo: function() {
            const currentRole = this.getCurrentUserRole();
            if (!currentRole) return null;

            const roleData = this.ROLES[currentRole];
            return roleData ? {
                role: currentRole,
                name: roleData.name,
                level: roleData.level,
                description: roleData.description,
                capabilities: roleData.capabilities
            } : null;
        },

        /**
         * Get permission summary for current user
         * @returns {Object} Permission summary object
         */
        getPermissionSummary: function() {
            const currentRole = this.getCurrentUserRole();
            const user = this.getCurrentUser();
            
            return {
                user: user,
                role: currentRole,
                roleInfo: this.getRoleInfo(currentRole),
                capabilities: this.getUserCapabilities(),
                hasFinanceAccess: this.hasFinanceAccess(),
                hasTourAccess: this.hasTourAccess(),
                hasOperationalAccess: this.hasOperationalAccess(),
                canManageUsers: this.permissions.canManageUsers(),
                allowedRoutes: this._getAllowedRoutes()
            };
        },

        /**
         * Get all routes current user can access
         * @returns {Array} Array of allowed route names
         * @private
         */
        _getAllowedRoutes: function() {
            const allRoutes = [
                "dashboard", "myProfile", "userManagement", "workspace",
                "tourTemplates", "createSampleTour", "activeTours", "saleTour",
                "customer", "customers", "orders", "orderManagement",
                "suppliers", "supplierInformation", "supplierDetail", "services",
                "report", "financialReports", "payments", "debt", "settings"
            ];
            
            return allRoutes.filter(route => this.canAccessRoute(route));
        },

        // =========================
        // DEBUG METHODS
        // =========================

        /**
         * Log current user permissions for debugging
         */
        debugPermissions: function() {
            if (console && console.group) {
                const summary = this.getPermissionSummary();
                
                console.group("🔐 Current User Permissions");
                console.log("User:", summary.user);
                console.log("Role Info:", summary.roleInfo);
                console.log("Capabilities:", summary.capabilities);
                console.log("Finance Access:", summary.hasFinanceAccess);
                console.log("Tour Access:", summary.hasTourAccess);
                console.log("Operational Access:", summary.hasOperationalAccess);
                console.log("Can Manage Users:", summary.canManageUsers);
                console.log("Allowed Routes:", summary.allowedRoutes);
                console.groupEnd();
            }
        },

        /**
         * Test specific permission
         * @param {string} permission - Permission to test
         * @returns {Object} Test result
         */
        testPermission: function(permission) {
            const hasAccess = this.hasFeatureAccess(permission);
            const currentRole = this.getCurrentUserRole();
            
            return {
                permission: permission,
                userRole: currentRole,
                hasAccess: hasAccess,
                allowedRoles: this.FEATURES[permission] || []
            };
        },

        /**
         * Validate permission system integrity
         * @returns {Object} Validation result
         */
        validateSystem: function() {
            const issues = [];
            const currentUser = this.getCurrentUser();
            const currentRole = this.getCurrentUserRole();
            
            // Check if user is logged in
            if (!currentUser) {
                issues.push("No user found in session");
            }
            
            // Check if role is valid
            if (!currentRole || !this.ROLES[currentRole]) {
                issues.push(`Invalid role: ${currentRole}`);
            }
            
            // Check if session is consistent
            try {
                const sessionKeys = ['tourishUserSession', 'auth'];
                let sessionCount = 0;
                sessionKeys.forEach(key => {
                    if (localStorage.getItem(key)) sessionCount++;
                });
                
                if (sessionCount === 0) {
                    issues.push("No session data found");
                } else if (sessionCount > 1) {
                    issues.push("Multiple session keys found - may cause conflicts");
                }
            } catch (e) {
                issues.push("Session validation error: " + e.message);
            }
            
            return {
                valid: issues.length === 0,
                issues: issues,
                user: currentUser,
                role: currentRole,
                timestamp: new Date()
            };
        }
    };
});