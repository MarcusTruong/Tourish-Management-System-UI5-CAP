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

          // Khởi tạo các OData model cho từng service
          this._initODataModels();

          // Khởi tạo router
          this.getRouter().initialize();

          // Kiểm tra trạng thái đăng nhập và điều hướng
          this._checkInitialSession();
      },

      _initODataModels: function() {
          // Khởi tạo model cho user-service
          var sUserServiceUrl = "/user-service/";
          var oUserModel = new sap.ui.model.odata.v4.ODataModel({
              serviceUrl: sUserServiceUrl,
              synchronizationMode: "None",
              groupId: "$auto",
              operationMode: "Server"
          });
          this.setModel(oUserModel, "userService");

          // Khởi tạo model cho supplier-service
          var sSupplierServiceUrl = "/supplier-service/";
          var oSupplierModel = new sap.ui.model.odata.v4.ODataModel({
              serviceUrl: sSupplierServiceUrl,
              synchronizationMode: "None",
              groupId: "$auto",
              operationMode: "Server"
          });
          this.setModel(oSupplierModel, "supplierService");

          // Thêm các model cho các service khác nếu cần
          // ...

          // Đặt supplierService làm model mặc định cho các view
          // (bạn có thể thay đổi tùy theo use case chính của ứng dụng)
          this.setModel(oUserModel);
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
      },

      // Phương thức tiện ích để truy cập các service model
      getUserServiceModel: function() {
          return this.getModel("userService");
      },

      getSupplierServiceModel: function() {
          return this.getModel("supplierService");
      }
  });
});