// File: tourishui/controller/order/OrderList.controller.js
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "../formatter"
], function (Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast, Fragment, Spreadsheet, exportLibrary, formatter) {
    "use strict";

    var EdmType = exportLibrary.EdmType;

    return Controller.extend("tourishui.controller.order.OrderList", {
        formatter: formatter,
        
        onInit: function () {
            // Initialize models
            var oViewModel = new JSONModel({
                busy: false,
                currencyCode: "USD",
                items: [],
                pagination: {
                    skip: 0,
                    limit: 20,
                    total: 0
                }
            });
            this.getView().setModel(oViewModel, "orders");

            // Register for route matched event
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("orderList").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            // Load order data when the route is matched
            this._loadOrders();
        },

        _loadOrders: function() {
            var oView = this.getView();
            var oViewModel = oView.getModel("orders");
            var sSearchTerm = this.byId("searchField2").getValue();
            var sStatus = this.byId("statusFilter3").getSelectedKey();
            var sFromDate = this.byId("fromDatePicker").getValue();
            var sToDate = this.byId("toDatePicker").getValue();
            var iPagination = oViewModel.getProperty("/pagination");
            
            // Set view to busy state
            oViewModel.setProperty("/busy", true);
            oView.setBusy(true);
            
            // Get the order service model
            var oOrderService = this.getOwnerComponent().getModel("orderService");
            
            // Prepare context to call the listOrders function
            var oContext = oOrderService.bindContext("/listOrders(...)");
            
            // Set parameters
            oContext.setParameter("searchTerm", sSearchTerm || "");
            oContext.setParameter("customerID", null);
            oContext.setParameter("tourID", null);
            oContext.setParameter("status", sStatus || null);
            oContext.setParameter("fromDate", sFromDate || null);
            oContext.setParameter("toDate", sToDate || null);
            oContext.setParameter("skip", iPagination.skip || 0);
            oContext.setParameter("limit", iPagination.limit || 20);
            
            // Execute the function
            oContext.execute().then(function() {
                // Get the result data
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult) {
                    // Update the orders model
                    oViewModel.setData(oResult);
                } else {
                    // Handle no result
                    oViewModel.setProperty("/items", []);
                    oViewModel.setProperty("/pagination/total", 0);
                }
                
                // Clear busy state
                oViewModel.setProperty("/busy", false);
                oView.setBusy(false);
            }).catch(function(oError) {
                // Log error and show message
                console.error("Error loading orders:", oError);
                MessageToast.show("Error loading orders");
                
                // Clear busy state
                oViewModel.setProperty("/busy", false);
                oView.setBusy(false);
            });
        },

        onSearch: function() {
            // Reset pagination
            var oViewModel = this.getView().getModel("orders");
            oViewModel.setProperty("/pagination/skip", 0);
            
            // Reload orders
            this._loadOrders();
        },
        
        onFilterChange: function() {
            // Reset pagination
            var oViewModel = this.getView().getModel("orders");
            oViewModel.setProperty("/pagination/skip", 0);
            
            // Reload orders
            this._loadOrders();
        },
        
        onClearFilters: function() {
            // Clear all filter inputs
            this.byId("searchField").setValue("");
            this.byId("statusFilter").setSelectedKey("");
            this.byId("fromDatePicker").setValue("");
            this.byId("toDatePicker").setValue("");
            
            // Reset pagination
            var oViewModel = this.getView().getModel("orders");
            oViewModel.setProperty("/pagination/skip", 0);
            
            // Reload orders
            this._loadOrders();
        },
        
        onCreateOrder: function() {
            // Navigate to the create order page
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("createOrder");
        },
        
        onOrderPress: function(oEvent) {
            // Get the selected item
            var oItem = oEvent.getSource();
            var sOrderId = oItem.getBindingContext("orders").getProperty("ID");
            
            // Navigate to the order details page
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("orderDetail", {
                orderId: sOrderId
            });
        },
        
        onEditOrder: function(oEvent) {
            // Get the order ID
            var oButton = oEvent.getSource();
            var sOrderId = oButton.getBindingContext("orders").getProperty("ID");
            
            console.log("Order Id for Edit:", sOrderId);

            var oOrderEditModel = new sap.ui.model.json.JSONModel({
                orderId: sOrderId
            });

            this.getOwnerComponent().setModel(oOrderEditModel, "orderEdit");

            // Navigate to the order edit page without parameter
            try {
                this.getOwnerComponent().getRouter().navTo("createOrder");
            } catch (oError) {
                console.error("Navigation error:", oError);
                MessageBox.error("Error navigating: " + oError.message);
            }
        },
        
        onManagePayments: function(oEvent) {
            // Get the order
            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext("orders");
            var oOrder = oContext.getObject();
            
            // Open the manage payments dialog
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
                payments: [],
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
            
            // Load the payments for this order
            this._loadOrderPayments(oOrder.ID);
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
        
        onAddPayment: function() {
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
                    
                    // Reload payments
                    this._loadOrderPayments(sOrderId);
                    
                    // Also reload the orders list to update the paid amounts and status
                    this._loadOrders();
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
        
        onDeletePayment: function(oEvent) {
            // Get the payment ID
            var oButton = oEvent.getSource();
            var sPaymentId = oButton.getBindingContext("payments").getProperty("ID");
            var sOrderId = this._oManagePaymentsDialog.getModel("payments").getProperty("/order/ID");
            
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
            var oModel = this._oManagePaymentsDialog.getModel("payments");
            oModel.setProperty("/busy", true);
            
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
                    
                    // Reload payments
                    this._loadOrderPayments(sOrderId);
                    
                    // Also reload the orders list to update the paid amounts and status
                    this._loadOrders();
                } else {
                    // Payment deletion failed
                    MessageBox.error(oResult.message || "Failed to delete payment");
                }
                
                oModel.setProperty("/busy", false);
            }.bind(this)).catch(function(oError) {
                console.error("Error deleting payment:", oError);
                MessageBox.error("Error deleting payment: " + (oError.message || "Unknown error"));
                oModel.setProperty("/busy", false);
            });
        },
        
        onClosePaymentsDialog: function() {
            this._oManagePaymentsDialog.close();
        },
        
        onProcessRefund: function() {
            console.log(1);
            var oDialog = this._oManagePaymentsDialog;
            var oModel = oDialog.getModel("payments");
            var oOrder = oModel.getProperty("/order");
            
            // Check if the order is overpaid
            if (oOrder.RemainingAmount >= 0) {
                MessageBox.information("There is no overpayment to refund.");
                return;
            }
            
            // Open the refund dialog
            this._openRefundDialog(oOrder);
        },
        
        _openRefundDialog: function(oOrder) {
            // Create the refund dialog if it doesn't exist
            if (!this._oRefundDialog) {
                var oView = this.getView();
                
                Fragment.load({
                    id: oView.getId(),
                    name: "tourishui.view.fragments.RefundDialog",
                    controller: this
                }).then(function(oDialog) {
                    // Add dialog to view for lifecycle management
                    oView.addDependent(oDialog);
                    this._oRefundDialog = oDialog;
                    
                    // Prepare and open the dialog
                    this._prepareRefundDialog(oOrder);
                    this._oRefundDialog.open();
                }.bind(this));
            } else {
                // Prepare and open the dialog
                this._prepareRefundDialog(oOrder);
                this._oRefundDialog.open();
            }
        },
        
        _prepareRefundDialog: function(oOrder) {
            // Calculate the overpaid amount (negative remaining amount)
            var fOverpaidAmount = Math.abs(oOrder.RemainingAmount);
            
            // Create a model for the dialog
            var oModel = new JSONModel({
                order: oOrder,
                refund: {
                    amount: fOverpaidAmount,
                    refundMethod: "Bank Transfer",
                    notes: ""
                },
                maxAmount: fOverpaidAmount,
                busy: false,
                currencyCode: "USD"
            });
            
            // Set the model to the dialog
            this._oRefundDialog.setModel(oModel, "refund");
        },
        
        onProcessRefundConfirm: function() {
            var oDialog = this._oRefundDialog;
            var oModel = oDialog.getModel("refund");
            var oRefund = oModel.getProperty("/refund");
            var oOrder = oModel.getProperty("/order");
            var fMaxAmount = oModel.getProperty("/maxAmount");
            
            // Validate refund data
            if (!oRefund.amount || parseFloat(oRefund.amount) <= 0) {
                MessageBox.error("Please enter a valid refund amount");
                return;
            }
            
            if (parseFloat(oRefund.amount) > fMaxAmount) {
                MessageBox.error("Refund amount cannot exceed overpaid amount");
                return;
            }
            
            if (!oRefund.refundMethod) {
                MessageBox.error("Please select a refund method");
                return;
            }
            
            // Set dialog to busy state
            oModel.setProperty("/busy", true);
            
            // Call the processRefund action
            var oOrderService = this.getOwnerComponent().getModel("orderService");
            var oContext = oOrderService.bindContext("/processRefund(...)");
            
            // Set parameters
            oContext.setParameter("orderID", oOrder.ID);
            oContext.setParameter("amount", parseFloat(oRefund.amount));
            oContext.setParameter("refundMethod", oRefund.refundMethod);
            oContext.setParameter("notes", oRefund.notes || "Refund for overpayment");
            
            // Execute the action
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.success) {
                    // Refund processed successfully
                    MessageToast.show("Refund processed successfully");
                    
                    // Close the refund dialog
                    this._oRefundDialog.close();
                    
                    // Reload payments
                    this._loadOrderPayments(oOrder.ID);
                    
                    // Also reload the orders list to update the paid amounts and status
                    this._loadOrders();
                } else {
                    // Refund failed
                    MessageBox.error(oResult.message || "Failed to process refund");
                }
                
                oModel.setProperty("/busy", false);
            }.bind(this)).catch(function(oError) {
                console.error("Error processing refund:", oError);
                MessageBox.error("Error processing refund: " + (oError.message || "Unknown error"));
                oModel.setProperty("/busy", false);
            });
        },
        
        onCancelRefund: function() {
            this._oRefundDialog.close();
        },
        
        onCancelOrder: function(oEvent) {
            // Get the order ID
            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext("orders");
            var sOrderId = oContext.getProperty("ID");
            var sOrderName = oContext.getProperty("TourName");
            
            // Confirm cancellation
            MessageBox.confirm("Are you sure you want to cancel this order for '" + sOrderName + "'?", {
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
                    
                    // Reload orders
                    this._loadOrders();
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
        
        onExport: function() {
            var oTable = this.byId("ordersTable2");
            var oBinding = oTable.getBinding("items");
            var oModel = this.getView().getModel("orders");
            var aOrders = oModel.getProperty("/items");
            
            // Define columns for export
            var aColumns = [
                {
                    label: "Order ID",
                    property: "ID",
                    type: EdmType.String
                },
                {
                    label: "Order Date",
                    property: "OrderDate",
                    type: EdmType.Date,
                    format: 'yyyy-MM-dd'
                },
                {
                    label: "Customer Name",
                    property: "CustomerName",
                    type: EdmType.String
                },
                {
                    label: "Customer Type",
                    property: "CustomerType",
                    type: EdmType.String
                },
                {
                    label: "Tour Name",
                    property: "TourName",
                    type: EdmType.String
                },
                {
                    label: "Departure Date",
                    property: "DepartureDate",
                    type: EdmType.Date,
                    format: 'yyyy-MM-dd'
                },
                {
                    label: "Return Date",
                    property: "ReturnDate", 
                    type: EdmType.Date,
                    format: 'yyyy-MM-dd'
                },
                {
                    label: "Total Amount",
                    property: "TotalAmount",
                    type: EdmType.Number
                },
                {
                    label: "Paid Amount",
                    property: "PaidAmount",
                    type: EdmType.Number
                },
                {
                    label: "Remaining Amount",
                    property: "RemainingAmount",
                    type: EdmType.Number
                },
                {
                    label: "Status",
                    property: "Status",
                    type: EdmType.String
                }
            ];
            
            // Create spreadsheet export settings
            var oSettings = {
                workbook: { 
                    columns: aColumns,
                    context: {
                        application: 'Tour Management System',
                        version: '1.0.0',
                        title: 'Orders',
                        sheetName: 'Orders',
                        modifiedBy: 'Tour Manager'
                    }
                },
                dataSource: aOrders,
                fileName: 'Orders.xlsx'
            };
            
            // Create and build spreadsheet
            var oSpreadsheet = new Spreadsheet(oSettings);
            oSpreadsheet.build()
                .then(function() {
                    MessageToast.show("Export started");
                })
                .finally(function() {
                    oSpreadsheet.destroy();
                });
        },
    });
});