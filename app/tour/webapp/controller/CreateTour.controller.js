sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
  ], function (Controller, MessageToast, JSONModel) {
    "use strict";
  
    return Controller.extend("tour.controller.CreateTour", {
      onInit: function () {
        this.getView().setModel(new JSONModel({ items: [] }), "schedules");
      },
  
      onNavBack: function () {
        this.getOwnerComponent().getRouter().navTo("tourList");
      },
  
      onAddSchedule: function () {
        const schedules = this.getView().getModel("schedules").getProperty("/items");
        schedules.push({
          ID: "uuid-schedule-" + (schedules.length + 1),
          DayNumber: schedules.length + 1,
          Activity: "Activity " + (schedules.length + 1),
          Description: "Description for day " + (schedules.length + 1)
        });
        this.getView().getModel("schedules").setProperty("/items", schedules);
      },
  
      onCreate: function () {
        const oView = this.getView();
        const tour = {
          ID: "uuid-tour-" + Date.now(),
          TourName: oView.byId("tourName").getValue(),
          Description: oView.byId("description").getValue(),
          NumberDays: parseInt(oView.byId("numberDays").getValue()),
          NumberNights: parseInt(oView.byId("numberNights").getValue()),
          Price: parseFloat(oView.byId("price").getValue()),
          Status: "Draft",
          CreatedByID: oView.byId("createdByID").getValue()
        };
        const schedules = oView.getModel("schedules").getProperty("/items").map(s => ({
          ID: s.ID,
          TourID: tour.ID,
          DayNumber: s.DayNumber,
          Activity: s.Activity,
          Description: s.Description
        }));
  
        const oModel = oView.getModel();
        oModel.callFunction("/createTour", {
          method: "POST",
          urlParameters: { tour, schedules },
          success: function () {
            MessageToast.show("Tour created successfully");
            oView.getController().getOwnerComponent().getRouter().navTo("tourList");
          },
          error: function (oError) {
            MessageToast.show("Error creating tour: " + oError.message);
          }
        });
      }
    });
  });