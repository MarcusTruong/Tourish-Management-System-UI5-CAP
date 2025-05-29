// File: tourishui/controller/order/CreateOrder.controller.js
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "../formatter"
], function (Controller, JSONModel, MessageBox, MessageToast, formatter) {
    "use strict";

    return Controller.extend("tourishui.controller.order.CreateOrder", {
        formatter: formatter,
        
        onInit: function () {
            // Initialize the model for create order
            var oViewModel = new JSONModel({
                busy: false,
                currencyCode: "USD",
                // Available tours
                availableTours: [],
                // Selected tour
                selectedTour: null,
                // Participant counts
                adultCount: 0,
                childCount: 0,
                // Price calculation
                calculation: {
                    adultPrice: 0,
                    childPrice: 0,
                    adultTotal: 0,
                    childTotal: 0,
                    discountAmount: 0,
                    totalAmount: 0
                },
                // Customer selection
                customerSelectionType: "existing", // existing or new
                customerTypeFilter: "All",
                customers: [],
                selectedCustomer: null,
                // New customer data
                newCustomer: {
                    type: "Individual", // Individual or Business
                    fullName: "",
                    phone: "",
                    email: "",
                    address: "",
                    birthday: null,
                    notes: "",
                    // Business customer fields
                    companyName: "",
                    taxCode: "",
                    contactPerson: "",
                    position: ""
                },
                // Order notes
                orderNotes: ""
            });
            this.getView().setModel(oViewModel, "createOrder");

            // Register for route matched event
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("createOrder").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var oViewModel = this.getView().getModel("createOrder");
            oViewModel.setData({
                busy: false,
                currencyCode: "USD",
                isEditMode: false,
                editOrderId: null,
                // Available tours
                availableTours: [],
                // Selected tour
                selectedTour: null,
                // Participant counts
                adultCount: 0,
                childCount: 0,
                // Price calculation
                calculation: {
                    adultPrice: 0,
                    childPrice: 0,
                    adultTotal: 0,
                    childTotal: 0,
                    discountAmount: 0,
                    totalAmount: 0
                },
                // Customer selection
                customerSelectionType: "existing", // existing or new
                customerTypeFilter: "All",
                customers: [],
                selectedCustomer: null,
                // New customer data
                newCustomer: {
                    type: "Individual", // Individual or Business
                    fullName: "",
                    phone: "",
                    email: "",
                    address: "",
                    birthday: null,
                    notes: "",
                    // Business customer fields
                    companyName: "",
                    taxCode: "",
                    contactPerson: "",
                    position: ""
                },
                // Order notes
                orderNotes: ""
            })

            var sOrderId = null;
            var oOrderEditModel = this.getOwnerComponent().getModel("orderEdit");
            if (oOrderEditModel) {
                sOrderId = oOrderEditModel.getProperty("/orderId");
                console.log("Order Id : ", sOrderId);

                oOrderEditModel.setProperty("/orderId", null);
            }
            // Load available tours when the route is matched
            this._loadAvailableTours();

            this._loadOrderForEdit(sOrderId);
            
            // Load available customers 
            this._loadCustomers();
        },

        _loadOrderForEdit: function(sOrderId) {
            if (!sOrderId) return;
            
            var oView = this.getView();
            var oViewModel = oView.getModel("createOrder");
            var title;
            oView.setBusy(true);
            
            var oService = this.getOwnerComponent().getModel("orderService");
            var oContext = oService.bindContext("/getOrderDetails(...)");
            
            oContext.setParameter("orderID", sOrderId);
            
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                if (oResult) {
                    // Set edit mode
                    oViewModel.setProperty("/isEditMode", true);
                    oViewModel.setProperty("/editOrderId", sOrderId);
                    
                    // Set tour selection
                    var oSelectedTour = oViewModel.getProperty("/availableTours").find(tour => 
                        tour.ID === oResult.order.ActiveTourID);
                    oViewModel.setProperty("/selectedTour", oSelectedTour);
                    
                    // Set participant counts
                    oViewModel.setProperty("/adultCount", oResult.order.AdultCount);
                    oViewModel.setProperty("/childCount", oResult.order.ChildCount);
                    
                    // Set customer
                    if (oResult.customer) {
                        oViewModel.setProperty("/customerSelectionType", "existing");
                        oViewModel.setProperty("/selectedCustomer", {
                            ID: oResult.customer.ID,
                            Name: oResult.customer.Name,
                            Type: oResult.order.CustomerType,
                            Phone: oResult.customer.Phone,
                            Email: oResult.customer.Email
                        });
                    }
                    
                    // Set order notes
                    oViewModel.setProperty("/orderNotes", oResult.order.Notes || "");
                    
                    // Calculate prices
                    if (oSelectedTour) {
                        this._updatePriceCalculation();
                    }
                    
                }
                
                oView.setBusy(false);
            }.bind(this)).catch(function(oError) {
                console.error("Error loading order for edit:", oError);
                MessageToast.show("Error loading order details");
                oView.setBusy(false);
            }.bind(this));
        },

        _loadAvailableTours: function() {
            var oViewModel = this.getView().getModel("createOrder");
            oViewModel.setProperty("/busy", true);
            
            // Get the order service model
            var oOrderService = this.getOwnerComponent().getModel("orderService");
            
            // Call the getActiveToursForOrder function
            var oContext = oOrderService.bindContext("/getActiveToursForOrder(...)");
            
            oContext.execute().then(function() {
                var aResult = oContext.getBoundContext().getObject();
                console.log(aResult);
                if (aResult) {
                    // Set available tours
                    oViewModel.setProperty("/availableTours", aResult.value);
                } else {
                    // No tours available
                    oViewModel.setProperty("/availableTours", []);
                    MessageToast.show("No tours available for booking");
                }
                
                oViewModel.setProperty("/busy", false);
            }).catch(function(oError) {
                console.error("Error loading available tours:", oError);
                MessageToast.show("Error loading available tours");
                oViewModel.setProperty("/busy", false);
            });
        },

        onTourSelectionChange: function(oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            var oSelectedTour = oSelectedItem.getBindingContext("createOrder").getObject();
            var oViewModel = this.getView().getModel("createOrder");
            
            // Set selected tour
            oViewModel.setProperty("/selectedTour", oSelectedTour);
            
            // Reset participant counts and calculations
            oViewModel.setProperty("/adultCount", 0);
            oViewModel.setProperty("/childCount", 0);
            this._updatePriceCalculation();
            
            MessageToast.show("Tour selected: " + oSelectedTour.TourName);
        },

        onParticipantCountChange: function() {
            // Update price calculation when participant counts change
            this._updatePriceCalculation();
        },

        _updatePriceCalculation: function() {
            var oViewModel = this.getView().getModel("createOrder");
            var oSelectedTour = oViewModel.getProperty("/selectedTour");
            var iAdultCount = oViewModel.getProperty("/adultCount") || 0;
            var iChildCount = oViewModel.getProperty("/childCount") || 0;
            
            if (!oSelectedTour) {
                return;
            }
            
            // Get prices
            var fAdultPrice = oSelectedTour.AdultPrice || 0;
            var fChildPrice = oSelectedTour.ChildPrice || 0;
            
            // Calculate totals
            var fAdultTotal = fAdultPrice * iAdultCount;
            var fChildTotal = fChildPrice * iChildCount;
            var fTotalAmount = fAdultTotal + fChildTotal;
            
            // Update calculation model
            oViewModel.setProperty("/calculation", {
                adultPrice: fAdultPrice,
                childPrice: fChildPrice,
                adultTotal: fAdultTotal,
                childTotal: fChildTotal,
                discountAmount: 0, // TODO: Add promotion support later
                totalAmount: fTotalAmount
            });
        },

        onCustomerTypeChange: function(oEvent) {
            var sKey = oEvent.getParameter("key");
            var oViewModel = this.getView().getModel("createOrder");
            
            oViewModel.setProperty("/customerSelectionType", sKey);
            
            // Clear selected customer when switching types
            oViewModel.setProperty("/selectedCustomer", null);
            
            // Load customers if switching to existing
            if (sKey === "existing") {
                this._loadCustomers();
            }
        },

        onNewCustomerTypeChange: function(oEvent) {
            var sKey = oEvent.getParameter("key");
            var oViewModel = this.getView().getModel("createOrder");
            
            // Reset new customer data when switching types
            var oNewCustomer = {
                type: sKey,
                fullName: "",
                phone: "",
                email: "",
                address: "",
                birthday: null,
                notes: "",
                // Business customer fields
                companyName: "",
                taxCode: "",
                contactPerson: "",
                position: ""
            };
            
            oViewModel.setProperty("/newCustomer", oNewCustomer);
        },

        onCustomerSearch: function() {
            this._loadCustomers();
        },

        _loadCustomers: function() {
            var oViewModel = this.getView().getModel("createOrder");
            var sSearchTerm = this.byId("customerSearchField2").getValue();
            var sCustomerType = oViewModel.getProperty("/customerTypeFilter");
            
            oViewModel.setProperty("/busy", true);
            
            // Get the order service model
            var oOrderService = this.getOwnerComponent().getModel("orderService");
            
            // Call the getCustomersForOrder function
            var oContext = oOrderService.bindContext("/getCustomersForOrder(...)");
            
            oContext.setParameter("searchTerm", sSearchTerm || "");
            oContext.setParameter("customerType", sCustomerType || "All");
            
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult) {
                    // Combine individual and business customers
                    var aCustomers = [];
                    
                    // Add individual customers
                    if (oResult.individuals) {
                        oResult.individuals.forEach(function(customer) {
                            aCustomers.push({
                                ID: customer.ID,
                                Name: customer.FullName,
                                Type: "Individual",
                                Phone: customer.Phone,
                                Email: customer.Email
                            });
                        });
                    }
                    
                    // Add business customers
                    if (oResult.businesses) {
                        oResult.businesses.forEach(function(customer) {
                            aCustomers.push({
                                ID: customer.ID,
                                Name: customer.CompanyName,
                                Type: "Business",
                                Phone: customer.Phone,
                                Email: customer.Email,
                                ContactPerson: customer.ContactPerson
                            });
                        });
                    }
                    
                    // Set customers
                    oViewModel.setProperty("/customers", aCustomers);
                } else {
                    // No customers found
                    oViewModel.setProperty("/customers", []);
                }
                
                oViewModel.setProperty("/busy", false);
            }).catch(function(oError) {
                console.error("Error loading customers:", oError);
                MessageToast.show("Error loading customers");
                oViewModel.setProperty("/busy", false);
            });
        },

        onCustomerSelectionChange: function(oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            var oSelectedCustomer = oSelectedItem.getBindingContext("createOrder").getObject();
            var oViewModel = this.getView().getModel("createOrder");
            
            // Set selected customer
            oViewModel.setProperty("/selectedCustomer", oSelectedCustomer);
            
            MessageToast.show("Customer selected: " + oSelectedCustomer.Name);
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("orderList", {}, true);
        },

        onCreateOrder: function() {
            var oViewModel = this.getView().getModel("createOrder");
            var oView = this.getView();
            var bIsEditMode = oViewModel.getProperty("/isEditMode");
            

            // Validate the form
            if (!this._validateOrderData()) {
                return;
            }
            
            oView.setBusy(true);
            
            if (bIsEditMode) {
                // Update existing order
                this._updateOrder();
            } else {
            // Create new order
            // Prepare order data
            var oOrderData = this._prepareOrderData();
            
            // First, create customer if needed
            if (oViewModel.getProperty("/customerSelectionType") === "new") {
                this._createCustomerAndOrder(oOrderData);
            } else {
                this._createOrder(oOrderData);
            }
        }
        },

        _updateOrder: function() {
            var oViewModel = this.getView().getModel("createOrder");
            var oView = this.getView();
            var sOrderId = oViewModel.getProperty("/editOrderId");
            
            // Prepare update data
            var oUpdateData = this._prepareUpdateData();
            
            // Get the order service model
            var oOrderService = this.getOwnerComponent().getModel("orderService");
            
            // Call the updateOrder action
            var oContext = oOrderService.bindContext("/updateOrder(...)");
            
            // Set parameters
            oContext.setParameter("orderID", sOrderId);
            oContext.setParameter("adultCount", oUpdateData.adultCount);
            oContext.setParameter("childCount", oUpdateData.childCount);
            oContext.setParameter("promotionID", oUpdateData.promotionID);
            oContext.setParameter("notes", oUpdateData.notes);
            
            // Execute order update
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.success) {
                    // Order updated successfully
                    MessageToast.show("Order updated successfully");
                    
                    // Navigate back to order list
                    var oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("orderList");
                } else {
                    // Order update failed
                    MessageBox.error(oResult.message || "Failed to update order");
                }
                
                oView.setBusy(false);
            }.bind(this)).catch(function(oError) {
                console.error("Error updating order:", oError);
                MessageBox.error("Error updating order: " + (oError.message || "Unknown error"));
                oView.setBusy(false);
            });
        },

        _prepareUpdateData: function() {
            var oViewModel = this.getView().getModel("createOrder");
            
            var iAdultCount = oViewModel.getProperty("/adultCount") || 0;
            var iChildCount = oViewModel.getProperty("/childCount") || 0;
            var sOrderNotes = oViewModel.getProperty("/orderNotes") || "";
            
            return {
                adultCount: iAdultCount,
                childCount: iChildCount,
                promotionID: null, // TODO: Add promotion support
                notes: sOrderNotes
            };
        },

        _validateOrderData: function() {
            var oViewModel = this.getView().getModel("createOrder");
            
            // Check if tour is selected
            if (!oViewModel.getProperty("/selectedTour")) {
                MessageBox.error("Please select a tour");
                return false;
            }
            
            // Check if participants are specified
            var iAdultCount = oViewModel.getProperty("/adultCount") || 0;
            var iChildCount = oViewModel.getProperty("/childCount") || 0;
            
            if (iAdultCount === 0 && iChildCount === 0) {
                MessageBox.error("Please specify at least one adult or child");
                return false;
            }
            
            // Check customer selection
            var sCustomerSelectionType = oViewModel.getProperty("/customerSelectionType");
            
            if (sCustomerSelectionType === "existing") {
                if (!oViewModel.getProperty("/selectedCustomer")) {
                    MessageBox.error("Please select a customer");
                    return false;
                }
            } else {
                // Validate new customer data
                var oNewCustomer = oViewModel.getProperty("/newCustomer");
                
                if (oNewCustomer.type === "Individual") {
                    if (!oNewCustomer.fullName || oNewCustomer.fullName.trim() === "") {
                        MessageBox.error("Please enter customer full name");
                        return false;
                    }
                } else {
                    if (!oNewCustomer.companyName || oNewCustomer.companyName.trim() === "") {
                        MessageBox.error("Please enter company name");
                        return false;
                    }
                }
            }
            
            return true;
        },

        _prepareOrderData: function() {
            var oViewModel = this.getView().getModel("createOrder");
            
            var oSelectedTour = oViewModel.getProperty("/selectedTour");
            var iAdultCount = oViewModel.getProperty("/adultCount") || 0;
            var iChildCount = oViewModel.getProperty("/childCount") || 0;
            var sOrderNotes = oViewModel.getProperty("/orderNotes") || "";
            
            var oOrderData = {
                activeTourID: oSelectedTour.ID,
                adultCount: iAdultCount,
                childCount: iChildCount,
                promotionID: null, // TODO: Add promotion support
                notes: sOrderNotes
            };
            
            // Add customer data based on selection type
            var sCustomerSelectionType = oViewModel.getProperty("/customerSelectionType");
            
            if (sCustomerSelectionType === "existing") {
                var oSelectedCustomer = oViewModel.getProperty("/selectedCustomer");
                oOrderData.customerID = oSelectedCustomer.ID;
                oOrderData.customerType = oSelectedCustomer.Type;
            } else {
                var oNewCustomer = oViewModel.getProperty("/newCustomer");
                oOrderData.customerType = oNewCustomer.type;
                oOrderData.newCustomerData = oNewCustomer;
            }
            
            return oOrderData;
        },

        _createCustomerAndOrder: function(oOrderData) {
            var oView = this.getView();
            var oNewCustomer = oOrderData.newCustomerData;
            
            // Get the customer service model
            var oCustomerService = this.getOwnerComponent().getModel("customerService");
            
            // Prepare customer creation action
            var sAction = oNewCustomer.type === "Individual" ? "/createCustomer" : "/createBusinessCustomer";
            var oContext = oCustomerService.bindContext(sAction + "(...)");
            
            // Set parameters based on customer type
            if (oNewCustomer.type === "Individual") {
                oContext.setParameter("fullName", oNewCustomer.fullName);
                oContext.setParameter("phone", oNewCustomer.phone || "");
                oContext.setParameter("email", oNewCustomer.email || "");
                oContext.setParameter("address", oNewCustomer.address || "");
                oContext.setParameter("birthday", oNewCustomer.birthday || null);
                oContext.setParameter("notes", oNewCustomer.notes || "");
            } else {
                oContext.setParameter("companyName", oNewCustomer.companyName);
                oContext.setParameter("taxCode", oNewCustomer.taxCode || "");
                oContext.setParameter("contactPerson", oNewCustomer.contactPerson || "");
                oContext.setParameter("position", oNewCustomer.position || "");
                oContext.setParameter("phone", oNewCustomer.phone || "");
                oContext.setParameter("email", oNewCustomer.email || "");
                oContext.setParameter("address", oNewCustomer.address || "");
                oContext.setParameter("notes", oNewCustomer.notes || "");
            }
            
            // Execute customer creation
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.customerID) {
                    // Customer created successfully, now create order
                    oOrderData.customerID = oResult.customerID;
                    delete oOrderData.newCustomerData; // Remove customer data from order
                    
                    this._createOrder(oOrderData);
                } else {
                    // Customer creation failed
                    oView.setBusy(false);
                    MessageBox.error(oResult.message || "Failed to create customer");
                }
            }.bind(this)).catch(function(oError) {
                console.error("Error creating customer:", oError);
                oView.setBusy(false);
                MessageBox.error("Error creating customer: " + (oError.message || "Unknown error"));
            });
        },

        _createOrder: function(oOrderData) {
            var oView = this.getView();
            
            // Get the order service model
            var oOrderService = this.getOwnerComponent().getModel("orderService");
            
            // Call the createOrder action
            var oContext = oOrderService.bindContext("/createOrder(...)");
            
            // Set parameters
            oContext.setParameter("customerID", oOrderData.customerID);
            oContext.setParameter("customerType", oOrderData.customerType);
            oContext.setParameter("activeTourID", oOrderData.activeTourID);
            oContext.setParameter("adultCount", oOrderData.adultCount);
            oContext.setParameter("childCount", oOrderData.childCount);
            oContext.setParameter("promotionID", oOrderData.promotionID);
            oContext.setParameter("notes", oOrderData.notes);
            
            // Execute order creation
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.orderID) {
                    // Order created successfully
                    MessageToast.show("Order created successfully");
                    
                    // Navigate to the order detail page
                    var oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("orderDetail", {
                        orderId: oResult.orderID
                    });
                } else {
                    // Order creation failed
                    MessageBox.error(oResult.message || "Failed to create order");
                }
                
                oView.setBusy(false);
            }.bind(this)).catch(function(oError) {
                console.error("Error creating order:", oError);
                MessageBox.error("Error creating order: " + (oError.message || "Unknown error"));
                oView.setBusy(false);
            });
        }
    });
});