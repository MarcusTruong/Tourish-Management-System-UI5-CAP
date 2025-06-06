sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "tourishui/model/SessionManager"
  ], function (UIComponent, Device, SessionManager) {
    "use strict";
  
    return UIComponent.extend("tourishui.Component", {
        metadata: {
            manifest: "json"
        },
  
        init: function () {
            // Gọi phương thức init của lớp cha
            UIComponent.prototype.init.apply(this, arguments);
  
            // Khởi tạo SessionManager
            this._oSessionManager = new SessionManager();
            
            // Gán auth model vào component
            this.setModel(this._oSessionManager.getAuthModel(), "auth");
  
            // Khởi tạo router
            this.getRouter().initialize();
  
            // Kiểm tra trạng thái đăng nhập và điều hướng
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
  
            const authHeaders = {
                'Authorization': `Bearer ${token}`
            };
  
            console.log("Initializing OData models with auth headers");
  
            // Khởi tạo model cho user-service
            var oUserModel = new sap.ui.model.odata.v4.ODataModel({
                serviceUrl: "/user-service/",
                synchronizationMode: "None",
                groupId: "$auto",
                operationMode: "Server",
                httpHeaders: authHeaders
            });
            this.setModel(oUserModel, "userService");
  
            // Khởi tạo model cho supplier-service
            var oSupplierModel = new sap.ui.model.odata.v4.ODataModel({
                serviceUrl: "/supplier-service/",
                synchronizationMode: "None",
                groupId: "$auto",
                operationMode: "Server",
                httpHeaders: authHeaders
            });
            this.setModel(oSupplierModel, "supplierService");
  
            // Khởi tạo model cho tour-service
            var oTourModel = new sap.ui.model.odata.v4.ODataModel({
                serviceUrl: "/tour-service/",
                synchronizationMode: "None",
                groupId: "$auto",
                operationMode: "Server",
                httpHeaders: authHeaders
            });
            this.setModel(oTourModel, "tourService");
  
            // Khởi tạo model cho customer-service
            var oCustomerModel = new sap.ui.model.odata.v4.ODataModel({
                serviceUrl: "/customer-service/",
                synchronizationMode: "None",
                groupId: "$auto",
                operationMode: "Server",
                httpHeaders: authHeaders
            });
            this.setModel(oCustomerModel, "customerService");
  
            // Khởi tạo model cho order-service
            var oOrderModel = new sap.ui.model.odata.v4.ODataModel({
                serviceUrl: "/order-service/",
                synchronizationMode: "None",
                groupId: "$auto",
                operationMode: "Server",
                httpHeaders: authHeaders
            });
            this.setModel(oOrderModel, "orderService");
  
            // Store model references for later header updates
            this._aModels = [
                { name: "userService", model: oUserModel },
                { name: "supplierService", model: oSupplierModel },
                { name: "tourService", model: oTourModel },
                { name: "customerService", model: oCustomerModel },
                { name: "orderService", model: oOrderModel }
            ];
  
            // Đặt userModel làm model mặc định cho các view
            this.setModel(oUserModel);
  
            console.log("OData models initialized successfully");
        },
  
        /**
         * Refresh authentication headers for all models
         * @public
         */
        refreshAuthHeaders: function() {
            const token = this._oSessionManager.getToken();
            const authHeaders = {};
            
            if (token) {
                authHeaders['Authorization'] = `Bearer ${token}`;
            }
  
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
            sap.m.MessageToast.show("Your session has expired. Please log in again.");
            
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
            
            this._aModels = null;
            console.log("OData models destroyed");
        },
  
        _checkInitialSession: function () {
            if (this._oSessionManager.isLoggedIn()) {
                // Initialize OData models if logged in
                this._initODataModels();
                this.getRouter().navTo("dashboard");
            } else {
                this.getRouter().navTo("login");
            }
        },
  
        getSessionManager: function () {
            return this._oSessionManager;
        },
  
        // Phương thức tiện ích để truy cập các service model
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
                xhr.setRequestHeader("Authorization", `Bearer ${token}`);
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
        }
    });
  });