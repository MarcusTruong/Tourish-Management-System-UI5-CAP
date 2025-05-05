sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library"
], function (Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast, Spreadsheet, exportLibrary) {
    "use strict";

    var EdmType = exportLibrary.EdmType;

    return Controller.extend("tourishui.controller.supplier.SupplierDetail", {
        onInit: function () {
            // Initialize the model with sample data
            var oModel = new JSONModel({
                Suppliers: [
                    {
                        supplierID: "SUP001",
                        supplierName: "Tech Solutions Inc.",
                        address: "123 Main St, New York, NY 10001",
                        phone: "+1 (555) 123-4567",
                        email: "contact@techsolutions.com"
                    },
                    {
                        supplierID: "SUP002",
                        supplierName: "Global Parts Co.",
                        address: "456 Park Ave, Chicago, IL 60601",
                        phone: "+1 (555) 987-6543",
                        email: "info@globalparts.com"
                    },
                    {
                        supplierID: "SUP003",
                        supplierName: "Premium Components Ltd.",
                        address: "789 Market St, San Francisco, CA 94103",
                        phone: "+1 (555) 456-7890",
                        email: "sales@premiumcomponents.com"
                    },
                    {
                        supplierID: "SUP004",
                        supplierName: "Quality Supplies Unlimited",
                        address: "321 Oak Dr, Houston, TX 77001",
                        phone: "+1 (555) 789-0123",
                        email: "support@qualitysupplies.com"
                    },
                    {
                        supplierID: "SUP005",
                        supplierName: "Innovative Materials Inc.",
                        address: "654 Pine St, Seattle, WA 98101",
                        phone: "+1 (555) 234-5678",
                        email: "info@innovativematerials.com"
                    }
                ]
            });
            this.getView().setModel(oModel);

            // Store the original data for filter reset
            this._originalData = oModel.getData().Suppliers.slice();
        },

        onSearch: function (oEvent) {
            // Build filter array
            var aFilter = [];
            var sQuery = this.getView().byId("supplierSearchField").getValue();
            var sSupplierID = this.getView().byId("supplierIDFilter").getValue();
            var sSupplierName = this.getView().byId("supplierNameFilter").getValue();
            var sAddress = this.getView().byId("addressFilter").getValue();

            if (sQuery) {
                // General search - look in multiple fields
                aFilter.push(new Filter({
                    filters: [
                        new Filter("supplierID", FilterOperator.Contains, sQuery),
                        new Filter("supplierName", FilterOperator.Contains, sQuery),
                        new Filter("address", FilterOperator.Contains, sQuery),
                        new Filter("phone", FilterOperator.Contains, sQuery),
                        new Filter("email", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }

            // Specific field filters
            if (sSupplierID) {
                aFilter.push(new Filter("supplierID", FilterOperator.Contains, sSupplierID));
            }
            if (sSupplierName) {
                aFilter.push(new Filter("supplierName", FilterOperator.Contains, sSupplierName));
            }
            if (sAddress) {
                aFilter.push(new Filter("address", FilterOperator.Contains, sAddress));
            }

            // Apply filters to the table binding
            var oTable = this.getView().byId("suppliersTable");
            var oBinding = oTable.getBinding("items");
            
            if (aFilter.length > 0) {
                oBinding.filter(new Filter({
                    filters: aFilter,
                    and: true
                }));
            } else {
                oBinding.filter([]);
            }

            // Update counter
            var sText = "Suppliers: " + oBinding.getLength();
            this.getView().byId("tableCountText").setText(sText);
        },

        onClearFilters: function () {
            // Clear all search fields
            this.getView().byId("supplierSearchField").setValue("");
            this.getView().byId("supplierIDFilter").setValue("");
            this.getView().byId("supplierNameFilter").setValue("");
            this.getView().byId("addressFilter").setValue("");

            // Reset filters
            var oTable = this.getView().byId("suppliersTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter([]);

            // Restore original data count
            var sText = "Suppliers: " + this._originalData.length;
            this.getView().byId("tableCountText").setText(sText);
        },

        onSupplierPress: function (oEvent) {
            var oSupplier = oEvent.getSource().getBindingContext().getObject();
            
            // Điều hướng đến trang chi tiết supplier
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("supplierDetail", {
                supplierID: oSupplier.supplierID
            });
        },

        onAddSupplier: function () {
            MessageBox.information("Add new supplier functionality would be implemented here.");
        },

        onEditSupplier: function (oEvent) {
            var oSupplier = oEvent.getSource().getBindingContext().getObject();
            MessageBox.information("Edit supplier: " + oSupplier.supplierName);
        },

        onDeleteSupplier: function (oEvent) {
            var oSupplier = oEvent.getSource().getBindingContext().getObject();
            
            MessageBox.confirm("Are you sure you want to delete supplier '" + oSupplier.supplierName + "'?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        MessageToast.show("Supplier deleted: " + oSupplier.supplierName);
                        // Actual deletion logic would go here
                    }
                }
            });
        },

        onDeleteSelected: function () {
            var oTable = this.getView().byId("suppliersTable");
            var aSelectedItems = oTable.getSelectedItems();
            
            if (aSelectedItems.length === 0) {
                MessageToast.show("No suppliers selected");
                return;
            }
            
            var sMessage = "Are you sure you want to delete " + aSelectedItems.length + " selected supplier(s)?";
            MessageBox.confirm(sMessage, {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        MessageToast.show(aSelectedItems.length + " supplier(s) deleted");
                        // Actual deletion logic would go here
                    }
                }
            });
        },

        onExport: function () {
            var oTable = this.getView().byId("suppliersTable");
            var oRowBinding = oTable.getBinding("items");
            var oModel = oRowBinding.getModel();
            var oModelData = oModel.getData();
            
            var aColumns = [
                {
                    label: "Supplier ID",
                    property: "supplierID",
                    type: EdmType.String
                },
                {
                    label: "Supplier Name",
                    property: "supplierName",
                    type: EdmType.String
                },
                {
                    label: "Address",
                    property: "address",
                    type: EdmType.String
                },
                {
                    label: "Phone",
                    property: "phone",
                    type: EdmType.String
                },
                {
                    label: "Email",
                    property: "email",
                    type: EdmType.String
                }
            ];
            
            var mSettings = {
                workbook: {
                    columns: aColumns,
                    hierarchyLevel: "Level"
                },
                dataSource: oModelData.Suppliers,
                fileName: "Suppliers.xlsx"
            };
            
            var oSpreadsheet = new Spreadsheet(mSettings);
            oSpreadsheet.build().finally(function() {
                oSpreadsheet.destroy();
            });
            
            MessageToast.show("Exporting data...");
        },

        onTableSettings: function () {
            MessageToast.show("Table settings dialog would be implemented here.");
        }
    });
});