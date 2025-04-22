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
  
      _checkInitialSession: function () {
        if (this._oSessionManager.isLoggedIn()) {
          this.getRouter().navTo("dashboard");
        } else {
          this.getRouter().navTo("login");
        }
      },
  
      getSessionManager: function () {
        return this._oSessionManager;
      }
    });
  });