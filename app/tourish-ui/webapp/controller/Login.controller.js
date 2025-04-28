sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/ui/model/odata/v4/ODataModel"
], function (Controller, MessageBox, ODataModel) {
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

      // Sử dụng OData model để gọi action authenticate
      const oModel = this.getOwnerComponent().getModel();
      
      // Bind đến action authenticate
      const oContext = oModel.bindContext("/authenticate(...)");
      
      // Đặt tham số cho action
      oContext.setParameter("username", sUsername);
      oContext.setParameter("password", sPassword);
      
      // Thực thi action
      oContext.execute().then(function() {
        // Lấy kết quả từ context
        const oResult = oContext.getBoundContext().getObject();
        console.log(oResult);
        if (oResult && oResult.success) {
          // Lưu session qua SessionManager
          const oSessionManager = this.getOwnerComponent().getSessionManager();
          oSessionManager.saveSession({
            token: oResult.token,
            user: oResult.user
          });

          MessageBox.success("Login successful!");
          this.getOwnerComponent().getRouter().navTo("dashboard");
        } else {
          MessageBox.error("Login failed: Incorrect username or password!");
        }
      }.bind(this)).catch(function(oError) {
        console.error("Error during login:", oError);
        
        if (oError.response) {
          try {
            const oResponseData = JSON.parse(oError.response.body);
            MessageBox.error(oResponseData.error.message || "Login failed");
          } catch (e) {
            MessageBox.error("Login failed: " + oError.message);
          }
        } else {
          MessageBox.error("An error occurred while logging in: " + oError.message);
        }
      }.bind(this));
    },

    onRegisterPress: function () {
      this.getOwnerComponent().getRouter().navTo("register");
    }
  });
});