sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function (Controller, MessageToast) {
  "use strict";

  return Controller.extend("tour.controller.CreateOrder", {
    onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("tourList");
    },

    onCreate: function () {
      const oView = this.getView();
      const order = {
        ID: "uuid-order-" + Date.now(),
        OrderDate: new Date().toISOString().split("T")[0],
        TotalAmount: 0.00,
        Status: "Pending",
        PromotionID: null
      };
      const customerID = oView.byId("customerID").getValue();
      const tourID = oView.byId("tourID").getValue();

      const oModel = oView.getModel();
      oModel.callFunction("/createOrder", {
        method: "POST",
        urlParameters: { order, customerID, tourID },
        success: function () {
          MessageToast.show("Order created successfully");
          oView.getController().getOwnerComponent().getRouter().navTo("tourList");
        },
        error: function (oError) {
          MessageToast.show("Error creating order: " + oError.message);
        }
      });
    }
  });
});