sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/ui/model/odata/v4/ODataModel"
], function (Controller, MessageBox, ODataModel) {
  "use strict";

  return Controller.extend("tourishui.controller.Dashboard", {
    onInit: function () {
      // Đăng ký để nhận thông báo khi route thay đổi
      this.getOwnerComponent().getRouter().getRoute("dashboard").attachPatternMatched(this._onRouteMatched, this);
    },
    
    _onRouteMatched: function() {
      const oSessionManager = this.getOwnerComponent().getSessionManager();
      if (!oSessionManager.isLoggedIn()) {
        this.getOwnerComponent().getRouter().navTo("login");
      }
    }
  });
});