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
            // Load estimate and cost items
            var oTourService = this.getOwnerComponent().getModel("tourService");
            var oContext = oTourService.bindContext("/getTourEstimate(...)");
            oContext.setParameter("tourID", sTourId);
            oContext.execute().then(function() {
                var oEstimate = oContext.getBoundContext().getObject();
                oViewModel.setProperty("/estimate", oEstimate || {});
                // Load orders to calculate revenue
                this._loadOrdersForRevenue();
            }.bind(this)).catch(function(oError) {
                console.error("Error loading estimate:", oError);
                MessageToast.show("Error loading estimate");
                // Still try to calculate revenue
                this._loadOrdersForRevenue();
            }.bind(this));
        },
        _loadOrdersForRevenue: function() {
            var oViewModel = this.getView().getModel("activeTourDetail");
            var sTourId = oViewModel.getProperty("/tourId");
            // Get order service
            var oOrderService = this.getOwnerComponent().getModel("orderService");
            var oContext = oOrderService.bindContext("/listOrders(...)");
            oContext.setParameter("tourID", sTourId);
            oContext.setParameter("skip", 0);
            oContext.setParameter("limit", 1000); // Get all orders
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                var aOrders = oResult.items || [];
                // Now we need to get detailed info for each order
                var aOrderDetailsPromises = aOrders.map(function(oOrder) {
                    return this._getOrderDetails(oOrder.ID);
                }.bind(this));
                Promise.all(aOrderDetailsPromises).then(function(aOrderDetails) {
                    // Store detailed orders
                    oViewModel.setProperty("/ordersDetailed", aOrderDetails);
                    // Calculate all financial metrics with detailed data
                    this._calculateFinancialMetrics();
                }.bind(this));
            }.bind(this)).catch(function(oError) {
                console.error("Error loading orders for revenue:", oError);
                // Calculate with available data
                this._calculateFinancialMetrics();
            }.bind(this));
        },
        _getOrderDetails: function(sOrderId) {
            var oOrderService = this.getOwnerComponent().getModel("orderService");
            var oContext = oOrderService.bindContext("/getOrderDetails(...)");
            oContext.setParameter("orderID", sOrderId);
            return oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                return oResult.order;
            });
        },
        _calculateFinancialMetrics: function() {
            var oViewModel = this.getView().getModel("activeTourDetail");
            var aOrdersDetailed = oViewModel.getProperty("/ordersDetailed") || [];
            var aServices = oViewModel.getProperty("/services") || [];
            var oEstimate = oViewModel.getProperty("/estimate") || {};
            var aCostItems = oEstimate.CostItems || [];
            var oPriceTerms = oViewModel.getProperty("/priceTerms") || {};
            // Initialize statistics
            var oStats = {
                totalOrders: 0,
                totalPassengers: 0,
                totalAdults: 0,
                totalChildren: 0,
                totalRevenue: 0,
                adultRevenue: 0,
                childRevenue: 0,
                totalDiscounts: 0,
                totalCost: 0,
                totalServiceCost: 0,
                totalAdditionalCost: 0,
                netProfit: 0,
                profitMargin: 0,
                costItemsCount: 0,
                serviceCosts: [],
                breakEvenPassengers: 0,
                occupancyRate: 0
            };
            // Calculate revenue from detailed orders
            aOrdersDetailed.forEach(function(oOrder) {
                if (oOrder.Status !== 'Canceled') {
                    oStats.totalOrders++;
                    oStats.totalAdults += oOrder.AdultCount || 0;
                    oStats.totalChildren += oOrder.ChildCount || 0;
                    oStats.totalRevenue += parseFloat(oOrder.TotalAmount) || 0;
                }
            });
            oStats.totalPassengers = oStats.totalAdults + oStats.totalChildren;
            // Calculate revenue breakdown
            var fAdultPrice = parseFloat(oPriceTerms.AdultPrice) || 0;
            var fChildPrice = parseFloat(oPriceTerms.ChildrenPrice) || 0;
            oStats.adultRevenue = oStats.totalAdults * fAdultPrice;
            oStats.childRevenue = oStats.totalChildren * fChildPrice;
            // Calculate total discounts (difference between full price and actual revenue)
            var fFullPrice = oStats.adultRevenue + oStats.childRevenue;
            oStats.totalDiscounts = fFullPrice > oStats.totalRevenue ? fFullPrice - oStats.totalRevenue : 0;
            // Calculate service costs
            aServices.forEach(function(oService) {
                var fServiceCost = parseFloat(oService.TotalPrice) || 0;
                oStats.totalServiceCost += fServiceCost;
                oStats.serviceCosts.push({
                    ServiceName: oService.ServiceName,
                    SupplierName: oService.SupplierName,
                    Quantity: oService.Quantity,
                    UnitPrice: oService.UnitPrice,
                    TotalPrice: oService.TotalPrice
                });
            });
            // Calculate additional costs
            aCostItems.forEach(function(oCostItem) {
                oStats.totalAdditionalCost += parseFloat(oCostItem.Cost) || 0;
            });
            oStats.costItemsCount = aCostItems.length;
            oStats.totalCost = oStats.totalServiceCost + oStats.totalAdditionalCost;
            // Calculate profit metrics
            oStats.netProfit = oStats.totalRevenue - oStats.totalCost;
            oStats.profitMargin = oStats.totalRevenue > 0 ? 
                Math.round((oStats.netProfit / oStats.totalRevenue) * 100 * 10) / 10 : 0;
            // Calculate break-even point
            var fAverageTicketPrice = oStats.totalPassengers > 0 ? 
                oStats.totalRevenue / oStats.totalPassengers : fAdultPrice;
            oStats.breakEvenPassengers = fAverageTicketPrice > 0 ? 
                Math.ceil(oStats.totalCost / fAverageTicketPrice) : 0;
            // Calculate occupancy rate (already calculated in main statistics)
            var oTour = oViewModel.getProperty("/tour");
            if (oTour) {
                oStats.occupancyRate = Math.round((oTour.CurrentBookings / oTour.MaxCapacity) * 100 * 10) / 10;
            }
            // Update view model
            oViewModel.setProperty("/statistics", oStats);
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
            // Reset dialog to add mode FIRST
            this._oAddServiceDialog.setTitle("Add Service to Tour");
            var oBeginButton = this._oAddServiceDialog.getBeginButton();
            oBeginButton.setText("Add");
            this._currentEditingService = null;
            
            // Load available services
            this._loadAvailableServices();
            this._oAddServiceDialog.open();
        },

        onServiceSelectionChange: function(oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            var oService = oSelectedItem.getBindingContext("serviceDialog").getObject();
            
            var oDialogModel = this._oAddServiceDialog.getModel("serviceDialog");
            oDialogModel.setProperty("/selectedService", oService);
            oDialogModel.setProperty("/unitPrice", oService.Price);
        },


        onEditService: function(oEvent) {
            var oButton = oEvent.getSource();
            var oService = oButton.getBindingContext("activeTourDetail").getObject();
            
            // Store the current service being edited
            this._currentEditingService = oService;
            
            // Open the same dialog used for adding services
            if (!this._oAddServiceDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "tourishui.view.fragments.AddTourServiceDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    this._oAddServiceDialog = oDialog;
                    this._openEditServiceDialog(oService);
                }.bind(this));
            } else {
                this._openEditServiceDialog(oService);
            }
        },
        
        _openEditServiceDialog: function(oService) {
            // Load available services first
            this._loadAvailableServices();
            
            // Update dialog title and button text for edit mode
            this._oAddServiceDialog.setTitle("Edit Tour Service");
            var oBeginButton = this._oAddServiceDialog.getBeginButton();
            oBeginButton.setText("Update");
            
            // Set the dialog model with current service data
            var oDialogModel = new JSONModel({
                availableServices: [], // Will be populated by _loadAvailableServices
                selectedService: {
                    ID: oService.ServiceID,
                    ServiceName: oService.ServiceName,
                    ServiceType: oService.ServiceType,
                    Description: "", // Will be populated when services are loaded
                    Price: oService.UnitPrice
                },
                quantity: oService.Quantity,
                unitPrice: oService.UnitPrice,
                notes: oService.Notes || "",
                isEditMode: true,
                tourServiceID: oService.ID
            });
            
            this._oAddServiceDialog.setModel(oDialogModel, "serviceDialog");
            this._oAddServiceDialog.open();
        },
        
        // Override the existing _loadAvailableServices to handle edit mode
        _loadAvailableServices: function() {
            var oSupplierService = this.getOwnerComponent().getModel("supplierService");
            var oContext = oSupplierService.bindContext("/getActiveServices(...)");
            
            oContext.execute().then(function() {
                var aServices = oContext.getBoundContext().getObject();
                
                var oDialogModel = this._oAddServiceDialog.getModel("serviceDialog");
if (!oDialogModel || !this._currentEditingService) {
    // Create NEW model for add mode OR when not editing
    oDialogModel = new JSONModel({
        availableServices: aServices.value || [],
        selectedService: null,
        quantity: 1,
        unitPrice: 0,
        notes: "",
        isEditMode: false
    });
    this._oAddServiceDialog.setModel(oDialogModel, "serviceDialog");
                } else {
                    // Update existing model
                    oDialogModel.setProperty("/availableServices", aServices.value || []);
                    
                    // If in edit mode, find and set the selected service
                    if (oDialogModel.getProperty("/isEditMode")) {
                        var sCurrentServiceID = oDialogModel.getProperty("/selectedService/ID");
                        var oCurrentService = (aServices.value || []).find(function(service) {
                            return service.ID === sCurrentServiceID;
                        });
                        
                        if (oCurrentService) {
                            oDialogModel.setProperty("/selectedService", oCurrentService);
                            
                            // Pre-select in ComboBox
                            var oComboBox = this.byId("_IDGenComboBox");
                            if (oComboBox) {
                                oComboBox.setSelectedKey(sCurrentServiceID);
                            }
                        }
                    }
                }
            }.bind(this)).catch(function(oError) {
                console.error("Error loading available services:", oError);
                MessageToast.show("Error loading available services");
            });
        },
        
        // Override the existing onSaveService to handle both add and edit
        onSaveService: function() {
            var oDialogModel = this._oAddServiceDialog.getModel("serviceDialog");
            var oData = oDialogModel.getData();
            
            if (!oData.selectedService) {
                MessageBox.error("Please select a service");
                return;
            }
            
            if (!oData.quantity || oData.quantity <= 0) {
                MessageBox.error("Please enter a valid quantity");
                return;
            }
            
            if (!oData.unitPrice || oData.unitPrice <= 0) {
                MessageBox.error("Please enter a valid unit price");
                return;
            }
            
            var oViewModel = this.getView().getModel("activeTourDetail");
            var sTourId = oViewModel.getProperty("/tourId");
            var oTourService = this.getOwnerComponent().getModel("tourService");
            
            // Set busy state
            this._oAddServiceDialog.setBusy(true);
            
            var oContext;
            var sSuccessMessage;
            
            // Determine if this is add or edit mode
            if (oData.isEditMode) {
                // Edit existing service
                oContext = oTourService.bindContext("/updateActiveTourService(...)");
                oContext.setParameter("tourServiceID", oData.tourServiceID);
                oContext.setParameter("quantity", parseInt(oData.quantity));
                oContext.setParameter("unitPrice", parseFloat(oData.unitPrice));
                oContext.setParameter("notes", oData.notes);
                sSuccessMessage = "Service updated successfully";
            } else {
                // Add new service
                oContext = oTourService.bindContext("/addServiceToActiveTour(...)");
                oContext.setParameter("tourID", sTourId);
                oContext.setParameter("serviceID", oData.selectedService.ID);
                oContext.setParameter("quantity", parseInt(oData.quantity));
                oContext.setParameter("unitPrice", parseFloat(oData.unitPrice));
                oContext.setParameter("notes", oData.notes);
                sSuccessMessage = "Service added successfully";
            }
            
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                // Clear busy state
                this._oAddServiceDialog.setBusy(false);
                
                if ((oData.isEditMode && oResult && oResult.success) || 
                    (!oData.isEditMode && oResult && oResult.tourServiceID)) {
                    MessageToast.show(sSuccessMessage);
                    this._closeAndResetDialog();
                    this._loadTourServices();
                } else {
                    MessageBox.error(oResult && oResult.message ? oResult.message : "Failed to save service");
                }
            }.bind(this)).catch(function(oError) {
                // Clear busy state
                this._oAddServiceDialog.setBusy(false);
                console.error("Error saving service:", oError);
                MessageBox.error("Error saving service");
            });
        },
        
        onCancelAddService: function() {
            this._closeAndResetDialog();
        },
        
        // Helper method to close and reset dialog
        _closeAndResetDialog: function() {
            this._oAddServiceDialog.close();
            
            // Reset dialog for next use
            this._oAddServiceDialog.setTitle("Add Service to Tour");
            var oBeginButton = this._oAddServiceDialog.getBeginButton();
            oBeginButton.setText("Add");
            
            // Clear editing service reference
            this._currentEditingService = null;
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