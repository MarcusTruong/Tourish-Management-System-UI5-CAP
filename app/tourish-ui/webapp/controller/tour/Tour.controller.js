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

    return Controller.extend("tourishui.controller.tour.Tour", {
        onInit: function () {
            // Initialize templates model
            var oTemplatesModel = new JSONModel({
                items: [],
                pagination: {
                    total: 0,
                    skip: 0,
                    limit: 20
                },
                currency: "USD",
                busy: false
            });
            this.getView().setModel(oTemplatesModel, "templates");
            
            // Set up event handler for route matched
            this.getOwnerComponent().getRouter().getRoute("createSampleTour").attachPatternMatched(this._onRouteMatched, this);
            
            // Load initial data
            this._loadTemplates();
        },
        
        _onRouteMatched: function (oEvent) {
            // Reload data when route is matched
            this._loadTemplates();
        },
        
        _loadTemplates: function () {
            var oTemplatesModel = this.getView().getModel("templates");
            var oTable = this.byId("tourTemplatesTable");
            
            // Set busy states
            oTemplatesModel.setProperty("/busy", true);
            if (oTable) {
                oTable.setBusy(true);
            }
            
            // Get filter values
            var sSearchTerm = this.byId("searchField") ? this.byId("searchField").getValue() : "";
            var sTourType = this.byId("tourTypeFilter") ? this.byId("tourTypeFilter").getSelectedKey() : "";
            var sStatus = this.byId("statusFilter") ? this.byId("statusFilter").getSelectedKey() : "";
            
            // Get pagination values
            var iSkip = oTemplatesModel.getProperty("/pagination/skip");
            var iLimit = oTemplatesModel.getProperty("/pagination/limit");
            
            // Get the OData model
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            // Ensure we have a model
            if (!oModel) {
                MessageToast.show("No model available");
                oTemplatesModel.setProperty("/busy", false);
                if (oTable) {
                    oTable.setBusy(false);
                }
                return;
            }
            
            try {
                // Create a context for the function import
                var oContext = oModel.bindContext("/listTourTemplates(...)");
                
                // Execute the function import and handle the result
                oContext.execute()
                    .then(function () {
                        try {
                            // Get the result data
                            var oResult = oContext.getBoundContext().getObject();
                            
                            // Update the templates model
                            if (oResult) {
                                oTemplatesModel.setData(oResult);
                            } else {
                                // Handle empty result
                                oTemplatesModel.setProperty("/items", []);
                                oTemplatesModel.setProperty("/pagination/total", 0);
                            }
                        } catch (oError) {
                            // Handle data processing error
                            console.error("Error processing data:", oError);
                            MessageToast.show("Error processing data");
                        } finally {
                            // Clear busy states
                            oTemplatesModel.setProperty("/busy", false);
                            if (oTable) {
                                oTable.setBusy(false);
                            }
                        }
                    })
                    .catch(function (oError) {
                        // Handle execution error
                        console.error("Error executing request:", oError);
                        MessageToast.show("Error loading tour templates");
                        
                        // Clear busy states
                        oTemplatesModel.setProperty("/busy", false);
                        if (oTable) {
                            oTable.setBusy(false);
                        }
                    });
            } catch (oError) {
                // Handle binding error
                console.error("Error binding context:", oError);
                MessageToast.show("Error preparing request");
                
                // Clear busy states
                oTemplatesModel.setProperty("/busy", false);
                if (oTable) {
                    oTable.setBusy(false);
                }
            }
        },
        
        onSearch: function (oEvent) {
            // Reset pagination and reload with search term
            var oTemplatesModel = this.getView().getModel("templates");
            oTemplatesModel.setProperty("/pagination/skip", 0);
            this._loadTemplates();
        },
        
        onFilterChange: function (oEvent) {
            // Reset pagination and reload with new filters
            var oTemplatesModel = this.getView().getModel("templates");
            oTemplatesModel.setProperty("/pagination/skip", 0);
            this._loadTemplates();
        },
        
        onClearFilters: function () {
            // Clear all filters
            this.byId("searchField").setValue("");
            this.byId("tourTypeFilter").setSelectedKey("");
            this.byId("statusFilter").setSelectedKey("");
            
            // Reset pagination and reload
            var oTemplatesModel = this.getView().getModel("templates");
            oTemplatesModel.setProperty("/pagination/skip", 0);
            this._loadTemplates();
        },
        
        onCreateTemplate: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("templateCreate");
        },
        
        onPress: function (oEvent) {
            // Get the selected item context
            var oItem = oEvent.getSource();
            var oBindingContext = oItem.getBindingContext("templates");
            
            if (oBindingContext) {
                var sTemplateId = oBindingContext.getProperty("ID");
                
                // Navigate to template details
                MessageToast.show("Navigate to template details: " + sTemplateId);
                // this.getOwnerComponent().getRouter().navTo("templateDetail", {
                //     templateId: sTemplateId
                // });
            }
        },
        
        onEdit: function (oEvent) {
            // Prevent propagation to avoid triggering row selection
            // oEvent.stopPropagation();
            
            // Get the template ID from the binding context
            var oSource = oEvent.getSource();
            var oBindingContext = oSource.getBindingContext("templates");
            
            if (oBindingContext) {
                var sTemplateId = oBindingContext.getProperty("ID");
                
                // Navigate to template edit
                MessageToast.show("Navigate to template edit: " + sTemplateId);
                // this.getOwnerComponent().getRouter().navTo("templateEdit", {
                //     templateId: sTemplateId
                // });
            }
        },
        
        onCopy: function (oEvent) {
            // Prevent propagation to avoid triggering row selection
            // oEvent.stopPropagation();
            
            // Get the template ID from the binding context
            var oSource = oEvent.getSource();
            var oBindingContext = oSource.getBindingContext("templates");
            
            if (oBindingContext) {
                var sTemplateId = oBindingContext.getProperty("ID");
                var sTemplateName = oBindingContext.getProperty("TemplateName");
                
                // Show confirmation dialog
                MessageBox.confirm("Do you want to create a copy of template '" + sTemplateName + "'?", {
                    title: "Copy Template",
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            // Copy template functionality
                            MessageToast.show("Template copy functionality not implemented");
                        }
                    }
                });
            }
        },
        
        onCreateActiveTour: function (oEvent) {
            // Prevent propagation to avoid triggering row selection
            // oEvent.stopPropagation();
            
            // Get the template ID from the binding context
            var oSource = oEvent.getSource();
            var oBindingContext = oSource.getBindingContext("templates");
            
            if (oBindingContext) {
                var sTemplateId = oBindingContext.getProperty("ID");
                
                // Navigate to active tour creation with template id
                MessageToast.show("Navigate to active tour creation with template: " + sTemplateId);
                // this.getOwnerComponent().getRouter().navTo("activeTourCreate", {
                //     templateId: sTemplateId
                // });
            }
        },
        
        onImagePress: function (oEvent) {
            // Get the image source
            var oImage = oEvent.getSource();
            var sImageSrc = oImage.getSrc();
            
            // Create and open image dialog if not exists
            if (!this._oImageDialog) {
                this._oImageDialog = new sap.m.Dialog({
                    title: "Tour Image",
                    contentWidth: "600px",
                    contentHeight: "500px",
                    resizable: true,
                    draggable: true,
                    content: new sap.m.Image({
                        src: sImageSrc,
                        width: "100%",
                        height: "100%",
                        mode: "Image"
                    }),
                    beginButton: new sap.m.Button({
                        text: "Close",
                        press: function () {
                            this._oImageDialog.close();
                        }.bind(this)
                    })
                });
                
                this.getView().addDependent(this._oImageDialog);
            } else {
                // Update image source
                var oDialogImage = this._oImageDialog.getContent()[0];
                oDialogImage.setSrc(sImageSrc);
            }
            
            // Open the dialog
            this._oImageDialog.open();
        },
        
        onExport: function () {
            var oTable = this.byId("tourTemplatesTable");
            var oBinding = oTable.getBinding("items");
            
            // Define columns for export
            var aColumns = [
                {
                    label: "Template Name",
                    property: "TemplateName",
                    type: EdmType.String
                },
                {
                    label: "Tour Type",
                    property: "TourType",
                    type: EdmType.String
                },
                {
                    label: "Number of Days",
                    property: "NumberDays",
                    type: EdmType.Number
                },
                {
                    label: "Number of Nights",
                    property: "NumberNights",
                    type: EdmType.Number
                },
                {
                    label: "Adult Price",
                    property: "AdultPrice",
                    type: EdmType.Currency,
                    scale: 2,
                    unitProperty: "USD"
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
                        sheetName: "Tour Templates"
                    }
                },
                dataSource: {
                    type: "json",
                    data: this.getView().getModel("templates").getProperty("/items")
                },
                fileName: "TourTemplates.xlsx"
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
            var oTable = this.byId("tourTemplatesTable");
            
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
            var oTable = this.byId("tourTemplatesTable");
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
        }
    });
});