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

          // Khởi tạo model cho tour-service
          var sTourServiceUrl = "/tour-service/";
          var oTourModel = new sap.ui.model.odata.v4.ODataModel({
            serviceUrl: sTourServiceUrl,
            synchronizationMode: "None",
            groupId: "$auto",
            operationMode: "Server"
        });
        this.setModel(oTourModel, "tourService");

          // Khởi tạo model cho tour-service
          var sCustomerServiceUrl = "/customer-service/";
          var oTourModel = new sap.ui.model.odata.v4.ODataModel({
            serviceUrl: sCustomerServiceUrl,
            synchronizationMode: "None",
            groupId: "$auto",
            operationMode: "Server"
        });
        this.setModel(oTourModel, "customerService");

        // Khởi tạo model cho order-service
        var sCustomerServiceUrl = "/order-service/";
        var oTourModel = new sap.ui.model.odata.v4.ODataModel({
          serviceUrl: sCustomerServiceUrl,
          synchronizationMode: "None",
          groupId: "$auto",
          operationMode: "Server"
      });
      this.setModel(oTourModel, "orderService");


          // Đặt supplierService làm model mặc định cho các view
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
      },

      getTourServiceModel: function() {
        return this.getModel("tourService");
    },
    getCustomerServiceModel: function() {
        return this.getModel("customerService");
    }
  });
});