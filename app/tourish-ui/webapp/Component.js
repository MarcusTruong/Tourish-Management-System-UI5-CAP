sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "tourishui/model/SessionManager",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (UIComponent, Device, SessionManager, MessageBox, MessageToast) {
    "use strict";

    return UIComponent.extend("tourishui.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            // Call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // Initialize SessionManager
            this._oSessionManager = new SessionManager();
            
            // Set auth model to component
            this.setModel(this._oSessionManager.getAuthModel(), "auth");

            // Initialize router
            this.getRouter().initialize();

            // Check initial session and navigate
            this._checkInitialSession();
        },

        /**
         * Initialize OData models - only call after authentication
         * @private
         */
        _initODataModels: function() {
            const token = this._oSessionManager.getToken();
            
            if (!token) {
                console.warn("No token available, skipping OData model initialization");
                return;
            }

            console.log("Initializing OData models with token:", token.substring(0, 20) + "...");

            // // Function to create model with proper headers and request interceptor
            // const createModelWithAuth = (serviceUrl) => {
            //     const model = new sap.ui.model.odata.v4.ODataModel({
            //         serviceUrl: serviceUrl,
            //         synchronizationMode: "None",
            //         groupId: "$auto",
            //         operationMode: "Server",
            //         // Add default headers
            //         httpHeaders: {
            //             'customAuthorization': `Bearer ${token}`
            //         }
            //     });
                
            //     // Override the model's request method to always include auth header
            //     if (model.requestor && model.requestor.request) {
            //         const originalRequest = model.requestor.request.bind(model.requestor);
            //         model.requestor.request = function(sMethod, sResourcePath, mHeaders, oPayload, bAsync) {
            //             // Ensure auth header is always present
            //             mHeaders = mHeaders || {};
            //             if (!mHeaders['customAuthorization']) {
            //                 mHeaders['customAuthorization'] = `Bearer ${token}`;
            //             }
            //             return originalRequest(sMethod, sResourcePath, mHeaders, oPayload, bAsync);
            //         };
            //     }
                
            //     // Also override changeHttpHeaders to ensure it includes auth
            //     const originalChangeHeaders = model.changeHttpHeaders.bind(model);
            //     model.changeHttpHeaders = function(mHeaders) {
            //         mHeaders = mHeaders || {};
            //         if (!mHeaders['customAuthorization']) {
            //             mHeaders['customAuthorization'] = `Bearer ${token}`;
            //         }
            //         return originalChangeHeaders(mHeaders);
            //     };
                
            //     return model;
            // };

            // Create all models with the new method
            // const oUserModel = createModelWithAuth("/user-service/");
            // const oSupplierModel = createModelWithAuth("/supplier-service/");
            // const oTourModel = createModelWithAuth("/tour-service/");
            // const oCustomerModel = createModelWithAuth("/customer-service/");
            // const oOrderModel = createModelWithAuth("/order-service/");

            const fnAddCustomAuthHeader = (oModel) => {
                oModel.changeHttpHeaders({
                    'customAuthorization': `Bearer ${token}`
                })
            }

            // Set models to component
            let oUserModel = this.getModel("userService");
            let oSupplierModel = this.getModel("supplierService");
            let oTourModel = this.getModel("tourService");
            let oCustomerModel = this.getModel("customerService");
            let oOrderModel = this.getModel("orderService");

            fnAddCustomAuthHeader(oUserModel);
            fnAddCustomAuthHeader(oSupplierModel);
            fnAddCustomAuthHeader(oTourModel);
            fnAddCustomAuthHeader(oCustomerModel);
            fnAddCustomAuthHeader(oOrderModel);

            // this.setModel(oSupplierModel, "supplierService");
            // this.setModel(oTourModel, "tourService");
            // this.setModel(oCustomerModel, "customerService");
            // this.setModel(oOrderModel, "orderService");

            // Store model references
            this._aModels = [
                { name: "userService", model: oUserModel },
                { name: "supplierService", model: oSupplierModel },
                { name: "tourService", model: oTourModel },
                { name: "customerService", model: oCustomerModel },
                { name: "orderService", model: oOrderModel }
            ];

            // Set userModel as default
            this.setModel(oUserModel);

            console.log("OData models initialized successfully with authentication headers");
        },

        /**
         * Execute authenticated action with proper headers
         * @public
         * @param {sap.ui.model.odata.v4.ODataModel} oModel - The OData model
         * @param {string} sActionPath - The action path
         * @param {object} mParameters - The action parameters
         * @returns {Promise} A promise that resolves with the context
         */
        executeAuthenticatedAction: function(oModel, sActionPath, mParameters) {
            const token = this._oSessionManager.getToken();
            
            if (!token) {
                this._handleAuthError();
                return Promise.reject(new Error("No authentication token"));
            }
            
            // Ensure model has current token
            if (oModel && oModel.changeHttpHeaders) {
                oModel.changeHttpHeaders({
                    'customAuthorization': `Bearer ${token}`
                });
            }
            
            // Create context and execute
            const oContext = oModel.bindContext(sActionPath);
            
            // Set parameters if provided
            if (mParameters) {
                Object.keys(mParameters).forEach(key => {
                    oContext.setParameter(key, mParameters[key]);
                });
            }
            
            return oContext.execute().then(function() {
                return oContext;
            });
        },

        /**
         * Refresh authentication headers for all models
         * @public
         */
        refreshAuthHeaders: function() {
            const token = this._oSessionManager.getToken();
            
            if (!token) {
                console.warn("No token available for header refresh");
                return;
            }
            
            const authHeaders = {
                'customAuthorization': `Bearer ${token}`
            };

            console.log("Refreshing auth headers with token:", token ? "present" : "missing");

            // Update headers for all models
            if (this._aModels) {
                this._aModels.forEach(modelInfo => {
                    const oModel = modelInfo.model;
                    if (oModel && oModel.changeHttpHeaders) {
                        oModel.changeHttpHeaders(authHeaders);
                    }
                });
            }
        },

        /**
         * Handle authentication errors
         * @private
         */
        _handleAuthError: function() {
            // Clear session
            this._oSessionManager.clearSession();
            
            // Destroy existing models
            this._destroyODataModels();
            
            // Show error message
            MessageToast.show("Your session has expired. Please log in again.");
            
            // Redirect to login
            this.getRouter().navTo("login");
        },

        /**
         * Destroy all OData models
         * @private
         */
        _destroyODataModels: function() {
            const modelNames = ["userService", "supplierService", "tourService", "customerService", "orderService"];
            
            modelNames.forEach(modelName => {
                const oModel = this.getModel(modelName);
                if (oModel) {
                    oModel.destroy();
                    this.setModel(null, modelName);
                }
            });
            
            // Clear default model
            const oDefaultModel = this.getModel();
            if (oDefaultModel) {
                oDefaultModel.destroy();
                this.setModel(null);
            }
            
            this._aModels = null;
            console.log("OData models destroyed");
        },

        /**
         * Check initial session and navigate accordingly
         * @private
         */
        _checkInitialSession: function () {
            if (this._oSessionManager.isLoggedIn()) {
                // Initialize OData models if logged in
                this._initODataModels();
                this.getRouter().navTo("dashboard");
            } else {
                this.getRouter().navTo("login");
            }
        },

        /**
         * Get the session manager instance
         * @public
         * @returns {tourishui.model.SessionManager} The session manager
         */
        getSessionManager: function () {
            return this._oSessionManager;
        },

        // Service model getters
        getUserServiceModel: function() {
            return this.getModel("userService");
        },

        getSupplierServiceModel: function() {
            return this.getModel("supplierService");
        },

        getTourServiceModel: function() {
            return this.getModel("tourService");
        },
        
        getCustomerServiceModel: function() {
            return this.getModel("customerService");
        },

        getOrderServiceModel: function() {
            return this.getModel("orderService");
        },

        /**
         * Get current user information
         * @public
         * @returns {Object|null} Current user object or null if not logged in
         */
        getCurrentUser: function() {
            return this._oSessionManager.getUser();
        },

        /**
         * Check if user is authenticated
         * @public
         * @returns {boolean} True if user is authenticated
         */
        isAuthenticated: function() {
            return this._oSessionManager.isLoggedIn();
        },

        /**
         * Get authentication token
         * @public
         * @returns {string|null} JWT token or null
         */
        getAuthToken: function() {
            return this._oSessionManager.getToken();
        },

        /**
         * Set user session after successful login
         * @public
         * @param {Object} sessionData Session data with user and token
         */
        setUserSession: function(sessionData) {
            this._oSessionManager.saveSession(sessionData);
            
            // Initialize OData models after successful login
            this._initODataModels();
            
            console.log("User session set and OData models initialized");
        },

        /**
         * Logout current user
         * @public
         */
        logout: function() {
            // Destroy models before clearing session
            this._destroyODataModels();
            
            this._oSessionManager.clearSession();
            this.getRouter().navTo("login");
        },

        /**
         * Create authenticated request (for manual API calls without OData)
         * @public
         * @param {string} url Request URL
         * @param {string} method HTTP method
         * @param {Object} data Request data
         * @returns {Promise} Promise resolving to response
         */
        createAuthenticatedRequest: function(url, method = "GET", data = null) {
            return new Promise((resolve, reject) => {
                const token = this.getAuthToken();
                
                if (!token) {
                    this._handleAuthError();
                    reject(new Error("No authentication token available"));
                    return;
                }

                const xhr = new XMLHttpRequest();
                xhr.open(method, url);
                xhr.setRequestHeader("customAuthorization", `Bearer ${token}`);
                xhr.setRequestHeader("Content-Type", "application/json");

                xhr.onload = function() {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            resolve(response);
                        } catch (e) {
                            resolve(xhr.responseText);
                        }
                    } else if (xhr.status === 401 || xhr.status === 403) {
                        this._handleAuthError();
                        reject(new Error("Authentication failed"));
                    } else {
                        reject(new Error(`Request failed with status ${xhr.status}`));
                    }
                }.bind(this);

                xhr.onerror = function() {
                    reject(new Error("Network error"));
                };

                if (data) {
                    xhr.send(JSON.stringify(data));
                } else {
                    xhr.send();
                }
            });
        },

        /**
         * Debug method to check authentication status
         * @public
         * @returns {Object} Authentication status information
         */
        debugAuthStatus: function() {
            const token = this._oSessionManager.getToken();
            const user = this._oSessionManager.getUser();
            
            console.group("Authentication Status Debug");
            console.log("Token present:", !!token);
            console.log("Token value:", token ? token.substring(0, 20) + "..." : "null");
            console.log("User:", user);
            console.log("Is logged in:", this._oSessionManager.isLoggedIn());
            
            // Check model headers
            if (this._aModels) {
                console.group("Model Headers");
                this._aModels.forEach(modelInfo => {
                    const model = modelInfo.model;
                    console.log(`${modelInfo.name}:`, model ? "initialized" : "not initialized");
                });
                console.groupEnd();
            }
            
            console.groupEnd();
            
            return {
                hasToken: !!token,
                user: user,
                isLoggedIn: this._oSessionManager.isLoggedIn(),
                modelsInitialized: !!this._aModels
            };
        },

        /**
         * Manually refresh models (useful for debugging)
         * @public
         */
        refreshModels: function() {
            console.log("Manually refreshing models...");
            this._destroyODataModels();
            this._initODataModels();
            console.log("Models refreshed");
        }
    });
});