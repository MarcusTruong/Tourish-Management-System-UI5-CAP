// app/tourish-ui/webapp/controller/AppContent.controller.js
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "../utils/PermissionHelper"
], function (Controller, MessageBox, JSONModel, PermissionHelper) {
    "use strict";

    return Controller.extend("tourishui.controller.AppContent", {
        onInit: function () {
            console.log("AppContent Controller initialized");
            
            // Initialize navigation with role-based filtering
            this._initializeRoleBasedNavigation();
            
            // Setup router
            this._setupRouter();
            
            // Apply role-based visibility to header menu
            this._applyHeaderPermissions();
        },

        /**
         * Initialize navigation based on user role
         * @private
         */
        _initializeRoleBasedNavigation: function() {
            // Get current user role
            const sUserRole = PermissionHelper.getCurrentUserRole();
            console.log(`Current user role: ${sUserRole}`);
            
            if (!sUserRole) {
                console.warn("No user role found, redirecting to login");
                this.getOwnerComponent().getRouter().navTo("login");
                return;
            }
            
            // Load original navigation data
            const oOriginalSideModel = this.getOwnerComponent().getModel("side");
            const aOriginalNavigation = oOriginalSideModel.getProperty("/navigation");
            
            // Filter navigation based on role
            const aFilteredNavigation = PermissionHelper.filterNavigationByRole(aOriginalNavigation, sUserRole);
            
            // Create new model with filtered navigation
            const oFilteredSideModel = new JSONModel({
                selectedKey: "dashboard",
                navigation: aFilteredNavigation
            });
            
            // Set the filtered model
            this.getView().setModel(oFilteredSideModel, "side");
            
            // Bind auth model for user info
            const oSessionManager = this.getOwnerComponent().getSessionManager();
            const oAuthModel = oSessionManager.getAuthModel();
            this.getView().setModel(oAuthModel, "auth");
            
            console.log(`🎭 Navigation filtered for role: ${sUserRole}`, aFilteredNavigation);
        },

        /**
         * Apply permissions to header menu items
         * @private
         */
        _applyHeaderPermissions: function() {
            const sUserRole = PermissionHelper.getCurrentUserRole();
            
            // Wait for view to be rendered
            setTimeout(() => {
                // Hide "My Workspace" menu item for non-Admin users
                const oUserMenu = this.byId("_IDGenMenu");
                if (oUserMenu) {
                    const aMenuItems = oUserMenu.getItems();
                    aMenuItems.forEach(oMenuItem => {
                        const sKey = oMenuItem.getKey();
                        
                        // Hide workspace menu for non-Admin
                        if (sKey === "myWorkspace" && sUserRole !== "Admin") {
                            oMenuItem.setVisible(false);
                            console.log("🔒 Hidden 'My Workspace' menu for non-Admin user");
                        }
                    });
                }
            }, 100);
        },

        /**
         * Setup router for route matching
         * @private
         */
        _setupRouter: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            
            // Basic routes that should work
            oRouter.getRoute("dashboard").attachMatched(this._onRouteMatched, this);
            oRouter.getRoute("myProfile").attachMatched(this._onRouteMatched, this);
            
            // Only attach routes if they exist
            const aRoutes = ["supplierInformation", "supplierDetail", "myWorkspace"];
            aRoutes.forEach(sRoute => {
                const oRoute = oRouter.getRoute(sRoute);
                if (oRoute) {
                    oRoute.attachMatched(this._onRouteMatched, this);
                }
            });
        },

        /**
         * Handle route matching with permission check
         * @param {sap.ui.base.Event} oEvent - Route matched event
         * @private
         */
        _onRouteMatched: function (oEvent) {
            var sRouteName = oEvent.getParameter("name");
            var oMainContents = this.getView().byId("mainContents");
            
            console.log(`🧭 Route matched: ${sRouteName}`);
            
            // Check if user has permission to access this route
            if (!this._checkRouteAccess(sRouteName)) {
                console.warn(`Access denied to route: ${sRouteName}`);
                MessageBox.error("You don't have permission to access this page.", {
                    title: "Access Denied",
                    onClose: () => {
                        this.getOwnerComponent().getRouter().navTo("dashboard");
                    }
                });
                return;
            }
            
            // Navigate to the view
            try {
                oMainContents.to(this.getView().createId(sRouteName));
                
                // Update selected key in side navigation
                const oSideModel = this.getView().getModel("side");
                if (oSideModel) {
                    oSideModel.setProperty("/selectedKey", sRouteName);
                }
                
            } catch (e) {
                console.error(`Error navigating to view: ${sRouteName}`, e);
                MessageBox.error("Page not found or error loading page.");
            }
        },

        /**
         * Check if current user can access specific route
         * @param {string} sRouteName - Route name
         * @returns {boolean} True if user can access
         * @private
         */
        _checkRouteAccess: function(sRouteName) {
            const sUserRole = PermissionHelper.getCurrentUserRole();
            
            // Define route permissions (simple mapping)
            const oRoutePermissions = {
                "dashboard": ["Admin", "Manager", "Staff", "Accountant"],
                "myProfile": ["Admin", "Manager", "Staff", "Accountant"],
                "myWorkspace": ["Admin"],
                "createSampleTour": ["Admin", "Manager"],
                "saleTour": ["Admin", "Manager"],
                "customer": ["Admin", "Manager", "Staff"],
                "orders": ["Admin", "Manager", "Staff"],
                "suppliers": ["Admin", "Manager", "Staff"],
                "supplierInformation": ["Admin", "Manager", "Staff"],
                "supplierDetail": ["Admin", "Manager", "Staff"],
                "services": ["Admin", "Manager", "Staff"],
                "report": ["Admin", "Manager", "Accountant"],
                "debt": ["Admin", "Accountant"]
            };
            
            const aAllowedRoles = oRoutePermissions[sRouteName];
            
            // If no specific permissions defined, allow access
            if (!aAllowedRoles) {
                return true;
            }
            
            return aAllowedRoles.includes(sUserRole);
        },

        /**
         * Handle side navigation toggle
         */
        onSideNavButtonPress: function () {
            var oToolPage = this.getView().byId("toolPage");
            var bSideExpanded = oToolPage.getSideExpanded();
            oToolPage.setSideExpanded(!bSideExpanded);
        },

        /**
         * Handle user menu item press with role checking
         * @param {sap.ui.base.Event} oEvent - Menu item press event
         */
        onMenuItemPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var sKey = oItem.getKey();
            
            console.log("Menu item pressed:", sKey);
            
            var oRouter = this.getOwnerComponent().getRouter();
            var oSessionManager = this.getOwnerComponent().getSessionManager();
            const sUserRole = PermissionHelper.getCurrentUserRole();

            switch (sKey) {
                case "myWorkspace":
                    // Double-check permission for workspace
                    if (sUserRole === "Admin") {
                        oRouter.navTo("myWorkspace", {}, false);
                    } else {
                        MessageBox.error("Only Admin users can access workspace management.");
                    }
                    break;
                    
                case "myProfile":
                    oRouter.navTo("myProfile", {}, false);
                    break;
                    
                case "logout":
                    MessageBox.confirm("Are you sure you want to logout?", {
                        title: "Confirm Logout",
                        onClose: (sAction) => {
                            if (sAction === MessageBox.Action.OK) {
                                oSessionManager.clearSession();
                                MessageBox.success("Logged out successfully!");
                                oRouter.navTo("login", {}, true);
                                window.location.reload();
                            }
                        }
                    });
                    break;
                    
                default:
                    MessageBox.information("Feature not implemented yet!");
            }
        },

        /**
         * Handle navigation list item selection
         * @param {sap.ui.base.Event} oEvent - Item press event
         */
        onItemSelect: function(oEvent) {
            const oItem = oEvent.getParameter("item");
            const sKey = oItem.getKey();
            
            console.log(`🔗 Navigation item selected: ${sKey}`);
            
            // Navigate to selected route
            const oRouter = this.getOwnerComponent().getRouter();
            
            try {
                oRouter.navTo(sKey, {}, false);
            } catch (e) {
                console.error(`Error navigating to: ${sKey}`, e);
                MessageBox.information(`Feature "${oItem.getText()}" is not available yet.`);
            }
        },

        /**
         * Refresh navigation when user role changes (useful for dynamic role updates)
         * @public
         */
        refreshNavigation: function() {
            console.log("Refreshing navigation...");
            this._initializeRoleBasedNavigation();
            this._applyHeaderPermissions();
        },

        /**
         * Get current user role for external access
         * @public
         * @returns {string} Current user role
         */
        getCurrentUserRole: function() {
            return PermissionHelper.getCurrentUserRole();
        }
    });
});