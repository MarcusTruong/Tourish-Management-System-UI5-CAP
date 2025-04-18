sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function (Controller, MessageToast) {
  "use strict";

  return Controller.extend("tour.controller.TourList", {
    onCreateTour: function () {
      this.getOwnerComponent().getRouter().navTo("createTour");
    },

    onCreateOrder: function () {
      this.getOwnerComponent().getRouter().navTo("createOrder");
    }
  });
});