sap.ui.define([
  "sap/ui/base/Object",
  "sap/m/MessageBox"
], function (BaseObject, MessageBox) {
  "use strict";

  return BaseObject.extend("tourishui.model.SessionManager", {
    constructor: function () {
      this._oAuthModel = new sap.ui.model.json.JSONModel({
        token: null,
        user: null,
        isLoggedIn: false
      });

      // Khởi tạo session từ localStorage
      this._initSession();

      // Đăng ký sự kiện Storage để đồng bộ giữa các tab
      window.addEventListener("storage", this._onStorageChange.bind(this));
    },

    // Khởi tạo session từ localStorage
    _initSession: function () {
      const sAuthData = localStorage.getItem("auth");
      if (sAuthData) {
        try {
          const oAuthData = JSON.parse(sAuthData);
          this._oAuthModel.setData({
            token: oAuthData.token,
            user: oAuthData.user,
            isLoggedIn: true
          });
        } catch (e) {
          console.error("Error parsing auth data from localStorage:", e);
          this.clearSession();
        }
      }
    },

    // Xử lý sự kiện Storage để đồng bộ giữa các tab
    _onStorageChange: function (oEvent) {
      if (oEvent.key === "auth") {
        if (!oEvent.newValue) {
          // Nếu auth bị xóa (đăng xuất), cập nhật trạng thái
          this.clearSession();
          const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
          if (oRouter) {
            oRouter.navTo("login");
            MessageBox.information("Bạn đã đăng xuất từ một tab khác.");
          }
        } else {
          // Nếu auth được cập nhật (đăng nhập), khôi phục session
          this._initSession();
        }
      }
    },

    // ====== EXISTING METHODS ======

    // Lưu session
    saveSession: function (oAuthData) {
      this._oAuthModel.setData({
        token: oAuthData.token,
        user: oAuthData.user,
        isLoggedIn: true
      });
      localStorage.setItem("auth", JSON.stringify({
        token: oAuthData.token,
        user: oAuthData.user
      }));
    },

    // Xóa session
    clearSession: function () {
      this._oAuthModel.setData({
        token: null,
        user: null,
        isLoggedIn: false
      });
      localStorage.removeItem("auth");
    },

    // Lấy auth model
    getAuthModel: function () {
      return this._oAuthModel;
    },

    // Kiểm tra trạng thái đăng nhập
    isLoggedIn: function () {
      return this._oAuthModel.getProperty("/isLoggedIn");
    },

    // Lấy thông tin user
    getUser: function () {
      return this._oAuthModel.getProperty("/user");
    },

    // Lấy token
    getToken: function () {
      return this._oAuthModel.getProperty("/token");
    },

    // ====== NEW METHODS FOR TOKEN UPDATE ======

    /**
     * Get current session data
     * @returns {Object|null} Session data or null if not logged in
     */
    getSession: function() {
      const sAuthData = localStorage.getItem("auth");
      if (sAuthData) {
        try {
          return JSON.parse(sAuthData);
        } catch (e) {
          console.error("Error parsing auth data from localStorage:", e);
          return null;
        }
      }
      return null;
    },

    /**
     * Update token with new value (for cases like workspace creation)
     * @param {string} newToken - New JWT token
     */
    updateToken: function(newToken) {
      if (!newToken) {
        console.warn("No new token provided for update");
        return false;
      }
      
      try {
        // Parse new token to get updated user info
        const payload = JSON.parse(atob(newToken.split('.')[1]));
        
        // Get existing session data
        const existingSession = this.getSession();
        
        if (existingSession) {
          // Update session with new token and user info
          const updatedSession = {
            token: newToken,
            user: {
              ...existingSession.user,
              ID: payload.id,
              WorkspaceID: payload.workspaceID, // Quan trọng nhất!
              Username: payload.username,
              Role: payload.role,
              FullName: payload.fullName,
              Email: payload.email,
              Status: payload.status
            }
          };
          
          // Save updated session to localStorage
          localStorage.setItem("auth", JSON.stringify(updatedSession));
          
          // Update the auth model
          this._oAuthModel.setData({
            token: newToken,
            user: updatedSession.user,
            isLoggedIn: true
          });
          
          console.log("✅ Token updated successfully");
          console.log("- Username:", payload.username);
          console.log("- WorkspaceID:", payload.workspaceID);
          console.log("- Role:", payload.role);
          
          return true;
        } else {
          console.error("❌ No existing session found to update");
          return false;
        }
        
      } catch (error) {
        console.error("❌ Error updating token:", error);
        return false;
      }
    },

    /**
     * Check if current user has workspace
     * @returns {boolean}
     */
    hasWorkspace: function() {
      const user = this.getUser();
      return user && user.WorkspaceID;
    },

    /**
     * Get workspace ID from current session
     * @returns {string|null}
     */
    getWorkspaceID: function() {
      const user = this.getUser();
      return user ? user.WorkspaceID : null;
    }
  });
});