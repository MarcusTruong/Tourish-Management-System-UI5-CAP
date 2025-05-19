sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, Filter, FilterOperator, Spreadsheet, exportLibrary, MessageBox, MessageToast, Fragment) {
    "use strict";

    var EdmType = exportLibrary.EdmType;

    return Controller.extend("tourishui.controller.customer.CustomerManagement", {
        onInit: function () {
            // Create models
            var oViewModel = new JSONModel({
                busy: false,
                currencyCode: "USD",
                customers: [],
                pagination: {
                    skip: 0,
                    limit: 20,
                    total: 0
                }
            });
            this.getView().setModel(oViewModel);

            // Create statistics model
            var oStatsModel = new JSONModel({
                totalIndividualCustomers: 0,
                totalBusinessCustomers: 0,
                top10ByTransaction: [],
                customersByMonth: [],
                recentTransactions: []
            });
            this.getView().setModel(oStatsModel, "customerStats");

            // Load initial data
            this._loadCustomerStatistics();
            this._loadCustomers();
        },

        // LOADING DATA
        
        _loadCustomerStatistics: function() {
            var oView = this.getView();
            var oStatsModel = oView.getModel("customerStats");
            
            oView.setBusy(true);
            
            // Call the service to get customer statistics
            var oService = this.getOwnerComponent().getModel("customerService");
            
            var oContext = oService.bindContext("/getCustomerStatistics(...)");
            
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult) {
                    oStatsModel.setData(oResult);
                } else {
                    // Set default values if no result
                    oStatsModel.setData({
                        totalIndividualCustomers: 0,
                        totalBusinessCustomers: 0,
                        top10ByTransaction: [],
                        customersByMonth: [],
                        recentTransactions: []
                    });
                }
                
                oView.setBusy(false);
            }).catch(function(oError) {
                console.error("Error loading customer statistics:", oError);
                MessageToast.show("Error loading customer statistics");
                oView.setBusy(false);
            });
        },
        
        _loadCustomers: function() {
            var oView = this.getView();
            var oViewModel = oView.getModel();
            var sSearchTerm = this.byId("customerSearchField").getValue();
            var sCustomerType = this.byId("customerTypeSelect").getSelectedKey();
            var iPagination = oViewModel.getProperty("/pagination");
            
            oView.setBusy(true);
            
            // Call the service to search all customers
            var oService = this.getOwnerComponent().getModel("customerService");
            
            var oContext = oService.bindContext("/searchAllCustomers(...)");
            
            // Set parameters
            oContext.setParameter("searchTerm", sSearchTerm || "");
            oContext.setParameter("customerType", sCustomerType || "All");
            oContext.setParameter("skip", iPagination.skip || 0);
            oContext.setParameter("limit", iPagination.limit || 20);
            
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult) {
                    // Combine individual and business customers
                    var aCustomers = [];
                    
                    // Add individual customers if any
                    if (oResult.individualCustomers && oResult.individualCustomers.length > 0) {
                        aCustomers = aCustomers.concat(oResult.individualCustomers);
                    }
                    
                    // Add business customers if any
                    if (oResult.businessCustomers && oResult.businessCustomers.length > 0) {
                        aCustomers = aCustomers.concat(oResult.businessCustomers);
                    }
                    // Update model
                    oViewModel.setProperty("/customers", aCustomers);
                    oViewModel.setProperty("/pagination/total", 
                        (oResult.pagination.totalIndividual || 0) + 
                        (oResult.pagination.totalBusiness || 0));
                } else {
                    // Set empty array if no result
                    oViewModel.setProperty("/customers", []);
                    oViewModel.setProperty("/pagination/total", 0);
                }
                
                oView.setBusy(false);
            }).catch(function(oError) {
                console.error("Error loading customers:", oError);
                MessageToast.show("Error loading customers");
                oView.setBusy(false);
            });
        },

        // EVENT HANDLERS
        
        onSearch: function() {
            // Reset pagination
            this.getView().getModel().setProperty("/pagination/skip", 0);
            
            // Reload customers
            this._loadCustomers();
        },
        
        onTypeFilterChange: function() {
            // Reset pagination
            this.getView().getModel().setProperty("/pagination/skip", 0);
            
            // Reload customers
            this._loadCustomers();
        },
        
        onClearFilters: function() {
            // Clear search field
            this.byId("customerSearchField").setValue("");
            
            // Reset customer type filter
            this.byId("customerTypeSelect").setSelectedKey("All");
            
            // Reset pagination
            this.getView().getModel().setProperty("/pagination/skip", 0);
            
            // Reload customers
            this._loadCustomers();
        },
        
        onAddCustomer: function() {
            if (!this._oAddCustomerDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "tourishui.view.fragments.CustomerDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    this._oAddCustomerDialog = oDialog;
                    
                    // Create a model for the dialog
                    var oDialogModel = new JSONModel({
                        title: "Add New Customer",
                        customerType: "Individual",
                        isEdit: false,
                        customerId: "",
                        customer: {
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
                        }
                    });
                    
                    this._oAddCustomerDialog.setModel(oDialogModel, "dialog");
                    this._oAddCustomerDialog.open();
                }.bind(this));
            } else {
                // Reset the dialog model
                var oDialogModel = this._oAddCustomerDialog.getModel("dialog");
                oDialogModel.setData({
                    title: "Add New Customer",
                    customerType: "Individual",
                    customerId:"",
                    isEdit: false,
                    customer: {
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
                    }
                });
                
                this._oAddCustomerDialog.open();
            }

        },
        
        onCustomerTypeInfoPress: function(oEvent) {
            MessageToast.show("Customer type cannot be changed in edit mode");
        },
        
        onCustomerTypeChange: function(oEvent) {
            var sCustomerType = oEvent.getParameter("key");
            var oDialogModel = this._oAddCustomerDialog.getModel("dialog");
            
            oDialogModel.setProperty("/customerType", sCustomerType);
        },
        
        onSaveCustomer: function() {
            console.log("onsave");
            var oView = this.getView();
            var oDialogModel = this._oAddCustomerDialog.getModel("dialog");
            var oCustomer = oDialogModel.getProperty("/customer");
            var sCustomerType = oDialogModel.getProperty("/customerType");
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
            this._oAddCustomerDialog.setBusy(true);
            
            // Determine which API to call based on customer type
            var sAction = sCustomerType === "Individual" ? "/createCustomer" : "/createBusinessCustomer";
            var oContext = oService.bindContext(sAction + "(...)");
            
            if (sCustomerType === "Individual") {
                oContext.setParameter("fullName", oCustomer.fullName);
                oContext.setParameter("phone", oCustomer.phone || "");
                oContext.setParameter("email", oCustomer.email || "");
                oContext.setParameter("address", oCustomer.address || "");
                oContext.setParameter("birthday", oCustomer.birthday || null);
                oContext.setParameter("notes", oCustomer.notes || "");
            } else { // Business
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
                this._oAddCustomerDialog.setBusy(false);
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.customerID) {
                    MessageToast.show("Customer created successfully");
                    this._oAddCustomerDialog.close();
                    
                    // Reload customers and statistics
                    this._loadCustomerStatistics();
                    this._loadCustomers();
                } else {
                    MessageBox.error(oResult.message || "Error creating customer");
                }
            }.bind(this)).catch(function(oError) {
                this._oAddCustomerDialog.setBusy(false);
                MessageBox.error("Error creating customer: " + oError.message);
            }.bind(this));
        },
        
        onCancelCustomer: function() {
            console.log("close");
            this._oAddCustomerDialog.close();
        },
        
        onCustomerPress: function(oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var sCustomerId = oContext.getProperty("ID");
            var sCustomerType = oContext.getProperty("Type");
            
            // Navigate to customer detail page
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("customerDetail", {
                customerId: sCustomerId,
                customerType: sCustomerType
            });
        },
        
        onEditCustomer: function(oEvent) {
            var oItem = oEvent.getSource().getParent().getBindingContext();
            var oCustomer = oItem.getObject();
            
            if (!this._oAddCustomerDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "tourishui.view.fragments.CustomerDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    this._oAddCustomerDialog = oDialog;
                    this._prepareCustomerEditDialog(oCustomer);
                }.bind(this));
            } else {
                this._prepareCustomerEditDialog(oCustomer);
            }
        },
        
        _prepareCustomerEditDialog: function(oCustomer) {
            // Determine customer type
            var sCustomerType = oCustomer.Type;
            var oDialogModel = new JSONModel({
                title: "Edit Customer",
                customerType: sCustomerType,
                customerId: oCustomer.ID,
                isEdit: true,
                customer: {}
            });
            
            // Set customer data based on type
            if (sCustomerType === "Individual") {
                oDialogModel.setProperty("/customer", {
                    fullName: oCustomer.Name,
                    phone: oCustomer.Phone || "",
                    email: oCustomer.Email || "",
                    address: oCustomer.Address || "",
                    birthday: null, // Will be set after fetching details
                    notes: ""       // Will be set after fetching details
                });
                
                // Fetch complete customer details
                this._fetchIndividualCustomerDetails(oCustomer.ID, oDialogModel);
            } else {
                oDialogModel.setProperty("/customer", {
                    companyName: oCustomer.Name,
                    taxCode: "",    // Will be set after fetching details
                    contactPerson: oCustomer.ContactPerson || "",
                    position: "",   // Will be set after fetching details
                    phone: oCustomer.Phone || "",
                    email: oCustomer.Email || "",
                    address: oCustomer.Address || "",
                    notes: ""       // Will be set after fetching details
                });
                
                // Fetch complete business customer details
                this._fetchBusinessCustomerDetails(oCustomer.ID, oDialogModel);
            }
            
            this._oAddCustomerDialog.setModel(oDialogModel, "dialog");
            this._oAddCustomerDialog.open();
        },
        
        _fetchIndividualCustomerDetails: function(sCustomerId, oDialogModel) {
            var oService = this.getOwnerComponent().getModel("customerService");
            var oContext = oService.bindContext("/getCustomerDetails(...)");
            
            oContext.setParameter("customerID", sCustomerId);
            
            this._oAddCustomerDialog.setBusy(true);
            
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.customer) {
                    oDialogModel.setProperty("/customer/birthday", oResult.customer.BirthDay);
                    oDialogModel.setProperty("/customer/notes", oResult.customer.Notes || "");
                }
                
                this._oAddCustomerDialog.setBusy(false);
            }.bind(this)).catch(function(oError) {
                console.error("Error fetching customer details:", oError);
                this._oAddCustomerDialog.setBusy(false);
            }.bind(this));
        },
        
        _fetchBusinessCustomerDetails: function(sCustomerId, oDialogModel) {
            var oService = this.getOwnerComponent().getModel("customerService");
            var oContext = oService.bindContext("/getBusinessCustomerDetails(...)");
            
            oContext.setParameter("customerID", sCustomerId);
            
            this._oAddCustomerDialog.setBusy(true);
            
            oContext.execute().then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.customer) {
                    oDialogModel.setProperty("/customer/taxCode", oResult.customer.TaxCode || "");
                    oDialogModel.setProperty("/customer/position", oResult.customer.Position || "");
                    oDialogModel.setProperty("/customer/notes", oResult.customer.Notes || "");
                }
                
                this._oAddCustomerDialog.setBusy(false);
            }.bind(this)).catch(function(oError) {
                console.error("Error fetching business customer details:", oError);
                this._oAddCustomerDialog.setBusy(false);
            }.bind(this));
        },

        determineButtonAction: function() {
            if (this._oAddCustomerDialog.getModel("dialog").getProperty("/customerId")) {
                this.onUpdateCustomer();
            } else {
                this.onSaveCustomer();
            }
        },
        
        onUpdateCustomer: function() {
            console.log("onupdate")
            var oView = this.getView();
            var oDialogModel = this._oAddCustomerDialog.getModel("dialog");
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
            this._oAddCustomerDialog.setBusy(true);
            
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
                this._oAddCustomerDialog.setBusy(false);
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.success) {
                    MessageToast.show("Customer updated successfully");
                    this._oAddCustomerDialog.close();
                    
                    // Reload customers
                    this._loadCustomers();
                } else {
                    MessageBox.error(oResult.message || "Error updating customer");
                }
            }.bind(this)).catch(function(oError) {
                this._oAddCustomerDialog.setBusy(false);
                MessageBox.error("Error updating customer: " + oError.message);
            }.bind(this));
        },

        onDeleteCustomer: function(oEvent) {
            var oItem = oEvent.getSource().getParent().getBindingContext();
            var oCustomer = oItem.getObject();
            var sCustomerId = oCustomer.ID;
            var sCustomerType = oCustomer.Type;
            var sCustomerName = oCustomer.Name;
            
            MessageBox.confirm(
                "Are you sure you want to delete customer '" + sCustomerName + "'?", {
                    title: "Confirm Delete",
                    onClose: function(oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            this._deleteCustomer(sCustomerId, sCustomerType);
                        }
                    }.bind(this)
                }
            );
        },
        
        _deleteCustomer: function(sCustomerId, sCustomerType) {
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
                    
                    // Reload customers and statistics
                    this._loadCustomerStatistics();
                    this._loadCustomers();
                } else {
                    MessageBox.error(oResult.message || "Error deleting customer");
                }
            }.bind(this)).catch(function(oError) {
                oView.setBusy(false);
                MessageBox.error("Error deleting customer: " + oError.message);
            }.bind(this));
        },
        
        onDeleteSelected: function() {
            var oTable = this.byId("customersTable");
            var aSelectedItems = oTable.getSelectedItems();
            
            if (aSelectedItems.length === 0) {
                MessageToast.show("No customers selected");
                return;
            }
            
            MessageBox.confirm(
                "Are you sure you want to delete " + aSelectedItems.length + " selected customer(s)?", {
                    title: "Confirm Delete",
                    onClose: function(oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            this._deleteMultipleCustomers(aSelectedItems);
                        }
                    }.bind(this)
                }
            );
        },
        
        _deleteMultipleCustomers: function(aSelectedItems) {
            var oView = this.getView();
            var oService = this.getOwnerComponent().getModel("customerService");
            var iSuccessCount = 0;
            var iFailCount = 0;
            
            // Show busy indicator
            oView.setBusy(true);
            
            // Process each customer sequentially
            var deleteNextCustomer = function(index) {
                if (index >= aSelectedItems.length) {
                    // All customers processed
                    oView.setBusy(false);
                    
                    var sMessage = iSuccessCount + " customer(s) deleted successfully";
                    if (iFailCount > 0) {
                        sMessage += ", " + iFailCount + " failed";
                    }
                    
                    MessageToast.show(sMessage);
                    
                    // Reload customers and statistics
                    this._loadCustomerStatistics();
                    this._loadCustomers();
                    
                    // Clear selection
                    this.byId("customersTable").removeSelections();
                    
                    return;
                }
                
                var oItem = aSelectedItems[index];
                var oCustomer = oItem.getBindingContext().getObject();
                var sCustomerId = oCustomer.ID;
                var sCustomerType = oCustomer.Type;
                
                // Determine which API to call based on customer type
                var sAction = sCustomerType === "Individual" ? "/deleteCustomer" : "/deleteBusinessCustomer";
                var oContext = oService.bindContext(sAction + "(...)");
                
                oContext.setParameter("customerID", sCustomerId);
                
                oContext.execute().then(function() {
                    var oResult = oContext.getBoundContext().getObject();
                    
                    if (oResult && oResult.success) {
                        iSuccessCount++;
                    } else {
                        iFailCount++;
                        console.error("Error deleting customer:", oResult.message);
                    }
                    
                    // Process next customer
                    deleteNextCustomer(index + 1);
                }.bind(this)).catch(function(oError) {
                    iFailCount++;
                    console.error("Error deleting customer:", oError);
                    
                    // Process next customer
                    deleteNextCustomer(index + 1);
                }.bind(this));
            }.bind(this);
            
            // Start processing
            deleteNextCustomer(0);
        },
        
        onViewRecentTransactions: function() {
            if (!this._oTransactionsDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "tourishui.view.fragments.CustomerTransactionsDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    this._oTransactionsDialog = oDialog;
                    this._oTransactionsDialog.open();
                }.bind(this));
            } else {
                this._oTransactionsDialog.open();
            }
        },
        
        onCloseTransactionsDialog: function() {
            this._oTransactionsDialog.close();
        },
        
        onExport: function() {
            var oTable = this.byId("customersTable");
            var oBinding = oTable.getBinding("items");
            var oModel = this.getView().getModel();
            var aCustomers = oModel.getProperty("/customers");
            
            // Define columns for export
            var aColumns = [
                {
                    label: "Customer ID",
                    property: "ID",
                    type: EdmType.String
                },
                {
                    label: "Customer Name",
                    property: "Name",
                    type: EdmType.String
                },
                {
                    label: "Customer Type",
                    property: "Type",
                    type: EdmType.String
                },
                {
                    label: "Email",
                    property: "Email",
                    type: EdmType.String
                },
                {
                    label: "Phone",
                    property: "Phone",
                    type: EdmType.String
                },
                {
                    label: "Address",
                    property: "Address",
                    type: EdmType.String
                },
                {
                    label: "Total Transactions",
                    property: "TotalTransactions",
                    type: EdmType.Number
                }
            ];
            
            // Create spreadsheet
            var oSettings = {
                workbook: {
                    columns: aColumns,
                    context: {
                        sheetName: "Customers"
                    }
                },
                dataSource: aCustomers,
                fileName: "Customers.xlsx"
            };
            
            var oSpreadsheet = new Spreadsheet(oSettings);
            oSpreadsheet.build()
                .then(function() {
                    MessageToast.show("Export started");
                })
                .finally(function() {
                    oSpreadsheet.destroy();
                });
        },
        
        onTableSettings: function() {
            if (!this._oTableSettingsDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "tourishui.view.fragments.TableSettings",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    this._oTableSettingsDialog = oDialog;
                    
                    // Initialize dialog with current columns
                    this._configureTableSettingsDialog();
                    this._oTableSettingsDialog.open();
                }.bind(this));
            } else {
                // Update dialog with current columns
                this._configureTableSettingsDialog();
                this._oTableSettingsDialog.open();
            }
        },
        
        _configureTableSettingsDialog: function() {
            var oTable = this.byId("customersTable");
            var aColumns = oTable.getColumns();
            var aItems = [];
            
            // Create items array for columns
            for (var i = 0; i < aColumns.length; i++) {
                var oColumn = aColumns[i];
                var oColumnHeader = oColumn.getHeader();
                var sText = "";
                
                if (oColumnHeader instanceof sap.m.Text) {
                    sText = oColumnHeader.getText();
                }
                
                aItems.push({
                    text: sText,
                    selected: oColumn.getVisible()
                });
            }
            
            // Create model for dialog
            var oModel = new JSONModel({
                items: aItems
            });
            
            this._oTableSettingsDialog.setModel(oModel);
        },
        
        onTableSettingsConfirm: function() {
            var oTable = this.byId("customersTable");
            var aColumns = oTable.getColumns();
            var oDialog = this._oTableSettingsDialog;
            var oModel = oDialog.getModel();
            var aItems = oModel.getProperty("/items");
            
            // Update column visibility
            for (var i = 0; i < aColumns.length; i++) {
                aColumns[i].setVisible(aItems[i].selected);
            }
            
            oDialog.close();
        },
        
        onTableSettingsCancel: function() {
            this._oTableSettingsDialog.close();
        }
    });
});

        