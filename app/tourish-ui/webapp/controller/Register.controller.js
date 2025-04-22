sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/ui/model/odata/v4/ODataModel",
  "../model/utils"
], function (Controller, MessageBox, ODataModel, utils) {
  "use strict";

  return Controller.extend("tourishui.controller.Register", {
    onInit: function () {
      // Kiểm tra session từ localStorage
      const sAuthData = localStorage.getItem("auth");
      if (sAuthData) {
        const oAuthData = JSON.parse(sAuthData);
        const oComponent = this.getOwnerComponent();
        const oAuthModel = oComponent.getModel("auth");
        if (!oAuthModel) {
          oComponent.setModel(new JSONModel({ token: null, user: null }), "auth");
        }
        oAuthModel.setData(oAuthData);
        oComponent.getRouter().navTo("dashboard");
      }
    },

    onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("login");
    },

    onPasswordChange: function (oEvent) {
      const sPassword = oEvent.getSource().getValue();
      const validationResult = utils.validatePasswordComplexity(sPassword);

      // Cập nhật trạng thái từng yêu cầu
      this.getView().byId("minLengthText").data("met", validationResult.requirements.minLength.met.toString());
      this.getView().byId("hasUpperCaseText").data("met", validationResult.requirements.hasUpperCase.met.toString());
      this.getView().byId("hasLowerCaseText").data("met", validationResult.requirements.hasLowerCase.met.toString());
      this.getView().byId("hasNumberText").data("met", validationResult.requirements.hasNumber.met.toString());
      this.getView().byId("hasSpecialCharText").data("met", validationResult.requirements.hasSpecialChar.met.toString());
    },

    onRegisterPress: function () {
      const oView = this.getView();
      const sUsername = oView.byId("usernameInput").getValue();
      const sPassword = oView.byId("passwordInput").getValue();
      const sFullName = oView.byId("fullNameInput").getValue();
      const sEmail = oView.byId("emailInput").getValue();
      const sPhone = oView.byId("phoneInput").getValue();

      if (!sUsername || !sPassword || !sFullName || !sEmail || !sPhone) {
        MessageBox.error("Vui lòng nhập đầy đủ thông tin!");
        return;
      }

      // Validate mật khẩu trước khi gửi
      const passwordValidation = utils.validatePasswordComplexity(sPassword);
      if (!passwordValidation.valid) {
        MessageBox.error(passwordValidation.requirements.minLength.message || "Mật khẩu không hợp lệ!");
        return;
      }

      const oData = {
        username: sUsername,
        password: sPassword,
        fullName: sFullName,
        email: sEmail,
        phone: sPhone
      };

      // Sử dụng OData model để gọi action createUser
      const oModel = this.getOwnerComponent().getModel();
      const oContext = oModel.bindContext("/createUser(...)");
      oContext.setParameter("username", oData.username);
      oContext.setParameter("password", oData.password);
      oContext.setParameter("fullName", oData.fullName);
      oContext.setParameter("email", oData.email);
      oContext.setParameter("phone", oData.phone);

      oContext.execute().then(() => {
        const oResult = oContext.getBoundContext().getObject();
        if (oResult.ID) {
          MessageBox.success("Đăng ký thành công! Vui lòng đăng nhập.");
          this.getOwnerComponent().getRouter().navTo("login");
        } else {
          MessageBox.error("Đăng ký thất bại: Unknown error");
        }
      }).catch(error => {
        console.error("Error during registration:", error);
        MessageBox.error("Đã xảy ra lỗi khi đăng ký: " + error.message);
      });
    }
  });
});