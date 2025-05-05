sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library"
], function (Controller, History, JSONModel, MessageBox, MessageToast, Spreadsheet, exportLibrary) {
    "use strict";

    var EdmType = exportLibrary.EdmType;

    return Controller.extend("tourishui.controller.supplier.SupplierDetail", {
        onInit: function () {
            console.log('1')
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("supplierDetail").attachPatternMatched(this._onSupplierMatched, this);
            console.log('11')
        },

        _onSupplierMatched: function (oEvent) {
            var sSupplierID = oEvent.getParameter("arguments").supplierID;
            console.log(sSupplierID)
            // In a real app, you would fetch this data from a backend service
            var oModel = this.getView().getModel();

            // Check if model exists
            if (!oModel) {
                console.error("Model not found");
                return;
            }

            var aSuppliers = oModel.getProperty("/Suppliers");

            // Check if suppliers data exists
            if (!aSuppliers || !Array.isArray(aSuppliers)) {
                console.error("Suppliers data not available");
                return;
            }

            // Find the selected supplier
            var oSelectedSupplier = aSuppliers.find(function (supplier) {
                // Make sure we're comparing the same data types
                return supplier.supplierID === sSupplierID;
            });

            if (!oSelectedSupplier) {
                // Handle supplier not found
                sap.m.MessageBox.error("Supplier not found");
                this.onNavBack();
                return;
            }

            // Enhance supplier with additional mock data for the detail page
            if (!oSelectedSupplier.status) {
                // Enrich the supplier data with additional fields if they don't exist yet
                oSelectedSupplier = this._enrichSupplierData(oSelectedSupplier);

                // Update the model
                var iIndex = aSuppliers.findIndex(function (supplier) {
                    return supplier.supplierID === sSupplierID;
                });

                if (iIndex >= 0) {
                    oModel.setProperty("/Suppliers/" + iIndex, oSelectedSupplier);
                }
            }

            // Set the context for the view
            var oContext = new sap.ui.model.Context(oModel, "/Suppliers/" + aSuppliers.indexOf(oSelectedSupplier));
            this.getView().setBindingContext(oContext);
        },

        _enrichSupplierData: function (oSupplier) {
            // Add additional mock data for the detail page
            oSupplier.status = "Active";
            oSupplier.statusState = "Success"; // Success, Warning, Error, None
            oSupplier.foundedYear = "1995";
            oSupplier.website = "http://www." + oSupplier.supplierName.toLowerCase().replace(/\s+/g, '') + ".com";
            oSupplier.taxID = "TAX" + oSupplier.supplierID.substring(3);
            oSupplier.companySize = "Medium Enterprise (100-500 employees)";
            oSupplier.industry = "Technology";

            oSupplier.contactPerson = {
                name: "John Smith",
                position: "Account Manager",
                phone: "+1 (555) 987-6543",
                email: "john.smith@" + oSupplier.supplierName.toLowerCase().replace(/\s+/g, '') + ".com"
            };

            // Add mock services
            oSupplier.services = [
                {
                    serviceName: "Basic Tour Package",
                    serviceType: "Standard",
                    guests: 25,
                    price: 1299.99,
                    description: "Standard tour package including transportation and guide."
                },
                {
                    serviceName: "Premium Tour Package",
                    serviceType: "Premium",
                    guests: 15,
                    price: 2499.99,
                    description: "Premium tour with luxury transportation, guide, and exclusive locations."
                },
                {
                    serviceName: "Custom Group Tour",
                    serviceType: "Custom",
                    guests: 50,
                    price: 3999.99,
                    description: "Customized tour for large groups with special requirements."
                },
                {
                    serviceName: "VIP Experience",
                    serviceType: "VIP",
                    guests: 6,
                    price: 5999.99,
                    description: "Exclusive VIP experience with private transportation and personal guide."
                }
            ];

            // Add interaction history
            oSupplier.interactions = [
                {
                    date: "2025-03-10T14:00:00",
                    title: "Contract Signed",
                    text: "Annual contract signed for tour services provision.",
                    icon: "sap-icon://document-text"
                },
                {
                    date: "2025-02-15T10:30:00",
                    title: "Service Review",
                    text: "Quarterly service review meeting with supplier representatives.",
                    icon: "sap-icon://meeting-room"
                },
                {
                    date: "2025-01-05T09:00:00",
                    title: "New Service Added",
                    text: "VIP Experience added to service catalog.",
                    icon: "sap-icon://add"
                },
                {
                    date: "2024-12-18T11:15:00",
                    title: "Price Negotiation",
                    text: "Successfully negotiated 5% discount on all services for 2025.",
                    icon: "sap-icon://money-bills"
                }
            ];

            return oSupplier;
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("listReport", {}, true);
            }
        },

        onEditSupplier: function () {
            var oSupplier = this.getView().getBindingContext().getObject();
            MessageBox.information("Edit supplier: " + oSupplier.supplierName);
            // In a real application, this would open an edit dialog or navigate to an edit page
        },

        onDeleteSupplier: function () {
            var oSupplier = this.getView().getBindingContext().getObject();

            MessageBox.confirm("Are you sure you want to delete supplier '" + oSupplier.supplierName + "'?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        MessageToast.show("Supplier deleted: " + oSupplier.supplierName);
                        this.onNavBack();
                        // In a real application, you would delete the supplier from your backend
                    }
                }.bind(this)
            });
        },

        onActionPress: function () {
            MessageToast.show("Additional actions would be shown here");
        },

        onAddService: function () {
            MessageBox.information("Add new service functionality would be implemented here.");
        },

        onEditService: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var oService = oContext.getObject();
            MessageBox.information("Edit service: " + oService.serviceName);
        },

        onDeleteService: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var oService = oContext.getObject();

            MessageBox.confirm("Are you sure you want to delete service '" + oService.serviceName + "'?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        var sPath = oContext.getPath();
                        var oModel = this.getView().getModel();

                        // Get the services array
                        var aServices = oContext.getObject("..").services;

                        // Find and remove the service
                        var iIndex = aServices.findIndex(function (s) {
                            return s.serviceName === oService.serviceName;
                        });

                        if (iIndex >= 0) {
                            aServices.splice(iIndex, 1);

                            // Update the model
                            var sSupplierPath = oContext.getPath().split("/services")[0];
                            oModel.setProperty(sSupplierPath + "/services", aServices);

                            MessageToast.show("Service deleted: " + oService.serviceName);
                        }
                    }
                }.bind(this)
            });
        },

        onExportServices: function () {
            var oSupplier = this.getView().getBindingContext().getObject();
            var aServices = oSupplier.services;

            if (!aServices || aServices.length === 0) {
                MessageToast.show("No services to export");
                return;
            }

            var aColumns = [
                {
                    label: "Service Name",
                    property: "serviceName",
                    type: EdmType.String
                },
                {
                    label: "Service Type",
                    property: "serviceType",
                    type: EdmType.String
                },
                {
                    label: "Number of Guests",
                    property: "guests",
                    type: EdmType.Number
                },
                {
                    label: "Price",
                    property: "price",
                    type: EdmType.Number,
                    scale: 2,
                    delimiter: true
                },
                {
                    label: "Description",
                    property: "description",
                    type: EdmType.String
                }
            ];

            var mSettings = {
                workbook: {
                    columns: aColumns,
                    context: {
                        title: "Services for " + oSupplier.supplierName,
                        sheetName: "Services",
                        application: "SAPUI5 Application"
                    }
                },
                dataSource: aServices,
                fileName: oSupplier.supplierName + "_Services.xlsx"
            };

            var oSpreadsheet = new Spreadsheet(mSettings);
            oSpreadsheet.build().finally(function () {
                oSpreadsheet.destroy();
            });

            MessageToast.show("Exporting services for " + oSupplier.supplierName);
        }
    });
});