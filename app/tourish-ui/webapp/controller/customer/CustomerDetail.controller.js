sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "../formatter"
], function (Controller, JSONModel, MessageBox, MessageToast, Fragment, formatter) {
    "use strict";

    return Controller.extend("tourishui.controller.customer.CustomerDetail", {
        formatter: formatter,
        
        onInit: function () {
            // Create models
            var oViewModel = new JSONModel({
                busy: false,
                currencyCode: "VND"
            });
            this.getView().setModel(oViewModel);
            
            // Create customer detail model
            var oCustomerDetailModel = new JSONModel({
                id: "",
                type: "",
                name: "",
                phone: "",
                email: "",
                address: "",
                notes: "",
                totalTransactions: 0,
                transactions: [],
                contracts: [],
                orders: [],
                // Individual customer specific fields
                birthDay: null,
                // Business customer specific fields
                taxCode: "",
                contactPerson: "",
                position: ""
            });
            this.getView().setModel(oCustomerDetailModel, "customerDetail");
            
            // Get router
            var oRouter = this.getOwnerComponent().getRouter();
            
            // Register for routeMatched event
            oRouter.getRoute("customerDetail").attachPatternMatched(this._onRouteMatched, this);
        },
        
        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            var sCustomerId = oArgs.customerId;
            var sCustomerType = oArgs.customerType;
            
            // Load customer data
            this._loadCustomerData(sCustomerId, sCustomerType);
        },
        
        _loadCustomerData: function (sCustomerId, sCustomerType) {
            var oView = this.getView();
            var oCustomerDetailModel = oView.getModel("customerDetail");
            
            oView.setBusy(true);
            
            // Call API based on customer type
            var sAction = sCustomerType === "Individual" ? "/getCustomerDetails" : "/getBusinessCustomerDetails";
            var oService = this.getOwnerComponent().getModel("customerService");
            var oContext = oService.bindContext(sAction + "(...)");
            
            oContext.setParameter("customerID", sCustomerId);
            
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult) {
                    // Set customer data
                    if (sCustomerType === "Individual") {
                        // Individual customer
                        oCustomerDetailModel.setData({
                            id: oResult.customer.ID,
                            type: "Individual",
                            name: oResult.customer.FullName,
                            phone: oResult.customer.Phone,
                            email: oResult.customer.Email,
                            address: oResult.customer.Address,
                            notes: oResult.customer.Notes,
                            totalTransactions: oResult.customer.TotalTransactions,
                            birthDay: oResult.customer.BirthDay,
                            // Set transactions, contracts, orders
                            transactions: oResult.transactions || [],
                            contracts: oResult.contracts || [],
                            orders: oResult.orders || []
                        });
                    } else {
                        // Business customer
                        oCustomerDetailModel.setData({
                            id: oResult.customer.ID,
                            type: "Business",
                            name: oResult.customer.CompanyName,
                            phone: oResult.customer.Phone,
                            email: oResult.customer.Email,
                            address: oResult.customer.Address,
                            notes: oResult.customer.Notes,
                            totalTransactions: oResult.customer.TotalTransactions,
                            taxCode: oResult.customer.TaxCode,
                            contactPerson: oResult.customer.ContactPerson,
                            position: oResult.customer.Position,
                            // Set transactions, contracts, orders
                            transactions: oResult.transactions || [],
                            contracts: oResult.contracts || [],
                            orders: oResult.orders || []
                        });
                    }
                } else {
                    // No result
                    MessageToast.show("Customer not found");
                    this.onNavBack();
                }
                
                oView.setBusy(false);
            }.bind(this)).catch(function(oError) {
                console.error("Error loading customer details:", oError);
                MessageToast.show("Error loading customer details");
                oView.setBusy(false);
                this.onNavBack();
            }.bind(this));
        },
        
        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("customer", {}, true);
        },
        
        onEditCustomer: function () {
            var oCustomerDetailModel = this.getView().getModel("customerDetail");
            var oCustomer = oCustomerDetailModel.getData();
            
            if (!this._oEditCustomerDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "tourishui.view.fragments.CustomerDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    this._oEditCustomerDialog = oDialog;
                    this._prepareCustomerEditDialog(oCustomer);
                }.bind(this));
            } else {
                this._prepareCustomerEditDialog(oCustomer);
            }
        },
        
        _prepareCustomerEditDialog: function (oCustomer) {
            // Create dialog model
            var oDialogModel = new JSONModel({
                title: "Edit Customer",
                customerType: oCustomer.type,
                customerId: oCustomer.id,
                isEdit: true,
                customer: {}
            });
            
            // Set customer data based on type
            if (oCustomer.type === "Individual") {
                oDialogModel.setProperty("/customer", {
                    fullName: oCustomer.name,
                    phone: oCustomer.phone || "",
                    email: oCustomer.email || "",
                    address: oCustomer.address || "",
                    birthday: oCustomer.birthDay,
                    notes: oCustomer.notes || ""
                });
            } else {
                oDialogModel.setProperty("/customer", {
                    companyName: oCustomer.name,
                    taxCode: oCustomer.taxCode || "",
                    contactPerson: oCustomer.contactPerson || "",
                    position: oCustomer.position || "",
                    phone: oCustomer.phone || "",
                    email: oCustomer.email || "",
                    address: oCustomer.address || "",
                    notes: oCustomer.notes || ""
                });
            }
            
            this._oEditCustomerDialog.setModel(oDialogModel, "dialog");
            this._oEditCustomerDialog.open();
        },

        determineButtonAction: function() {
                this.onUpdateCustomer();
        },
        
        onCustomerTypeChange: function(oEvent) {
            var sCustomerType = oEvent.getParameter("key");
            var oDialogModel = this._oEditCustomerDialog.getModel("dialog");
            
            oDialogModel.setProperty("/customerType", sCustomerType);
        },
        
        onCustomerTypeInfoPress: function(oEvent) {
            MessageToast.show("Customer type cannot be changed in edit mode");
        },
        
        onUpdateCustomer: function () {
            var oView = this.getView();
            var oDialogModel = this._oEditCustomerDialog.getModel("dialog");
            var oCustomer = oDialogModel.getProperty("/customer");
            var sCustomerType = oDialogModel.getProperty("/customerType");
            var sCustomerId = oDialogModel.getProperty("/customerId");
            var oService = this.getOwnerComponent().getModel("customerService");
            
            // Validate required fields
            var bValid = true;
            var sErrorMessage = "";
            
            if (sCustomerType === "Individual") {
                if (!oCustomer.fullName) {
                    bValid = false;
                    sErrorMessage = "Full Name is required";
                }
            } else { // Business
                if (!oCustomer.companyName) {
                    bValid = false;
                    sErrorMessage = "Company Name is required";
                }
            }
            
            if (!bValid) {
                MessageBox.error(sErrorMessage);
                return;
            }
            
            // Show busy indicator
            this._oEditCustomerDialog.setBusy(true);
            
            // Determine which API to call based on customer type
            var sAction = sCustomerType === "Individual" ? "/updateCustomer" : "/updateBusinessCustomer";
            var oContext = oService.bindContext(sAction + "(...)");
            
            if (sCustomerType === "Individual") {
                oContext.setParameter("customerID", sCustomerId);
                oContext.setParameter("fullName", oCustomer.fullName);
                oContext.setParameter("phone", oCustomer.phone || "");
                oContext.setParameter("email", oCustomer.email || "");
                oContext.setParameter("address", oCustomer.address || "");
                oContext.setParameter("birthday", oCustomer.birthday || null);
                oContext.setParameter("notes", oCustomer.notes || "");
            } else { // Business
                oContext.setParameter("customerID", sCustomerId);
                oContext.setParameter("companyName", oCustomer.companyName);
                oContext.setParameter("taxCode", oCustomer.taxCode || "");
                oContext.setParameter("contactPerson", oCustomer.contactPerson || "");
                oContext.setParameter("position", oCustomer.position || "");
                oContext.setParameter("phone", oCustomer.phone || "");
                oContext.setParameter("email", oCustomer.email || "");
                oContext.setParameter("address", oCustomer.address || "");
                oContext.setParameter("notes", oCustomer.notes || "");
            }
            
            oContext.execute().then(function() {
                this._oEditCustomerDialog.setBusy(false);
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.success) {
                    MessageToast.show("Customer updated successfully");
                    this._oEditCustomerDialog.close();
                    
                    // Reload customer data
                    this._loadCustomerData(sCustomerId, sCustomerType);
                } else {
                    MessageBox.error(oResult.message || "Error updating customer");
                }
            }.bind(this)).catch(function(oError) {
                this._oEditCustomerDialog.setBusy(false);
                MessageBox.error("Error updating customer: " + oError.message);
            }.bind(this));
        },
        
        onCancelCustomer: function() {
            this._oEditCustomerDialog.close();
        },
        
        onDeleteCustomer: function () {
            var oCustomerDetailModel = this.getView().getModel("customerDetail");
            var oCustomer = oCustomerDetailModel.getData();
            
            MessageBox.confirm(
                "Are you sure you want to delete this customer?", {
                    title: "Confirm Delete",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            this._deleteCustomer(oCustomer.id, oCustomer.type);
                        }
                    }.bind(this)
                }
            );
        },
        
        _deleteCustomer: function (sCustomerId, sCustomerType) {
            var oView = this.getView();
            var oService = this.getOwnerComponent().getModel("customerService");
            
            // Determine which API to call based on customer type
            var sAction = sCustomerType === "Individual" ? "/deleteCustomer" : "/deleteBusinessCustomer";
            var oContext = oService.bindContext(sAction + "(...)");
            
            oContext.setParameter("customerID", sCustomerId);
            
            oView.setBusy(true);
            
            oContext.execute().then(function() {
                oView.setBusy(false);
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.success) {
                    MessageToast.show("Customer deleted successfully");
                    
                    // Navigate back to customer list
                    this.onNavBack();
                } else {
                    MessageBox.error(oResult.message || "Error deleting customer");
                }
            }.bind(this)).catch(function(oError) {
                oView.setBusy(false);
                MessageBox.error("Error deleting customer: " + oError.message);
            }.bind(this));
        },
        
        onAddTransaction: function () {
            if (!this._oTransactionDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "tourishui.view.fragments.TransactionDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    this._oTransactionDialog = oDialog;
                    
                    // Create a model for the dialog
                    var oDialogModel = new JSONModel({
                        amount: "",
                        description: ""
                    });
                    
                    this._oTransactionDialog.setModel(oDialogModel, "transaction");
                    this._oTransactionDialog.open();
                }.bind(this));
            } else {
                // Reset the dialog model
                var oDialogModel = this._oTransactionDialog.getModel("transaction");
                oDialogModel.setData({
                    amount: "",
                    description: ""
                });
                
                this._oTransactionDialog.open();
            }
        },
        
        onSaveTransaction: function () {
            var oView = this.getView();
            var oDialogModel = this._oTransactionDialog.getModel("transaction");
            var oTransactionData = oDialogModel.getData();
            var oCustomerDetailModel = oView.getModel("customerDetail");
            var oCustomer = oCustomerDetailModel.getData();
            var oService = this.getOwnerComponent().getModel("customerService");
            
            // Validate fields
            if (!oTransactionData.amount) {
                MessageBox.error("Amount is required");
                return;
            }
            
            if (!oTransactionData.description) {
                MessageBox.error("Description is required");
                return;
            }
            
            // Show busy indicator
            this._oTransactionDialog.setBusy(true);
            
            // Determine which API to call based on customer type
            var sAction = oCustomer.type === "Individual" ? "/recordCustomerTransaction" : "/recordBusinessCustomerTransaction";
            var oContext = oService.bindContext(sAction + "(...)");
            
            oContext.setParameter("customerID", oCustomer.id);
            oContext.setParameter("amount", parseFloat(oTransactionData.amount));
            oContext.setParameter("description", oTransactionData.description);
            
            oContext.execute().then(function() {
                this._oTransactionDialog.setBusy(false);
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.transactionID) {
                    MessageToast.show("Transaction recorded successfully");
                    this._oTransactionDialog.close();
                    
                    // Reload customer data
                    this._loadCustomerData(oCustomer.id, oCustomer.type);
                } else {
                    MessageBox.error(oResult.message || "Error recording transaction");
                }
            }.bind(this)).catch(function(oError) {
                this._oTransactionDialog.setBusy(false);
                MessageBox.error("Error recording transaction: " + oError.message);
            }.bind(this));
        },
        
        onCancelTransaction: function () {
            this._oTransactionDialog.close();
        },
        
        onDeleteTransaction: function (oEvent) {
            MessageBox.information("Transaction deletion is not implemented in this version.");
            // Note: In a real app, you would implement transaction deletion here
        },
        
        onAddContract: function () {
            // Navigate to contract creation page passing customer ID
            var oCustomerDetailModel = this.getView().getModel("customerDetail");
            var oCustomer = oCustomerDetailModel.getData();
            
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("createContract", {
                customerId: oCustomer.id,
                customerType: oCustomer.type
            });
        },
        
        onViewContract: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getBindingContext("customerDetail");
            var sContractId = oItem.getProperty("ID");
            
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("contractDetail", {
                contractId: sContractId
            });
        },
        
        onAddOrder: function () {
            // Navigate to order creation page passing customer ID
            var oCustomerDetailModel = this.getView().getModel("customerDetail");
            var oCustomer = oCustomerDetailModel.getData();
            
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("createOrder", {
                customerId: oCustomer.id,
                customerType: oCustomer.type
            });
        },
        
        onViewOrder: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getBindingContext("customerDetail");
            var sOrderId = oItem.getProperty("ID");
            
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("orderDetail", {
                orderId: sOrderId
            });
        }
    });
});