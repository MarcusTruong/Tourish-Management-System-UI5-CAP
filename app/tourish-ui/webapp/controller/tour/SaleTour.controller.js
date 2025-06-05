sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library"
], function (Controller, JSONModel, Fragment, MessageBox, MessageToast, Spreadsheet, exportLibrary) {
    "use strict";

    var EdmType = exportLibrary.EdmType;

    return Controller.extend("tourishui.controller.tour.SaleTour", {
        onInit: function () {
            // Initialize active tours model
            var oActiveToursModel = new JSONModel({
                items: [],
                pagination: {
                    total: 0,
                    skip: 0,
                    limit: 20
                },
                currency: "USD",
                busy: false
            });
            this.getView().setModel(oActiveToursModel, "activeTours");
            
            // Set up event handler for route matched
            this.getOwnerComponent().getRouter().getRoute("saleTour").attachPatternMatched(this._onRouteMatched, this);
            
            // Create a model for the responsible persons
            var oResponsiblePersonsModel = new JSONModel({
                Members: []
            });
            this.getView().setModel(oResponsiblePersonsModel);
            
            // Load responsible persons
            this._loadResponsiblePersons();
        },
        
        _onRouteMatched: function () {
            // Reload data when route is matched
            this._loadActiveTours();
        },
        
        _loadResponsiblePersons: function() {
            var oUserService = this.getOwnerComponent().getModel("userService");
            var that = this;
            
            var oMembersContext = oUserService.bindContext("/getWorkspaceMembers(...)");
            
            oMembersContext.execute().then(function() {
                var oResult = oMembersContext.getBoundContext().getObject();
                
                var aMembers = Array.isArray(oResult) ? oResult : (oResult.value || []);
                
                // Add an "All" option at the beginning
                aMembers.unshift({
                    ID: "",
                    FullName: "All Responsible Persons"
                });
                
                // Set the members to the model
                var oModel = that.getView().getModel();
                oModel.setProperty("/Members", aMembers);
                
                console.log("Responsible persons loaded:", aMembers.length);
            }).catch(function(oError) {
                console.error("Error loading responsible persons:", oError);
                MessageToast.show("Error loading responsible persons");
            });
        },
        
        _loadActiveTours: function () {
            var oActiveToursModel = this.getView().getModel("activeTours");
            var oTable = this.byId("activeToursTable");
            
            // Set busy states
            oActiveToursModel.setProperty("/busy", true);
            if (oTable) {
                oTable.setBusy(true);
            }
            
            // Get filter values
            var sSearchTerm = this.byId("tourSearchField")?.getValue() || "";
            var sStatus = this.byId("statusFilter2")?.getSelectedKey() || "";
            var sResponsiblePerson = this.byId("responsiblePersonFilter")?.getSelectedKey() || "";
            var sDepartureDateFrom = this.byId("departureDateFromFilter")?.getValue() || null;
            var sDepartureDateTo = this.byId("departureDateToFilter")?.getValue() || null;
            var sSaleDateFrom = this.byId("saleDateFromFilter")?.getValue() || null;
            var sSaleDateTo = this.byId("saleDateToFilter")?.getValue() || null;
            
            // Get pagination values
            var iSkip = oActiveToursModel.getProperty("/pagination/skip");
            var iLimit = oActiveToursModel.getProperty("/pagination/limit");
            
            // Get the OData model
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            // Ensure we have a model
            if (!oModel) {
                MessageToast.show("Tour service model not found");
                oActiveToursModel.setProperty("/busy", false);
                if (oTable) {
                    oTable.setBusy(false);
                }
                return;
            }
            
            try {
                // Create context for function import
                var oContext = oModel.bindContext("/listActiveTours(...)");
                
                // Set parameters for context
                oContext.setParameter("searchTerm", sSearchTerm);
                oContext.setParameter("status", sStatus);
                oContext.setParameter("fromDepartureDate", sDepartureDateFrom);
                oContext.setParameter("toDepartureDate", sDepartureDateTo);
                oContext.setParameter("fromSaleDate", sSaleDateFrom);
                oContext.setParameter("toSaleDate", sSaleDateTo);
                oContext.setParameter("responsiblePersonID", sResponsiblePerson);
                oContext.setParameter("skip", iSkip);
                oContext.setParameter("limit", iLimit);
                
                // Execute function import and handle results
                oContext.execute()
                    .then(function () {
                        try {
                            // Get result data
                            var oResult = oContext.getBoundContext().getObject();
                            
                            console.log("Result from backend:", oResult);
                            
                            // Update activeTours model
                            if (oResult) {
                                oActiveToursModel.setData(oResult);
                            } else {
                                // Handle empty result
                                oActiveToursModel.setProperty("/items", []);
                                oActiveToursModel.setProperty("/pagination/total", 0);
                            }
                        } catch (oError) {
                            console.error("Error processing data:", oError);
                            MessageToast.show("Error processing returned data");
                        } finally {
                            // Clear busy states
                            oActiveToursModel.setProperty("/busy", false);
                            if (oTable) {
                                oTable.setBusy(false);
                            }
                        }
                    })
                    .catch(function (oError) {
                        console.error("Error calling function import:", oError);
                        MessageToast.show(`Error loading active tours: ${oError.message || "Unknown"}`);
                        
                        // Clear busy states
                        oActiveToursModel.setProperty("/busy", false);
                        if (oTable) {
                            oTable.setBusy(false);
                        }
                    });
            } catch (oError) {
                console.error("Error creating context:", oError);
                MessageToast.show("Error preparing request");
                
                // Clear busy states
                oActiveToursModel.setProperty("/busy", false);
                if (oTable) {
                    oTable.setBusy(false);
                }
            }
        },
        
        onSearch: function (oEvent) {
            // Reset pagination and reload with search term
            var oActiveToursModel = this.getView().getModel("activeTours");
            oActiveToursModel.setProperty("/pagination/skip", 0);
            this._loadActiveTours();
        },
        
        onFilterChange: function (oEvent) {
            // Reset pagination and reload with new filters
            var oActiveToursModel = this.getView().getModel("activeTours");
            oActiveToursModel.setProperty("/pagination/skip", 0);
            this._loadActiveTours();
        },
        
        onClearFilters: function () {
            // Clear all filters
            this.byId("tourSearchField").setValue("");
            this.byId("statusFilter2").setSelectedKey("");
            this.byId("responsiblePersonFilter").setSelectedKey("");
            this.byId("departureDateFromFilter").setValue("");
            this.byId("departureDateToFilter").setValue("");
            this.byId("saleDateFromFilter").setValue("");
            this.byId("saleDateToFilter").setValue("");
            
            // Reset pagination and reload
            var oActiveToursModel = this.getView().getModel("activeTours");
            oActiveToursModel.setProperty("/pagination/skip", 0);
            this._loadActiveTours();
        },
        
        formatDate: function (sDate) {
            if (!sDate) {
                return "";
            }
            
            var oDate = new Date(sDate);
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "dd MMM yyyy"
            });
            
            return oDateFormat.format(oDate);
        },
        
        onTourPress: function (oEvent) {
            // Get the selected item context
            var oItem = oEvent.getSource();
            var oBindingContext = oItem.getBindingContext("activeTours");
            
            if (oBindingContext) {
                var sTourId = oBindingContext.getProperty("ID");
                
                // Navigate to tour details
                this.getOwnerComponent().getRouter().navTo("activeTourDetail", {
                    tourId: sTourId
                });
            }
        },
        
        onViewDetails: function(oEvent) {
            // Get the tour ID from the binding context
            var oSource = oEvent.getSource();
            var oBindingContext = oSource.getBindingContext("activeTours");
            
            if (oBindingContext) {
                var sTourId = oBindingContext.getProperty("ID");
                var sTourName = oBindingContext.getProperty("TourName");
                
                // Open details dialog
                this._openTourDetailsDialog(sTourId, sTourName);
            }
        },
        
        _openTourDetailsDialog: function(sTourId, sTourName) {
            var oView = this.getView();
            
            // Create dialog lazily
            if (!this._oTourDetailsDialog) {
                // Load fragment
                Fragment.load({
                    id: oView.getId(),
                    name: "tourishui.view.fragments.TourDetailsDialog",
                    controller: this
                }).then(function(oDialog) {
                    // Connect dialog to the root view of this component
                    oView.addDependent(oDialog);
                    this._oTourDetailsDialog = oDialog;
                    this._prepareTourDetailsDialog(sTourId, sTourName);
                    oDialog.open();
                }.bind(this));
            } else {
                this._prepareTourDetailsDialog(sTourId, sTourName);
                this._oTourDetailsDialog.open();
            }
        },
        
        _prepareTourDetailsDialog: function(sTourId, sTourName) {
            // Set the dialog title
            var oTitle = this._oTourDetailsDialog.getCustomHeader().getContent()[0];
            oTitle.setText("Tour Details - " + sTourName);
            
            // Load tour details
            this._loadTourDetails(sTourId);
        },
        
        _loadTourDetails: function(sTourId) {
            // Set dialog busy state
            if (this._oTourDetailsDialog) {
                this._oTourDetailsDialog.setBusy(true);
            }
            
            // Get the OData model
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            try {
                // Create context for function import
                var oContext = oModel.bindContext("/getActiveTourDetails(...)");
                
                // Set tour ID parameter
                oContext.setParameter("tourID", sTourId);
                
                // Execute function import
                oContext.execute().then(function() {
                    // Get result
                    var oDetails = oContext.getBoundContext().getObject();
                    
                    // Create model for the details dialog
                    var oDetailsModel = new JSONModel(oDetails);
                    
                    // Set model to dialog
                    this._oTourDetailsDialog.setModel(oDetailsModel, "details");
                    
                    // Clear busy state
                    if (this._oTourDetailsDialog) {
                        this._oTourDetailsDialog.setBusy(false);
                    }
                }.bind(this)).catch(function(oError) {
                    console.error("Error loading tour details:", oError);
                    
                    // Clear busy state
                    if (this._oTourDetailsDialog) {
                        this._oTourDetailsDialog.setBusy(false);
                    }
                    
                    // Show error message
                    var sErrorMessage = this._getErrorMessage(oError);
                    MessageBox.error("Error loading tour details: " + sErrorMessage);
                }.bind(this));
            } catch (oError) {
                console.error("Error creating context:", oError);
                
                // Clear busy state
                if (this._oTourDetailsDialog) {
                    this._oTourDetailsDialog.setBusy(false);
                }
                
                // Show error message
                MessageBox.error("Error preparing details request: " + oError.message);
            }
        },
        
        onCloseTourDetailsDialog: function() {
            if (this._oTourDetailsDialog) {
                this._oTourDetailsDialog.close();
            }
        },
        
        onCancelTour: function (oEvent) {
            // Get the tour ID from the binding context
            var oSource = oEvent.getSource();
            var oBindingContext = oSource.getBindingContext("activeTours");
            
            if (oBindingContext) {
                var sTourId = oBindingContext.getProperty("ID");
                var sTourName = oBindingContext.getProperty("TourName");
                
                // Show confirmation dialog
                MessageBox.confirm("Are you sure you want to cancel the tour '" + sTourName + "'? This action cannot be undone.", {
                    title: "Confirm Cancellation",
                    icon: MessageBox.Icon.WARNING,
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.NO,
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.YES) {
                            this._executeCancelTour(sTourId);
                        }
                    }.bind(this)
                });
            }
        },
        
        _executeCancelTour: function (sTourId) {
            // Set busy state
            var oView = this.getView();
            oView.setBusy(true);
            
            // Get reason for cancellation (could be implemented as a dialog, but simplified here)
            var sReason = "Canceled by user";
            
            // Get the OData model
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            try {
                // Prepare cancel action
                var oContext = oModel.bindContext("/cancelActiveTour(...)");
                oContext.setParameter("tourID", sTourId);
                oContext.setParameter("reason", sReason);
                
                // Execute cancellation
                oContext.execute()
                    .then(function () {
                        var oResult = oContext.getBoundContext().getObject();
                        // Clear busy state
                        oView.setBusy(false);
                        
                        if (oResult && oResult.success) {
                            // Show success message
                            MessageToast.show("Tour canceled successfully");
                            
                            // Refresh the tours table
                            this._loadActiveTours();
                        } else {
                            // Show error
                            MessageBox.error(oResult && oResult.message ? oResult.message : "Failed to cancel tour");
                        }
                    }.bind(this))
                    .catch(function (oError) {
                        // Clear busy state
                        oView.setBusy(false);
                        
                        // Handle error
                        var sErrorMessage = this._getErrorMessage(oError);
                        MessageBox.error("Error canceling tour: " + sErrorMessage);
                    }.bind(this));
            } catch (oError) {
                // Clear busy state
                oView.setBusy(false);
                
                // Handle preparation error
                MessageBox.error("Error preparing cancel request: " + oError.message);
            }
        },
        
        onTableSettings: function () {
            // Create and open table settings dialog if not exists
            if (!this._oTableSettingsDialog) {
                Fragment.load({
                    name: "tourishui.view.fragments.TableSettings",
                    controller: this
                }).then(function (oDialog) {
                    this._oTableSettingsDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    this._configureTableSettingsDialog();
                    oDialog.open();
                }.bind(this));
            } else {
                this._configureTableSettingsDialog();
                this._oTableSettingsDialog.open();
            }
        },
        
        _configureTableSettingsDialog: function () {
            // Get the table
            var oTable = this.byId("activeToursTable");
            
            // Get columns from table
            var aColumns = oTable.getColumns();
            var aItems = [];
            
            // Create model for column visibility
            var oModel = new JSONModel({
                items: []
            });
            
            // Create items for each column
            aColumns.forEach(function (oColumn) {
                var oColumnHeader = oColumn.getHeader();
                var sText = "";
                
                if (oColumnHeader instanceof sap.m.Text) {
                    sText = oColumnHeader.getText();
                } else if (oColumnHeader instanceof sap.m.Label) {
                    sText = oColumnHeader.getText();
                }
                
                aItems.push({
                    text: sText,
                    visible: oColumn.getVisible()
                });
            });
            
            oModel.setProperty("/items", aItems);
            
            // Set model to dialog
            this._oTableSettingsDialog.setModel(oModel);
            
            // Get list in dialog
            var oList = this._oTableSettingsDialog.getContent()[0].getContent()[0];
            
            // Select visible columns
            var aSelectedItems = [];
            aItems.forEach(function (oItem, iIndex) {
                if (oItem.visible) {
                    aSelectedItems.push(oList.getItems()[iIndex]);
                }
            });
            
            oList.setSelectedItems(aSelectedItems);
        },
        
        onTableSettingsConfirm: function (oEvent) {
            var oTable = this.byId("activeToursTable");
            var oDialog = this._oTableSettingsDialog;
            var oList = oDialog.getContent()[0].getContent()[0];
            var aSelectedItems = oList.getSelectedItems();
            
            // Update column visibility
            oTable.getColumns().forEach(function (oColumn, iIndex) {
                var bVisible = false;
                
                aSelectedItems.forEach(function (oSelectedItem) {
                    if (oSelectedItem.getBindingContext().getProperty("text") === oColumn.getHeader().getText()) {
                        bVisible = true;
                    }
                });
                
                oColumn.setVisible(bVisible);
            });
            
            // Close dialog
            oDialog.close();
        },
        
        onTableSettingsCancel: function () {
            // Close dialog
            this._oTableSettingsDialog.close();
        },
        
        onExport: function () {
            var oTable = this.byId("activeToursTable");
            var oBinding = oTable.getBinding("items");
            
            // Define columns for export
            var aColumns = [
                {
                    label: "Tour Name",
                    property: "TourName",
                    type: EdmType.String
                },
                {
                    label: "Template Name",
                    property: "TemplateName",
                    type: EdmType.String
                },
                {
                    label: "Departure Date",
                    property: "DepartureDate",
                    type: EdmType.Date
                },
                {
                    label: "Return Date",
                    property: "ReturnDate",
                    type: EdmType.Date
                },
                {
                    label: "Sale Start Date",
                    property: "SaleStartDate",
                    type: EdmType.Date
                },
                {
                    label: "Sale End Date",
                    property: "SaleEndDate",
                    type: EdmType.Date
                },
                {
                    label: "Current Bookings",
                    property: "CurrentBookings",
                    type: EdmType.Number
                },
                {
                    label: "Max Capacity",
                    property: "MaxCapacity",
                    type: EdmType.Number
                },
                {
                    label: "Responsible Person",
                    property: "ResponsiblePersonName",
                    type: EdmType.String
                },
                {
                    label: "Status",
                    property: "Status",
                    type: EdmType.String
                }
            ];
            
            // Create spreadsheet
            var oSettings = {
                workbook: {
                    columns: aColumns,
                    context: {
                        sheetName: "Active Tours"
                    }
                },
                dataSource: {
                    type: "json",
                    data: this.getView().getModel("activeTours").getProperty("/items")
                },
                fileName: "ActiveTours.xlsx"
            };
            
            // Create and build spreadsheet
            var oSheet = new Spreadsheet(oSettings);
            oSheet.build()
                .then(function() {
                    MessageToast.show("Export started");
                })
                .finally(function() {
                    oSheet.destroy();
                });
        },
        
        _getErrorMessage: function(oError) {
            if (oError.responseText) {
                try {
                    var oErrorResponse = JSON.parse(oError.responseText);
                    if (oErrorResponse.error && oErrorResponse.error.message) {
                        return oErrorResponse.error.message;
                    }
                } catch (e) {
                    // If parsing fails, return the raw response
                    return oError.responseText;
                }
            } else if (oError.message) {
                return oError.message;
            }
            return "Unknown error";
        },

        onCloseTour: function (oEvent) {
            var oSource = oEvent.getSource();
            var oBindingContext = oSource.getBindingContext("activeTours");
            
            if (oBindingContext) {
                var sTourId = oBindingContext.getProperty("ID");
                var sTourName = oBindingContext.getProperty("TourName");
                var sStatus = oBindingContext.getProperty("Status");
                
                // Check if tour can be closed
                if (sStatus !== 'Open') {
                    MessageBox.error("Only open tours can be closed for booking");
                    return;
                }
                
                // Show reason input dialog
                this._showStatusChangeDialog(
                    "Close Tour for Booking",
                    `Are you sure you want to close '${sTourName}' for booking? No new orders will be accepted.`,
                    "Reason for closing:",
                    function(sReason) {
                        this._executeCloseTour(sTourId, sReason);
                    }.bind(this)
                );
            }
        },
        
        /**
         * Reopens a closed tour for booking
         */
        onReopenTour: function (oEvent) {
            var oSource = oEvent.getSource();
            var oBindingContext = oSource.getBindingContext("activeTours");
            
            if (oBindingContext) {
                var sTourId = oBindingContext.getProperty("ID");
                var sTourName = oBindingContext.getProperty("TourName");
                var sStatus = oBindingContext.getProperty("Status");
                
                // Check if tour can be reopened
                if (sStatus !== 'Closed') {
                    MessageBox.error("Only closed tours can be reopened");
                    return;
                }
                
                // Show reason input dialog
                this._showStatusChangeDialog(
                    "Reopen Tour for Booking",
                    `Are you sure you want to reopen '${sTourName}' for booking?`,
                    "Reason for reopening:",
                    function(sReason) {
                        this._executeReopenTour(sTourId, sReason);
                    }.bind(this)
                );
            }
        },
        
        /**
         * Completes a tour
         */
        onCompleteTour: function (oEvent) {
            var oSource = oEvent.getSource();
            var oBindingContext = oSource.getBindingContext("activeTours");
            
            if (oBindingContext) {
                var sTourId = oBindingContext.getProperty("ID");
                var sTourName = oBindingContext.getProperty("TourName");
                var sStatus = oBindingContext.getProperty("Status");
                
                // Check if tour can be completed
                if (sStatus === 'Canceled' || sStatus === 'Completed') {
                    MessageBox.error(`Cannot complete a ${sStatus.toLowerCase()} tour`);
                    return;
                }
                
                // Show completion dialog
                this._showStatusChangeDialog(
                    "Complete Tour",
                    `Are you sure you want to mark '${sTourName}' as completed? This action cannot be undone.`,
                    "Completion notes (optional):",
                    function(sNotes) {
                        this._executeCompleteTour(sTourId, sNotes);
                    }.bind(this)
                );
            }
        },
        
        /**
         * Shows a generic status change dialog with reason input
         */
        _showStatusChangeDialog: function(sTitle, sMessage, sInputLabel, fnCallback) {
            var oDialog = new sap.m.Dialog({
                title: sTitle,
                type: "Message",
                content: [
                    new sap.m.Text({ text: sMessage }).addStyleClass("sapUiMediumMarginBottom"),
                    new sap.m.Label({ text: sInputLabel }).addStyleClass("sapUiSmallMarginTop"),
                    new sap.m.TextArea({
                        id: "statusChangeReasonInput",
                        width: "100%",
                        rows: 3,
                        placeholder: "Enter reason or notes..."
                    })
                ],
                beginButton: new sap.m.Button({
                    text: "Confirm",
                    type: "Emphasized",
                    press: function() {
                        var sReason = sap.ui.getCore().byId("statusChangeReasonInput").getValue();
                        oDialog.close();
                        fnCallback(sReason);
                    }
                }),
                endButton: new sap.m.Button({
                    text: "Cancel",
                    press: function() {
                        oDialog.close();
                    }
                }),
                afterClose: function() {
                    oDialog.destroy();
                }
            });
            
            oDialog.open();
        },
        
        /**
         * Executes close tour action
         */
        _executeCloseTour: function (sTourId, sReason) {
            var oView = this.getView();
            oView.setBusy(true);
            
            var oModel = this.getOwnerComponent().getModel("tourService");
            var oContext = oModel.bindContext("/closeActiveTour(...)");
            oContext.setParameter("tourID", sTourId);
            oContext.setParameter("reason", sReason);
            
            oContext.execute()
                .then(function () {
                    var oResult = oContext.getBoundContext().getObject();
                    oView.setBusy(false);
                    
                    if (oResult && oResult.success) {
                        MessageToast.show("Tour closed for booking successfully");
                        this._loadActiveTours();
                    } else {
                        MessageBox.error(oResult && oResult.message ? oResult.message : "Failed to close tour");
                    }
                }.bind(this))
                .catch(function (oError) {
                    oView.setBusy(false);
                    var sErrorMessage = this._getErrorMessage(oError);
                    MessageBox.error("Error closing tour: " + sErrorMessage);
                }.bind(this));
        },
        
        /**
         * Executes reopen tour action
         */
        _executeReopenTour: function (sTourId, sReason) {
            var oView = this.getView();
            oView.setBusy(true);
            
            var oModel = this.getOwnerComponent().getModel("tourService");
            var oContext = oModel.bindContext("/reopenActiveTour(...)");
            oContext.setParameter("tourID", sTourId);
            oContext.setParameter("reason", sReason);
            
            oContext.execute()
                .then(function () {
                    var oResult = oContext.getBoundContext().getObject();
                    oView.setBusy(false);
                    
                    if (oResult && oResult.success) {
                        MessageToast.show("Tour reopened for booking successfully");
                        this._loadActiveTours();
                    } else {
                        MessageBox.error(oResult && oResult.message ? oResult.message : "Failed to reopen tour");
                    }
                }.bind(this))
                .catch(function (oError) {
                    oView.setBusy(false);
                    var sErrorMessage = this._getErrorMessage(oError);
                    MessageBox.error("Error reopening tour: " + sErrorMessage);
                }.bind(this));
        },
        
        /**
         * Executes complete tour action
         */
        _executeCompleteTour: function (sTourId, sNotes) {
            var oView = this.getView();
            oView.setBusy(true);
            
            var oModel = this.getOwnerComponent().getModel("tourService");
            var oContext = oModel.bindContext("/completeActiveTour(...)");
            oContext.setParameter("tourID", sTourId);
            oContext.setParameter("completionNotes", sNotes);
            
            oContext.execute()
                .then(function () {
                    var oResult = oContext.getBoundContext().getObject();
                    oView.setBusy(false);
                    
                    if (oResult && oResult.success) {
                        MessageToast.show("Tour completed successfully");
                        this._loadActiveTours();
                    } else {
                        MessageBox.error(oResult && oResult.message ? oResult.message : "Failed to complete tour");
                    }
                }.bind(this))
                .catch(function (oError) {
                    oView.setBusy(false);
                    var sErrorMessage = this._getErrorMessage(oError);
                    MessageBox.error("Error completing tour: " + sErrorMessage);
                }.bind(this));
        },
        
        /**
         * Runs automated tour status updates
         */
        onRunAutomatedUpdates: function() {
            MessageBox.confirm("Run automated status updates? This will close tours past sale date and complete tours past return date.", {
                title: "Automated Updates",
                onClose: function(sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this._runAutomatedUpdates();
                    }
                }.bind(this)
            });
        },
        
        /**
         * Executes automated tour updates
         */
        _runAutomatedUpdates: function() {
            var oView = this.getView();
            oView.setBusy(true);
            
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            // Run auto-close first, then auto-complete
            var oCloseContext = oModel.bindContext("/autoCloseTours(...)");
            
            oCloseContext.execute()
                .then(function() {
                    var oCloseResult = oCloseContext.getBoundContext().getObject();
                    
                    // Run auto-complete
                    var oCompleteContext = oModel.bindContext("/autoCompleteTours(...)");
                    return oCompleteContext.execute().then(function() {
                        var oCompleteResult = oCompleteContext.getBoundContext().getObject();
                        
                        oView.setBusy(false);
                        
                        var sMessage = `Automated updates completed:\n`;
                        sMessage += `- Closed ${oCloseResult.closedCount || 0} tours\n`;
                        sMessage += `- Completed ${oCompleteResult.completedCount || 0} tours`;
                        
                        MessageBox.information(sMessage);
                        this._loadActiveTours();
                    }.bind(this));
                }.bind(this))
                .catch(function(oError) {
                    oView.setBusy(false);
                    var sErrorMessage = this._getErrorMessage(oError);
                    MessageBox.error("Error running automated updates: " + sErrorMessage);
                }.bind(this));
        },
        
        /**
         * Shows tour status statistics
         */
        onShowStatusStatistics: function() {
            var oModel = this.getOwnerComponent().getModel("tourService");
            var oContext = oModel.bindContext("/getTourStatusStatistics(...)");
            
            oContext.execute()
                .then(function() {
                    var oStats = oContext.getBoundContext().getObject();
                    
                    var sMessage = `Tour Status Summary:\n\n`;
                    sMessage += `Open: ${oStats.open || 0}\n`;
                    sMessage += `Closed: ${oStats.closed || 0}\n`;
                    sMessage += `Completed: ${oStats.completed || 0}\n`;
                    sMessage += `Canceled: ${oStats.canceled || 0}\n`;
                    sMessage += `Total: ${oStats.total || 0}\n\n`;
                    
                    if (oStats.needsAttention) {
                        sMessage += `Needs Attention:\n`;
                        sMessage += `- Tours to close: ${oStats.needsAttention.toClose || 0}\n`;
                        sMessage += `- Tours to complete: ${oStats.needsAttention.toComplete || 0}`;
                    }
                    
                    MessageBox.information(sMessage, {
                        title: "Tour Status Statistics",
                        styleClass: "sapUiSizeCompact"
                    });
                })
                .catch(function(oError) {
                    var sErrorMessage = this._getErrorMessage(oError);
                    MessageBox.error("Error loading statistics: " + sErrorMessage);
                }.bind(this));
        }
    });
});