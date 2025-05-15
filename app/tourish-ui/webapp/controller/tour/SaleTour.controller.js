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
            var sStatus = this.byId("statusFilter")?.getSelectedKey() || "";
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
                MessageToast.show("Navigate to tour details: " + sTourId);
                // this.getOwnerComponent().getRouter().navTo("activeTourDetail", {
                //     tourId: sTourId
                // });
            }
        },
        
        onEdit: function (oEvent) {
            // Get the tour ID from the binding context
            var oSource = oEvent.getSource();
            var oBindingContext = oSource.getBindingContext("activeTours");
            
            if (oBindingContext) {
                var sTourId = oBindingContext.getProperty("ID");
                
                // Debug log
                console.log("Tour ID for edit:", sTourId);
                
                // TODO: Implement edit functionality
                MessageToast.show("Edit tour: " + sTourId);
                
                // For example:
                // this.getOwnerComponent().getRouter().navTo("activeTourEdit", {
                //     tourId: sTourId
                // });
            }
        },
        
        onManagePassengers: function (oEvent) {
            // Get the tour ID from the binding context
            var oSource = oEvent.getSource();
            var oBindingContext = oSource.getBindingContext("activeTours");
            
            if (oBindingContext) {
                var sTourId = oBindingContext.getProperty("ID");
                var sTourName = oBindingContext.getProperty("TourName");
                
                // Open the passengers dialog
                this._openPassengersDialog(sTourId, sTourName);
            }
        },
        
        _openPassengersDialog: function(sTourId, sTourName) {
            var oView = this.getView();
            
            // Create dialog lazily
            if (!this._oPassengersDialog) {
                // Load fragment
                Fragment.load({
                    id: oView.getId(),
                    name: "tourishui.view.fragments.PassengersDialog",
                    controller: this
                }).then(function(oDialog) {
                    // Connect dialog to the root view of this component
                    oView.addDependent(oDialog);
                    this._oPassengersDialog = oDialog;
                    this._preparePassengersDialog(sTourId, sTourName);
                    oDialog.open();
                }.bind(this));
            } else {
                this._preparePassengersDialog(sTourId, sTourName);
                this._oPassengersDialog.open();
            }
        },
        
        _preparePassengersDialog: function(sTourId, sTourName) {
            // Store the current tour ID
            this._currentTourId = sTourId;
            
            // Set the dialog title
            var oTitle = this._oPassengersDialog.getCustomHeader().getContent()[0];
            oTitle.setText("Passengers - " + sTourName);
            
            // Load passengers data
            this._loadPassengers(sTourId);
        },
        
        _loadPassengers: function(sTourId) {
            // Set dialog busy state
            if (this._oPassengersDialog) {
                this._oPassengersDialog.setBusy(true);
            }
            
            // Get the OData model
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            try {
                // Create context for function import
                var oContext = oModel.bindContext("/getPassengerList(...)");
                
                // Set tour ID parameter
                oContext.setParameter("tourID", sTourId);
                
                // Execute function import
                oContext.execute().then(function() {
                    // Get result
                    var aPassengers = oContext.getBoundContext().getObject();
                    
                    // Create model for the passengers dialog
                    var oPassengersModel = new JSONModel({
                        passengers: Array.isArray(aPassengers) ? aPassengers : [],
                        tourID: sTourId
                    });
                    
                    // Set model to dialog
                    this._oPassengersDialog.setModel(oPassengersModel, "passengers");
                    
                    // Clear busy state
                    if (this._oPassengersDialog) {
                        this._oPassengersDialog.setBusy(false);
                    }
                }.bind(this)).catch(function(oError) {
                    console.error("Error loading passengers:", oError);
                    MessageToast.show("Error loading passengers");
                    
                    // Clear busy state
                    if (this._oPassengersDialog) {
                        this._oPassengersDialog.setBusy(false);
                    }
                }.bind(this));
            } catch (oError) {
                console.error("Error creating context:", oError);
                MessageToast.show("Error preparing passenger request");
                
                // Clear busy state
                if (this._oPassengersDialog) {
                    this._oPassengersDialog.setBusy(false);
                }
            }
        },
        
        onAddPassenger: function() {
            // TODO: Implement adding a new passenger
            MessageToast.show("Add passenger functionality to be implemented");
        },
        
        onEditPassenger: function(oEvent) {
            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext("passengers");
            
            if (oContext) {
                var oPassenger = oContext.getObject();
                // TODO: Implement editing a passenger
                MessageToast.show("Edit passenger: " + oPassenger.FullName);
            }
        },
        
        onRemovePassenger: function(oEvent) {
            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext("passengers");
            
            if (oContext) {
                var oPassenger = oContext.getObject();
                
                // Show confirmation dialog
                MessageBox.confirm("Are you sure you want to remove passenger '" + oPassenger.FullName + "'?", {
                    title: "Confirm Removal",
                    icon: MessageBox.Icon.WARNING,
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.NO,
                    onClose: function(sAction) {
                        if (sAction === MessageBox.Action.YES) {
                            this._executeRemovePassenger(oPassenger.ID);
                        }
                    }.bind(this)
                });
            }
        },
        
        _executeRemovePassenger: function(sPassengerId) {
            // Set dialog busy state
            if (this._oPassengersDialog) {
                this._oPassengersDialog.setBusy(true);
            }
            
            // Get the OData model
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            try {
                // Create context for function import
                var oContext = oModel.bindContext("/removePassenger(...)");
                
                // Set passenger ID parameter
                oContext.setParameter("passengerID", sPassengerId);
                
                // Execute function import
                oContext.execute().then(function() {
                    // Get result
                    var oResult = oContext.getBoundContext().getObject();
                    
                    // Clear busy state
                    if (this._oPassengersDialog) {
                        this._oPassengersDialog.setBusy(false);
                    }
                    
                    if (oResult && oResult.success) {
                        // Show success message
                        MessageToast.show("Passenger removed successfully");
                        
                        // Reload passengers
                        this._loadPassengers(this._currentTourId);
                        
                        // Refresh active tours to update booking count
                        this._loadActiveTours();
                    } else {
                        // Show error message
                        MessageBox.error(oResult && oResult.message ? oResult.message : "Failed to remove passenger");
                    }
                }.bind(this)).catch(function(oError) {
                    console.error("Error removing passenger:", oError);
                    
                    // Clear busy state
                    if (this._oPassengersDialog) {
                        this._oPassengersDialog.setBusy(false);
                    }
                    
                    // Show error message
                    var sErrorMessage = this._getErrorMessage(oError);
                    MessageBox.error("Error removing passenger: " + sErrorMessage);
                }.bind(this));
            } catch (oError) {
                console.error("Error creating context:", oError);
                
                // Clear busy state
                if (this._oPassengersDialog) {
                    this._oPassengersDialog.setBusy(false);
                }
                
                // Show error message
                MessageBox.error("Error preparing removal request: " + oError.message);
            }
        },
        
        onClosePassengersDialog: function() {
            if (this._oPassengersDialog) {
                this._oPassengersDialog.close();
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
        }
    });
});