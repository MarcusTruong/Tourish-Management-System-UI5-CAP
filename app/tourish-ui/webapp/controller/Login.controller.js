sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/ui/model/odata/v4/ODataModel"
], function (Controller, MessageBox, MessageToast, ODataModel) {
  "use strict";

  return Controller.extend("tourishui.controller.Login", {
    onInit: function () {
      // Kiểm tra session từ SessionManager
      const oSessionManager = this.getOwnerComponent().getSessionManager();
      if (oSessionManager.isLoggedIn()) {
        this.getOwnerComponent().getRouter().navTo("dashboard");
      }
    },

    onLoginPress: function () {
      const oView = this.getView();
      const sUsername = oView.byId("usernameInput").getValue();
      const sPassword = oView.byId("passwordInput").getValue();

      if (!sUsername || !sPassword) {
        MessageBox.error("Please enter username and password!");
        return;
      }

      this._performLogin(sUsername, sPassword);
    },

    /**
     * Perform login without authentication token
     * @private
     */
    _performLogin: function(sUsername, sPassword) {
      const oComponent = this.getOwnerComponent();
      
      // Tạo request thông thường cho authenticate endpoint
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/user-service/authenticate');
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const oResult = JSON.parse(xhr.responseText);
            console.log("Login response:", oResult);
            
            if (oResult && oResult.success) {
              // Use setUserSession instead of saveSession
              oComponent.setUserSession({
                token: oResult.token,
                user: oResult.user
              });

              MessageToast.show("Login successful!");
              oComponent.getRouter().navTo("dashboard");
            } else {
              MessageBox.error("Login failed: " + (oResult.message || "Incorrect username or password!"));
            }
          } catch (e) {
            console.error("Error parsing login response:", e);
            MessageBox.error("An error occurred while processing login response");
          }
        } else {
          console.error("Login request failed with status:", xhr.status);
          MessageBox.error("Login failed: Server error");
        }
      }.bind(this);

      xhr.onerror = function() {
        console.error("Network error during login");
        MessageBox.error("Network error occurred while logging in");
      };

      // Send login data
      xhr.send(JSON.stringify({
        username: sUsername,
        password: sPassword
      }));
    },

    onRegisterPress: function () {
      this.getOwnerComponent().getRouter().navTo("register");
    }
  });
});