sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History"
], function (Controller, JSONModel, Fragment, MessageBox, MessageToast, History) {
    "use strict";

    return Controller.extend("tourishui.controller.tour.ActiveTourDetail", {
        onInit: function () {
            // Initialize view model
            var oViewModel = new JSONModel({
                busy: false,
                tourId: null,
                tour: {},
                template: {},
                schedules: [],
                images: [],
                priceTerms: {},
                services: [],
                passengers: [],
                ordersWithPassengers: [],
                estimate: {},
                history: [],
                selectedTab: "general",
                currency: "USD",
                // Statistics
                statistics: {
                    totalPassengers: 0,
                    totalOrders: 0,
                    totalRevenue: 0,
                    totalCost: 0,
                    estimatedProfit: 0,
                    occupancyRate: 0
                }
            });
            this.getView().setModel(oViewModel, "activeTourDetail");

            // Set up router
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("activeTourDetail").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            var sTourId = oArgs.tourId;
            
            // Store tour ID
            var oViewModel = this.getView().getModel("activeTourDetail");
            oViewModel.setProperty("/tourId", sTourId);
            
            // Load tour details
            this._loadTourDetails(sTourId);
        },

        _loadTourDetails: function (sTourId) {
            var oView = this.getView();
            var oViewModel = this.getView().getModel("activeTourDetail");
            
            oViewModel.setProperty("/busy", true);
            
            // Get tour service
            var oTourService = this.getOwnerComponent().getModel("tourService");
            var oContext = oTourService.bindContext("/getActiveTourDetails(...)");
            
            oContext.setParameter("tourID", sTourId);
            
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult) {
                    // Set tour data
                    oViewModel.setProperty("/tour", oResult.tour);
                    oViewModel.setProperty("/template", oResult.template);
                    oViewModel.setProperty("/schedules", oResult.schedules);
                    oViewModel.setProperty("/images", oResult.images);
                    oViewModel.setProperty("/priceTerms", oResult.terms);
                    oViewModel.setProperty("/estimate", oResult.estimate);
                    oViewModel.setProperty("/history", oResult.history);
                    
                    // Load additional data based on selected tab
                    this._loadTabData();
                    
                    // Calculate statistics
                    this._calculateStatistics();
                } else {
                    MessageBox.error("Tour not found");
                    this.onNavBack();
                }
                
                oViewModel.setProperty("/busy", false);
            }.bind(this)).catch(function(oError) {
                console.error("Error loading tour details:", oError);
                MessageBox.error("Error loading tour details");
                oViewModel.setProperty("/busy", false);
                this.onNavBack();
            }.bind(this));
        },

        _loadTabData: function() {
            var oViewModel = this.getView().getModel("activeTourDetail");
            var sSelectedTab = oViewModel.getProperty("/selectedTab");
            
            switch(sSelectedTab) {
                case "services":
                    this._loadTourServices();
                    break;
                case "passengers":
                    this._loadPassengers();
                    break;
                case "estimate":
                    this._loadEstimateDetails();
                    break;
            }
        },

        _loadTourServices: function() {
            var oViewModel = this.getView().getModel("activeTourDetail");
            var sTourId = oViewModel.getProperty("/tourId");
            
            var oTourService = this.getOwnerComponent().getModel("tourService");
            var oContext = oTourService.bindContext("/getActiveTourServices(...)");
            
            oContext.setParameter("tourID", sTourId);
            
            oContext.execute().then(function() {
                var aServices = oContext.getBoundContext().getObject();
                oViewModel.setProperty("/services", aServices.value || []);
            }).catch(function(oError) {
                console.error("Error loading tour services:", oError);
                MessageToast.show("Error loading tour services");
            });
        },

        _loadPassengers: function() {
            var oViewModel = this.getView().getModel("activeTourDetail");
            var sTourId = oViewModel.getProperty("/tourId");
            
            var oTourService = this.getOwnerComponent().getModel("tourService");
            var oContext = oTourService.bindContext("/getOrdersWithPassengers(...)");
            
            oContext.setParameter("tourID", sTourId);
            
            oContext.execute().then(function() {
                var aOrdersWithPassengers = oContext.getBoundContext().getObject();
                oViewModel.setProperty("/ordersWithPassengers", aOrdersWithPassengers.value || []);
                
                // Calculate total passengers
                var iTotalPassengers = 0;
                aOrdersWithPassengers.value.forEach(function(oOrder) {
                    oOrder.Passengers.forEach(function(oPassenger) {
                        if (!oPassenger.IsPlaceholder) {
                            iTotalPassengers++;
                        }
                    });
                });
                
                oViewModel.setProperty("/statistics/totalPassengers", iTotalPassengers);
                oViewModel.setProperty("/statistics/totalOrders", aOrdersWithPassengers.value.length);
            }).catch(function(oError) {
                console.error("Error loading orders with passengers:", oError);
                MessageToast.show("Error loading passengers");
            });
        },
        
        // Thêm method để edit passenger
        onEditPassenger: function(oEvent) {
            var oButton = oEvent.getSource();
            var oPassenger = oButton.getBindingContext("activeTourDetail").getObject();
            var sOrderPath = oButton.getBindingContext("activeTourDetail").getPath();
            var aPathParts = sOrderPath.split("/");
            var iOrderIndex = parseInt(aPathParts[2]);
            var iPassengerIndex = parseInt(aPathParts[4]);
            
            var oViewModel = this.getView().getModel("activeTourDetail");
            var oOrder = oViewModel.getProperty("/ordersWithPassengers/" + iOrderIndex);
            
            // Open passenger edit dialog
            if (!this._oEditPassengerDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "tourishui.view.fragments.EditPassengerDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    this._oEditPassengerDialog = oDialog;
                    this._openEditPassengerDialog(oPassenger, oOrder.OrderID, iOrderIndex, iPassengerIndex);
                }.bind(this));
            } else {
                this._openEditPassengerDialog(oPassenger, oOrder.OrderID, iOrderIndex, iPassengerIndex);
            }
        },
        
        _openEditPassengerDialog: function(oPassenger, sOrderId, iOrderIndex, iPassengerIndex) {
            var oEditModel = new JSONModel({
                orderID: sOrderId,
                orderIndex: iOrderIndex,
                passengerIndex: iPassengerIndex,
                isNew: oPassenger.IsPlaceholder,
                passenger: {
                    ID: oPassenger.ID,
                    FullName: oPassenger.FullName || "",
                    Gender: oPassenger.Gender || "Male",
                    BirthDate: oPassenger.BirthDate || null,
                    IDNumber: oPassenger.IDNumber || "",
                    Phone: oPassenger.Phone || "",
                    Email: oPassenger.Email || "",
                    SpecialRequirements: oPassenger.SpecialRequirements || "",
                    IsAdult: oPassenger.IsAdult
                }
            });
            
            this._oEditPassengerDialog.setModel(oEditModel, "editPassenger");
            this._oEditPassengerDialog.open();
        },
        
        onSavePassenger: function() {
            var oEditModel = this._oEditPassengerDialog.getModel("editPassenger");
            var oData = oEditModel.getData();
            var oPassengerData = oData.passenger;
            
            // Validate required fields
            if (!oPassengerData.FullName || oPassengerData.FullName.trim() === "") {
                MessageBox.error("Please enter passenger full name");
                return;
            }
            
            var oTourService = this.getOwnerComponent().getModel("tourService");
            var sAction = oData.isNew ? "/addPassenger" : "/updatePassenger";
            var oContext = oTourService.bindContext(sAction + "(...)");
            
            if (oData.isNew) {
                // Adding new passenger
                oContext.setParameter("orderID", oData.orderID);
                oContext.setParameter("fullName", oPassengerData.FullName);
                oContext.setParameter("gender", oPassengerData.Gender);
                oContext.setParameter("birthDate", oPassengerData.BirthDate);
                oContext.setParameter("idNumber", oPassengerData.IDNumber);
                oContext.setParameter("phone", oPassengerData.Phone);
                oContext.setParameter("email", oPassengerData.Email);
                oContext.setParameter("specialRequirements", oPassengerData.SpecialRequirements);
                oContext.setParameter("isAdult", oPassengerData.IsAdult);
            } else {
                // Updating existing passenger
                oContext.setParameter("passengerID", oPassengerData.ID);
                oContext.setParameter("fullName", oPassengerData.FullName);
                oContext.setParameter("gender", oPassengerData.Gender);
                oContext.setParameter("birthDate", oPassengerData.BirthDate);
                oContext.setParameter("idNumber", oPassengerData.IDNumber);
                oContext.setParameter("phone", oPassengerData.Phone);
                oContext.setParameter("email", oPassengerData.Email);
                oContext.setParameter("specialRequirements", oPassengerData.SpecialRequirements);
                oContext.setParameter("isAdult", oPassengerData.IsAdult);
            }
            
            oContext.execute().then(function() {
                MessageToast.show(oData.isNew ? "Passenger added successfully" : "Passenger updated successfully");
                this._oEditPassengerDialog.close();
                this._loadPassengers(); // Reload passengers
            }.bind(this)).catch(function(oError) {
                console.error("Error saving passenger:", oError);
                MessageBox.error("Error saving passenger");
            });
        },
        
        onCancelEditPassenger: function() {
            this._oEditPassengerDialog.close();
        },
        
        onDeletePassenger: function(oEvent) {
            var oButton = oEvent.getSource();
            var oPassenger = oButton.getBindingContext("activeTourDetail").getObject();
            
            if (!oPassenger.ID) {
                return; // Can't delete placeholder
            }
            
            MessageBox.confirm("Are you sure you want to remove this passenger?", {
                title: "Confirm Delete",
                onClose: function(sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this._deletePassenger(oPassenger.ID);
                    }
                }.bind(this)
            });
        },
        
        _deletePassenger: function(sPassengerId) {
            var oTourService = this.getOwnerComponent().getModel("tourService");
            var oContext = oTourService.bindContext("/removePassenger(...)");
            
            oContext.setParameter("passengerID", sPassengerId);
            
            oContext.execute().then(function() {
                MessageToast.show("Passenger removed successfully");
                this._loadPassengers();
            }.bind(this)).catch(function(oError) {
                console.error("Error removing passenger:", oError);
                MessageBox.error("Error removing passenger");
            });
        },

        _loadEstimateDetails: function() {
            var oViewModel = this.getView().getModel("activeTourDetail");
            var sTourId = oViewModel.getProperty("/tourId");
            
            var oTourService = this.getOwnerComponent().getModel("tourService");
            var oContext = oTourService.bindContext("/getTourEstimate(...)");
            
            oContext.setParameter("tourID", sTourId);
            
            oContext.execute().then(function() {
                var oEstimate = oContext.getBoundContext().getObject();
                console.log(oEstimate)
                oViewModel.setProperty("/estimate", oEstimate || {});
                
                // Update statistics
                if (oEstimate) {
                    oViewModel.setProperty("/statistics/totalCost", oEstimate.EstimatedCost);
                    oViewModel.setProperty("/statistics/totalRevenue", oEstimate.EstimatedRevenue);
                    oViewModel.setProperty("/statistics/estimatedProfit", oEstimate.EstimatedProfit);
                }
            }).catch(function(oError) {
                console.error("Error loading estimate:", oError);
                MessageToast.show("Error loading estimate");
            });
        },

        _calculateStatistics: function() {
            var oViewModel = this.getView().getModel("activeTourDetail");
            var oTour = oViewModel.getProperty("/tour");
            
            if (oTour) {
                // Calculate occupancy rate
                var fOccupancyRate = (oTour.CurrentBookings / oTour.MaxCapacity) * 100;
                oViewModel.setProperty("/statistics/occupancyRate", fOccupancyRate);
            }
        },

        onTabSelect: function(oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedKey");
            var oViewModel = this.getView().getModel("activeTourDetail");
            
            oViewModel.setProperty("/selectedTab", sSelectedKey);
            
            // Load data for the selected tab
            this._loadTabData();
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("saleTour", {}, true);
            }
        },

        // Service Management
        onAddService: function() {
            // Open dialog to add service
            if (!this._oAddServiceDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "tourishui.view.fragments.AddTourServiceDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    this._oAddServiceDialog = oDialog;
                    this._openAddServiceDialog();
                }.bind(this));
            } else {
                this._openAddServiceDialog();
            }
        },

        _openAddServiceDialog: function() {
            // Load available services
            this._loadAvailableServices();
            this._oAddServiceDialog.open();
        },

        _loadAvailableServices: function() {
            var oSupplierService = this.getOwnerComponent().getModel("supplierService");
            var oContext = oSupplierService.bindContext("/getActiveServices(...)");
            
            oContext.execute().then(function() {
                var aServices = oContext.getBoundContext().getObject();
                
                var oServiceModel = new JSONModel({
                    availableServices: aServices.value || [],
                    selectedService: null,
                    quantity: 1,
                    unitPrice: 0,
                    notes: ""
                });
                
                this._oAddServiceDialog.setModel(oServiceModel, "serviceDialog");
            }.bind(this)).catch(function(oError) {
                console.error("Error loading available services:", oError);
                MessageToast.show("Error loading available services");
            });
        },

        onServiceSelectionChange: function(oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            var oService = oSelectedItem.getBindingContext("serviceDialog").getObject();
            
            var oDialogModel = this._oAddServiceDialog.getModel("serviceDialog");
            oDialogModel.setProperty("/selectedService", oService);
            oDialogModel.setProperty("/unitPrice", oService.Price);
        },

        onSaveService: function() {
            var oDialogModel = this._oAddServiceDialog.getModel("serviceDialog");
            var oSelectedService = oDialogModel.getProperty("/selectedService");
            var iQuantity = oDialogModel.getProperty("/quantity");
            var fUnitPrice = oDialogModel.getProperty("/unitPrice");
            var sNotes = oDialogModel.getProperty("/notes");
            
            if (!oSelectedService) {
                MessageBox.error("Please select a service");
                return;
            }
            
            var oViewModel = this.getView().getModel("activeTourDetail");
            var sTourId = oViewModel.getProperty("/tourId");
            
            var oTourService = this.getOwnerComponent().getModel("tourService");
            var oContext = oTourService.bindContext("/addServiceToActiveTour(...)");
            
            oContext.setParameter("tourID", sTourId);
            oContext.setParameter("serviceID", oSelectedService.ID);
            oContext.setParameter("quantity", iQuantity);
            oContext.setParameter("unitPrice", fUnitPrice);
            oContext.setParameter("notes", sNotes);
            
            oContext.execute().then(function() {
                MessageToast.show("Service added successfully");
                this._oAddServiceDialog.close();
                this._loadTourServices();
            }.bind(this)).catch(function(oError) {
                console.error("Error adding service:", oError);
                MessageBox.error("Error adding service");
            });
        },

        onCancelAddService: function() {
            this._oAddServiceDialog.close();
        },

        onEditService: function(oEvent) {
            
        },

        onDeleteService: function(oEvent) {
            var oButton = oEvent.getSource();
            var oService = oButton.getBindingContext("activeTourDetail").getObject();
            
            MessageBox.confirm("Are you sure you want to remove this service?", {
                title: "Confirm Delete",
                onClose: function(sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this._deleteService(oService.ID);
                    }
                }.bind(this)
            });
        },

        _deleteService: function(sServiceId) {
            var oTourService = this.getOwnerComponent().getModel("tourService");
            var oContext = oTourService.bindContext("/removeActiveTourService(...)");
            
            oContext.setParameter("tourServiceID", sServiceId);
            
            oContext.execute().then(function() {
                MessageToast.show("Service removed successfully");
                this._loadTourServices();
            }.bind(this)).catch(function(oError) {
                console.error("Error removing service:", oError);
                MessageBox.error("Error removing service");
            });
        },

        // Passenger Management
        onViewPassengerDetails: function(oEvent) {
            var oButton = oEvent.getSource();
            var oPassenger = oButton.getBindingContext("activeTourDetail").getObject();
            
            // Open passenger details dialog
            if (!this._oPassengerDetailsDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "tourishui.view.fragments.PassengerDetailsDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    this._oPassengerDetailsDialog = oDialog;
                    this._showPassengerDetails(oPassenger);
                }.bind(this));
            } else {
                this._showPassengerDetails(oPassenger);
            }
        },

        _showPassengerDetails: function(oPassenger) {
            var oPassengerModel = new JSONModel(oPassenger);
            this._oPassengerDetailsDialog.setModel(oPassengerModel, "passenger");
            this._oPassengerDetailsDialog.open();
        },

        onClosePassengerDetails: function() {
            this._oPassengerDetailsDialog.close();
        },

        // Estimate Management
        onUpdateEstimate: function() {
            var oViewModel = this.getView().getModel("activeTourDetail");
            var oEstimate = oViewModel.getProperty("/estimate");
            
            // Open estimate dialog
            if (!this._oEstimateDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "tourishui.view.fragments.TourEstimateDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    this._oEstimateDialog = oDialog;
                    this._openEstimateDialog(oEstimate);
                }.bind(this));
            } else {
                this._openEstimateDialog(oEstimate);
            }
        },

        _openEstimateDialog: function(oEstimate) {
            var oEstimateModel = new JSONModel({
                estimatedCost: oEstimate.EstimatedCost || 0,
                estimatedRevenue: oEstimate.EstimatedRevenue || 0,
                estimatedProfit: oEstimate.EstimatedProfit || 0,
                notes: oEstimate.Notes || ""
            });
            
            this._oEstimateDialog.setModel(oEstimateModel, "estimate");
            this._oEstimateDialog.open();
        },

        onSaveEstimate: function() {
            var oEstimateModel = this._oEstimateDialog.getModel("estimate");
            var oData = oEstimateModel.getData();
            
            var oViewModel = this.getView().getModel("activeTourDetail");
            var sTourId = oViewModel.getProperty("/tourId");
            var oCurrentEstimate = oViewModel.getProperty("/estimate");
            
            var oTourService = this.getOwnerComponent().getModel("tourService");
            var sAction = oCurrentEstimate.ID ? "/updateTourEstimate" : "/createTourEstimate";
            var oContext = oTourService.bindContext(sAction + "(...)");
            
            if (oCurrentEstimate.ID) {
                oContext.setParameter("estimateID", oCurrentEstimate.ID);
            } else {
                oContext.setParameter("tourID", sTourId);
            }
            
            oContext.setParameter("estimatedCost", parseFloat(oData.estimatedCost));
            oContext.setParameter("estimatedRevenue", parseFloat(oData.estimatedRevenue));
            oContext.setParameter("estimatedProfit", parseFloat(oData.estimatedProfit));
            oContext.setParameter("notes", oData.notes);
            
            oContext.execute().then(function() {
                MessageToast.show("Estimate saved successfully");
                this._oEstimateDialog.close();
                this._loadEstimateDetails();
            }.bind(this)).catch(function(oError) {
                console.error("Error saving estimate:", oError);
                MessageBox.error("Error saving estimate");
            });
        },

        onCancelEstimate: function() {
            this._oEstimateDialog.close();
        },

        formatDate: function(sDate) {
            if (!sDate) {
                return "";
            }
            
            var oDate = new Date(sDate);
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "dd MMM yyyy"
            });
            
            return oDateFormat.format(oDate);
        },

        formatCurrency: function(fValue) {
            if (!fValue) {
                return "0.00";
            }
            
            return parseFloat(fValue).toFixed(2);
        },

        formatPercentage: function(fValue) {
            if (!fValue) {
                return "0%";
            }
            
            return parseFloat(fValue).toFixed(1) + "%";
        },

        formatPassengerType: function(bIsAdult) {
            return bIsAdult ? "Adult" : "Child";
        }
    });
});