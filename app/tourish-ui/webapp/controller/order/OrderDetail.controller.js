// File: tourishui/controller/order/OrderDetail.controller.js
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "../formatter"
], function (Controller, JSONModel, MessageBox, MessageToast, Fragment, formatter) {
    "use strict";

    return Controller.extend("tourishui.controller.order.OrderDetail", {
        formatter: formatter,
        
        onInit: function () {
            // Create models
            var oViewModel = new JSONModel({
                busy: false,
                currencyCode: "USD"
            });
            this.getView().setModel(oViewModel);
            
            // Create order detail model
            var oOrderDetailModel = new JSONModel();
            this.getView().setModel(oOrderDetailModel, "orderDetail");
            
            // Get router
            var oRouter = this.getOwnerComponent().getRouter();
            
            // Register for routeMatched event
            oRouter.getRoute("orderDetail").attachPatternMatched(this._onRouteMatched, this);
        },
        
        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            var sOrderId = oArgs.orderId;
            
            // Load order data
            this._loadOrderData(sOrderId);
        },
        
        _loadOrderData: function (sOrderId) {
            var oView = this.getView();
            var oOrderDetailModel = oView.getModel("orderDetail");
            
            oView.setBusy(true);
            
            // Call API to get order details
            var oService = this.getOwnerComponent().getModel("orderService");
            var oContext = oService.bindContext("/getOrderDetails(...)");
            
            oContext.setParameter("orderID", sOrderId);
            
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult) {
                    // Combine order, customer, tour and payments data
                    var oOrderData = {
                        ...oResult.order,
                        CustomerName: oResult.customer ? oResult.customer.Name : 'Unknown',
                        TourName: oResult.tour ? oResult.tour.TourName : 'Unknown',
                        DepartureDate: oResult.tour ? oResult.tour.DepartureDate : null,
                        ReturnDate: oResult.tour ? oResult.tour.ReturnDate : null,
                        Payments: oResult.payments || []
                    };
                    
                    // Set order data
                    oOrderDetailModel.setData(oOrderData);
                } else {
                    // No result
                    MessageToast.show("Order not found");
                    this.onNavBack();
                }
                
                oView.setBusy(false);
            }.bind(this)).catch(function(oError) {
                console.error("Error loading order details:", oError);
                MessageToast.show("Error loading order details");
                oView.setBusy(false);
                this.onNavBack();
            }.bind(this));
        },
        
        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("orderList", {}, true);
        },
        
        onEditOrder: function () {
            var oOrderDetailModel = this.getView().getModel("orderDetail");
            var sOrderId = oOrderDetailModel.getProperty("/ID");
            
            // Navigate to edit order page
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("editOrder", {
                orderId: sOrderId
            });
        },
        
        onCancelOrder: function () {
            var oOrderDetailModel = this.getView().getModel("orderDetail");
            var sOrderId = oOrderDetailModel.getProperty("/ID");
            var sTourName = oOrderDetailModel.getProperty("/TourName");
            
            // Show confirmation dialog
            MessageBox.confirm("Are you sure you want to cancel this order for '" + sTourName + "'?", {
                title: "Confirm Cancellation",
                onClose: function(sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this._showCancelReasonDialog(sOrderId);
                    }
                }.bind(this)
            });
        },
        
        _showCancelReasonDialog: function(sOrderId) {
            // Create an input dialog for cancellation reason
            if (!this._oCancelReasonDialog) {
                this._oCancelReasonDialog = new sap.m.Dialog({
                    title: "Cancellation Reason",
                    type: "Message",
                    content: [
                        new sap.m.Label({
                            text: "Please provide a reason for cancellation:",
                            labelFor: "cancelReasonInput"
                        }),
                        new sap.m.TextArea("cancelReasonInput", {
                            width: "100%",
                            placeholder: "Enter reason...",
                            liveChange: function(oEvent) {
                                var sText = oEvent.getParameter("value");
                                var oDialog = oEvent.getSource().getParent();
                                oDialog.getBeginButton().setEnabled(sText.trim().length > 0);
                            }
                        })
                    ],
                    beginButton: new sap.m.Button({
                        text: "Submit",
                        enabled: false,
                        press: function () {
                            var sReason = sap.ui.getCore().byId("cancelReasonInput").getValue();
                            this._cancelOrder(sOrderId, sReason);
                            this._oCancelReasonDialog.close();
                        }.bind(this)
                    }),
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        press: function () {
                            this._oCancelReasonDialog.close();
                        }.bind(this)
                    }),
                    afterClose: function() {
                        sap.ui.getCore().byId("cancelReasonInput").setValue("");
                    }
                });
                
                this.getView().addDependent(this._oCancelReasonDialog);
            } else {
                // Reset input
                sap.ui.getCore().byId("cancelReasonInput").setValue("");
                this._oCancelReasonDialog.getBeginButton().setEnabled(false);
            }
            
            this._oCancelReasonDialog.open();
        },
        
        _cancelOrder: function(sOrderId, sReason) {
            var oView = this.getView();
            oView.setBusy(true);
            
            // Call the cancelOrder action
            var oOrderService = this.getOwnerComponent().getModel("orderService");
            var oContext = oOrderService.bindContext("/cancelOrder(...)");
            
            // Set parameters
            oContext.setParameter("orderID", sOrderId);
            oContext.setParameter("reason", sReason);
            
            // Execute the action
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.success) {
                    // Order canceled successfully
                    MessageToast.show("Order canceled successfully");
                    
                    // Reload order data
                    this._loadOrderData(sOrderId);
                } else {
                    // Order cancellation failed
                    MessageBox.error(oResult.message || "Failed to cancel order");
                }
                
                oView.setBusy(false);
            }.bind(this)).catch(function(oError) {
                console.error("Error canceling order:", oError);
                MessageBox.error("Error canceling order: " + (oError.message || "Unknown error"));
                oView.setBusy(false);
            });
        },
        
        onAddPayment: function () {
            if (!this._oAddPaymentDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "tourishui.view.fragments.AddPaymentDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    this._oAddPaymentDialog = oDialog;
                    
                    // Create a model for the dialog
                    var oDialogModel = new JSONModel({
                        amount: "",
                        paymentMethod: "Cash",
                        paymentDate: new Date(),
                        recordTransaction: true
                    });
                    
                    this._oAddPaymentDialog.setModel(oDialogModel, "payment");
                    this._oAddPaymentDialog.open();
                }.bind(this));
            } else {
                // Reset the dialog model
                var oDialogModel = this._oAddPaymentDialog.getModel("payment");
                oDialogModel.setData({
                    amount: "",
                    paymentMethod: "Cash",
                    paymentDate: new Date(),
                    recordTransaction: true
                });
                
                this._oAddPaymentDialog.open();
            }
        },
        
        onSavePayment: function () {
            var oView = this.getView();
            var oDialogModel = this._oAddPaymentDialog.getModel("payment");
            var oPaymentData = oDialogModel.getData();
            var oOrderDetailModel = oView.getModel("orderDetail");
            var sOrderId = oOrderDetailModel.getProperty("/ID");
            var oService = this.getOwnerComponent().getModel("orderService");
            
            // Validate fields
            if (!oPaymentData.amount || parseFloat(oPaymentData.amount) <= 0) {
                MessageBox.error("Please enter a valid payment amount");
                return;
            }
            
            if (!oPaymentData.paymentMethod) {
                MessageBox.error("Please select a payment method");
                return;
            }
            
            // Format the date if needed
            var oPaymentDate = oPaymentData.paymentDate;
            if (oPaymentDate instanceof Date) {
                oPaymentDate = this.formatter.formatDateForBackend(oPaymentDate);
            }
            
            // Show busy indicator
            this._oAddPaymentDialog.setBusy(true);
            
            // Call the addPayment action
            var oContext = oService.bindContext("/addPayment(...)");
            
            oContext.setParameter("orderID", sOrderId);
            oContext.setParameter("paymentDate", oPaymentDate);
            oContext.setParameter("amount", parseFloat(oPaymentData.amount));
            oContext.setParameter("paymentMethod", oPaymentData.paymentMethod);
            oContext.setParameter("recordTransaction", oPaymentData.recordTransaction);
            
            oContext.execute().then(function() {
                this._oAddPaymentDialog.setBusy(false);
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.paymentID) {
                    MessageToast.show("Payment added successfully");
                    this._oAddPaymentDialog.close();
                    
                    // Reload order data
                    this._loadOrderData(sOrderId);
                } else {
                    MessageBox.error(oResult.message || "Error adding payment");
                }
            }.bind(this)).catch(function(oError) {
                this._oAddPaymentDialog.setBusy(false);
                MessageBox.error("Error adding payment: " + oError.message);
            }.bind(this));
        },
        
        onCancelPayment: function () {
            this._oAddPaymentDialog.close();
        },
        
        onDeletePayment: function (oEvent) {
            var oButton = oEvent.getSource();
            var sPaymentId = oButton.getBindingContext("orderDetail").getProperty("ID");
            var oOrderDetailModel = this.getView().getModel("orderDetail");
            var sOrderId = oOrderDetailModel.getProperty("/ID");
            
            // Confirm deletion
            MessageBox.confirm("Are you sure you want to delete this payment?", {
                title: "Confirm Delete",
                onClose: function(sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this._deletePayment(sPaymentId, sOrderId);
                    }
                }.bind(this)
            });
        },
        
        _deletePayment: function(sPaymentId, sOrderId) {
            var oView = this.getView();
            oView.setBusy(true);
            
            // Call the deletePayment action
            var oOrderService = this.getOwnerComponent().getModel("orderService");
            var oContext = oOrderService.bindContext("/deletePayment(...)");
            
            // Set parameter
            oContext.setParameter("paymentID", sPaymentId);
            
            // Execute the action
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.success) {
                    // Payment deleted successfully
                    MessageToast.show("Payment deleted successfully");
                    
                    // Reload order data
                    this._loadOrderData(sOrderId);
                } else {
                    // Payment deletion failed
                    MessageBox.error(oResult.message || "Failed to delete payment");
                }
                
                oView.setBusy(false);
            }.bind(this)).catch(function(oError) {
                console.error("Error deleting payment:", oError);
                MessageBox.error("Error deleting payment: " + (oError.message || "Unknown error"));
                oView.setBusy(false);
            });
        },
        
        onManagePayments: function () {
            var oOrderDetailModel = this.getView().getModel("orderDetail");
            var oOrder = oOrderDetailModel.getData();
            
            // Use the same manage payments dialog from the OrderList controller
            this._openManagePaymentsDialog(oOrder);
        },
        
        _openManagePaymentsDialog: function(oOrder) {
            // Create the manage payments dialog if it doesn't exist
            if (!this._oManagePaymentsDialog) {
                var oView = this.getView();
                
                Fragment.load({
                    id: oView.getId(),
                    name: "tourishui.view.fragments.ManagePaymentsDialog",
                    controller: this
                }).then(function(oDialog) {
                    // Add dialog to view for lifecycle management
                    oView.addDependent(oDialog);
                    this._oManagePaymentsDialog = oDialog;
                    
                    // Prepare and open the dialog
                    this._prepareManagePaymentsDialog(oOrder);
                    this._oManagePaymentsDialog.open();
                }.bind(this));
            } else {
                // Prepare and open the dialog
                this._prepareManagePaymentsDialog(oOrder);
                this._oManagePaymentsDialog.open();
            }
        },
        
        _prepareManagePaymentsDialog: function(oOrder) {
            // Create a model for the dialog
            var oModel = new JSONModel({
                order: oOrder,
                payments: oOrder.Payments || [],
                newPayment: {
                    amount: "",
                    paymentMethod: "Cash",
                    paymentDate: new Date(),
                    recordTransaction: true
                },
                busy: false,
                currencyCode: "USD"
            });
            
            // Set the model to the dialog
            this._oManagePaymentsDialog.setModel(oModel, "payments");
        },
        
        // Add the same payment management methods from OrderList controller
        onAddPaymentFromDialog: function() {
            var oDialog = this._oManagePaymentsDialog;
            var oModel = oDialog.getModel("payments");
            var oNewPayment = oModel.getProperty("/newPayment");
            var sOrderId = oModel.getProperty("/order/ID");
            
            // Validate payment data
            if (!oNewPayment.amount || parseFloat(oNewPayment.amount) <= 0) {
                MessageBox.error("Please enter a valid payment amount");
                return;
            }
            
            if (!oNewPayment.paymentMethod) {
                MessageBox.error("Please select a payment method");
                return;
            }
            
            // Format the date if needed
            var oPaymentDate = oNewPayment.paymentDate;
            if (oPaymentDate instanceof Date) {
                oPaymentDate = this.formatter.formatDateForBackend(oPaymentDate);
            }
            
            // Set dialog to busy state
            oModel.setProperty("/busy", true);
            
            // Call the addPayment action
            var oOrderService = this.getOwnerComponent().getModel("orderService");
            var oContext = oOrderService.bindContext("/addPayment(...)");
            
            // Set parameters
            oContext.setParameter("orderID", sOrderId);
            oContext.setParameter("paymentDate", oPaymentDate);
            oContext.setParameter("amount", parseFloat(oNewPayment.amount));
            oContext.setParameter("paymentMethod", oNewPayment.paymentMethod);
            oContext.setParameter("recordTransaction", oNewPayment.recordTransaction);
            
            // Execute the action
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.paymentID) {
                    // Payment added successfully
                    MessageToast.show("Payment added successfully");
                    
                    // Reset new payment form
                    oModel.setProperty("/newPayment", {
                        amount: "",
                        paymentMethod: "Cash",
                        paymentDate: new Date(),
                        recordTransaction: true
                    });
                    
                    // Reload order data
                    this._loadOrderData(sOrderId);
                    
                    // Update payments in dialog
                    this._loadOrderPayments(sOrderId);
                } else {
                    // Payment failed
                    MessageBox.error(oResult.message || "Failed to add payment");
                }
                
                oModel.setProperty("/busy", false);
            }.bind(this)).catch(function(oError) {
                console.error("Error adding payment:", oError);
                MessageBox.error("Error adding payment: " + (oError.message || "Unknown error"));
                oModel.setProperty("/busy", false);
            });
        },
        
        _loadOrderPayments: function(sOrderId) {
            var oModel = this._oManagePaymentsDialog.getModel("payments");
            oModel.setProperty("/busy", true);
            
            // Get the order details to get payments
            var oOrderService = this.getOwnerComponent().getModel("orderService");
            var oContext = oOrderService.bindContext("/getOrderDetails(...)");
            
            oContext.setParameter("orderID", sOrderId);
            
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.payments) {
                    // Update the model with payments
                    oModel.setProperty("/payments", oResult.payments);
                    
                    // Also update order with latest data
                    oModel.setProperty("/order", oResult.order);
                } else {
                    // No payments found
                    oModel.setProperty("/payments", []);
                }
                
                oModel.setProperty("/busy", false);
            }).catch(function(oError) {
                console.error("Error loading payments:", oError);
                MessageToast.show("Error loading payments");
                oModel.setProperty("/busy", false);
            });
        },
        
        onClosePaymentsDialog: function() {
            this._oManagePaymentsDialog.close();
        }
    });
});