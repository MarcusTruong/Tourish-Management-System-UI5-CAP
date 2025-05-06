sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast, Spreadsheet, exportLibrary, Fragment) {
    "use strict";

    var EdmType = exportLibrary.EdmType;

    return Controller.extend("tourishui.controller.supplier.ServiceList", {
        onInit: function () {
            // Khởi tạo model và binding
            this._oODataModel = this.getOwnerComponent().getModel("supplierService");
            if (!this._oODataModel) {
                this._oODataModel = this.getOwnerComponent().getModel(); // Fallback nếu không có model riêng
            }
            
            // Model để lưu trữ state
            var oViewModel = new JSONModel({
                busy: false,
                delay: 0,
                tableTitle: "Services",
                countTitle: "Services: 0"
            });
            this.getView().setModel(oViewModel, "viewModel");
            
            // Khởi tạo model JSON rỗng cho danh sách services
            var oServiceListModel = new JSONModel({
                services: []
            });
            this.getView().setModel(oServiceListModel);
            
            // Đăng ký event patternMatched cho routing
            var oRouter = this.getOwnerComponent().getRouter();
            if (oRouter.getRoute("serviceList")) {
                oRouter.getRoute("serviceList").attachPatternMatched(this._onPatternMatched, this);
            }
            
            // Load danh sách suppliers và service types
            this._loadSuppliers();
            this._loadServiceTypes();
        },
        
        _onPatternMatched: function (oEvent) {
            // Load data khi route được matched
            this._loadServices();
        },
        
        _loadServiceTypes: function () {
            // Gọi action để lấy danh sách service types
            var oContext = this._oODataModel.bindContext("/getServiceTypes(...)");
            
            oContext.execute().then(function () {
                var aTypes = oContext.getBoundContext().getObject() || [];
                console.log("Service types loaded:", aTypes);
                
                // Tạo model
                var oTypesModel = new JSONModel({
                    types: aTypes.value
                });
                this.getView().setModel(oTypesModel, "serviceTypes");
            }.bind(this)).catch(function (oError) {
                var sMessage = "Failed to load service types!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                    sMessage = oError.message || sMessage;
                }
                console.error("Error loading service types:", sMessage);
            });
        },
        
        _loadSuppliers: function () {
            var oODataModel = this._oODataModel;
            
            // Sử dụng đường dẫn trực tiếp đến entity set thay vì action
            var oSupplierContext = oODataModel.bindContext("/Suppliers");
            
            oSupplierContext.requestObject().then(function (aData) {
                console.log("Suppliers loaded for dropdown:", aData);
                
                // Đảm bảo aData là một mảng
                var aSuppliers = Array.isArray(aData) ? aData : aData.value || [];
                
                // Tạo model Suppliers để binding vào ComboBox
                var oSuppliersModel = new JSONModel({
                    Suppliers: aSuppliers
                });
                this.getView().setModel(oSuppliersModel, "suppliers");
                
                // Update ComboBox binding
                this.byId("supplierFilter").bindItems({
                    path: "suppliers>/Suppliers",
                    template: new sap.ui.core.Item({
                        key: "{suppliers>ID}",
                        text: "{suppliers>SupplierName}"
                    })
                });
                
            }.bind(this)).catch(function (oError) {
                var sMessage = "Failed to load suppliers for filter!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                    sMessage = oError.message || sMessage;
                }
                console.error("Error loading suppliers:", sMessage);
            });
        },
        
        _loadServices: function () {
            this.onSearch(); // Tìm kiếm với các filter mặc định
        },
        
        onSearch: function (oEvent) {
            var oView = this.getView();
            var oViewModel = oView.getModel("viewModel");
            var oODataModel = this._oODataModel;
            
            // Lấy giá trị từ các filter
            var sSearchTerm = this.byId("serviceNameSearch").getValue();
            var oSupplierComboBox = this.byId("supplierFilter");
            var oServiceTypeComboBox = this.byId("serviceTypeFilter");
            var sSupplierID = oSupplierComboBox.getSelectedKey();
            var sServiceType = oServiceTypeComboBox.getSelectedKey();
            var sMinPrice = this.byId("minPriceInput").getValue();
            var sMaxPrice = this.byId("maxPriceInput").getValue();
            
            // Convert giá trị
            var fMinPrice = sMinPrice ? parseFloat(sMinPrice) : undefined;
            var fMaxPrice = sMaxPrice ? parseFloat(sMaxPrice) : undefined;
            
            // Set busy indicator
            oViewModel.setProperty("/busy", true);
            
            // Gọi searchServices action
            var oContext = oODataModel.bindContext("/searchServices(...)");
            if (sSupplierID) {
                oContext.setParameter("supplierID", sSupplierID);
            }
            if (sServiceType) {
                oContext.setParameter("serviceType", sServiceType);
            }
            oContext.setParameter("searchTerm", sSearchTerm || "");
            if (fMinPrice !== undefined) {
                oContext.setParameter("minPrice", fMinPrice);
            }
            if (fMaxPrice !== undefined) {
                oContext.setParameter("maxPrice", fMaxPrice);
            }
            oContext.setParameter("skip", 0);
            oContext.setParameter("limit", 100);
            
            oContext.execute().then(function () {
                var aServices = oContext.getBoundContext().getObject() || [];
                console.log("Services search result:", aServices);
                
                // Cập nhật model
                var oModel = this.getView().getModel();
                oModel.setData({
                    services: aServices.value
                });
                
                // Cập nhật số lượng service
                var iCount = aServices.value.length;
                oViewModel.setProperty("/countTitle", "Services: " + iCount);
                if (this.byId("tableCountText2")) {
                    this.byId("tableCountText2").setText("Services: " + iCount);
                }
                
                // Tắt busy indicator
                oViewModel.setProperty("/busy", false);
            }.bind(this)).catch(function (oError) {
                oViewModel.setProperty("/busy", false);
                var sMessage = "Failed to search services!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                    sMessage = oError.message || sMessage;
                }
                console.error("Error searching services:", sMessage);
                MessageBox.error(sMessage);
            });
        },
        
        onClearFilters: function () {
            // Reset các filter fields
            this.byId("serviceNameSearch").setValue("");
            this.byId("supplierFilter").setSelectedKey("");
            this.byId("serviceTypeFilter").setSelectedKey("");
            this.byId("minPriceInput").setValue("");
            this.byId("maxPriceInput").setValue("");
            
            // Refresh data
            this._loadServices();
        },
        
        onEditService: function (oEvent) {
            // Ngăn sự kiện navigation
            // oEvent.stopPropagation();
            
            // Lấy service đã chọn
            var oSource = oEvent.getSource();
            var oContext = oSource.getBindingContext();
            var oService = oContext.getObject();
            
            // Tạo hoặc tái sử dụng dialog
            if (!this._pServiceDialog) {
                this._pServiceDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "tourishui.view.fragments.ServiceDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            
            this._pServiceDialog.then(function(oDialog) {
                // Set model
                var oServiceModel = new JSONModel({
                    ID: oService.ID,
                    SupplierID: oService.SupplierID, // Giữ nguyên supplier
                    ServiceName: oService.ServiceName,
                    ServiceType: oService.ServiceType,
                    Description: oService.Description,
                    Price: oService.Price
                });
                this.getView().setModel(oServiceModel, "newService");
                
                // Cài đặt tiêu đề
                var oDialogTitle = oDialog.getCustomHeader().getContent()[0];
                if (oDialogTitle) {
                    oDialogTitle.setText("Edit Service");
                }
                
                // Ẩn/disable trường chọn supplier trong dialog (giữ nguyên supplier)
                var oSupplierField = this._findFormElement(oDialog, "supplierComboBox");
                if (oSupplierField) {
                    oSupplierField.setEnabled(false);
                }
                
                // Mở dialog
                oDialog.open();
            }.bind(this));
        },
        
            _findFormElement: function(oDialog, sId) {
            return sap.ui.getCore().byId(this.getView().getId() + "--" + sId) || 
                   sap.ui.getCore().byId(sId);
            },
        
        onDeleteService: function (oEvent) {
            // Ngăn sự kiện navigation
            oEvent.stopPropagation();
            
            var that = this;
            var oSource = oEvent.getSource();
            var oContext = oSource.getBindingContext();
            var oService = oContext.getObject();
            
            // Xác nhận xóa
            MessageBox.confirm("Are you sure you want to delete service '" + oService.ServiceName + "'?", {
                title: "Confirm Delete",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        // Gọi action deleteService
                        var oDeleteContext = that._oODataModel.bindContext("/deleteService(...)");
                        oDeleteContext.setParameter("serviceID", oService.ID);
                        
                        oDeleteContext.execute().then(function () {
                            MessageToast.show("Service deleted successfully");
                            // Reload service list
                            that.onSearch();
                        }).catch(function (oError) {
                            var sMessage = "Failed to delete service!";
                            try {
                                var oResponse = JSON.parse(oError.responseText);
                                sMessage = oResponse.error.message || sMessage;
                            } catch (e) {
                                // Fallback to default message
                                sMessage = oError.message || sMessage;
                            }
                            console.error("Error deleting service:", sMessage);
                            MessageBox.error(sMessage);
                        });
                    }
                }
            });
        },
        
        onServicePress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext();
            var oService = oContext.getObject();
            
            // Navigate to supplier detail
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("supplierDetail", {
                supplierID: oService.SupplierID
            });
        },
        
        onSaveService: function () {
            // Validate input
            if (!this._validateServiceForm()) {
                return;
            }
            
            var oServiceModel = this.getView().getModel("newService");
            var oServiceData = oServiceModel.getData();
            
            // Đặt busy state
            sap.ui.core.BusyIndicator.show(0);
            
            // Update existing service
            this._updateService(oServiceData);
        },
        
        _validateServiceForm: function () {
            var oServiceModel = this.getView().getModel("newService");
            var oServiceData = oServiceModel.getData();
            
            // Validate required fields
            if (!oServiceData.ServiceName || oServiceData.ServiceName.trim() === "") {
                MessageBox.error("Service Name is required");
                return false;
            }
            
            // Validate price
            if (isNaN(oServiceData.Price) || oServiceData.Price < 0) {
                MessageBox.error("Price must be a valid number greater than or equal to 0");
                return false;
            }
            
            return true;
        },
        
        _updateService: function (oServiceData) {
            var that = this;
            
            // Gọi action updateService
            var oUpdateContext = this._oODataModel.bindContext("/updateService(...)");
            oUpdateContext.setParameter("serviceID", oServiceData.ID);
            oUpdateContext.setParameter("serviceName", oServiceData.ServiceName);
            oUpdateContext.setParameter("serviceType", oServiceData.ServiceType);
            oUpdateContext.setParameter("description", oServiceData.Description);
            oUpdateContext.setParameter("price", oServiceData.Price);
            
            oUpdateContext.execute().then(function () {
                var oResult = oUpdateContext.getBoundContext().getObject();
                console.log("Service updated:", oResult);
                
                // Tắt busy indicator
                sap.ui.core.BusyIndicator.hide();
                
                // Hiển thị thông báo
                MessageToast.show("Service updated successfully");
                
                // Đóng dialog bằng cách sử dụng promise
            if (that._pServiceDialog) {
                that._pServiceDialog.then(function(oDialog) {
                // Bật lại trường chọn supplier (nếu cần)
                var oSupplierField = that._findFormElement(oDialog, "supplierComboBox");
                if (oSupplierField) {
                    oSupplierField.setEnabled(true);
                }
                
                oDialog.close();
            });
        }
                
                // Bật lại trường chọn supplier (nếu cần)
                var oSupplierField = sap.ui.getCore().byId("supplierComboBox");
                if (oSupplierField) {
                    oSupplierField.setEnabled(true);
                }
                
                // Reload service list
                that.onSearch();
            }).catch(function (oError) {
                // Tắt busy indicator
                sap.ui.core.BusyIndicator.hide();
                
                var sMessage = "Failed to update service!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                    sMessage = oError.message || sMessage;
                }
                console.error("Error updating service:", sMessage);
                MessageBox.error(sMessage);
            });
        },
        
        onCancelService: function () {
            this._pServiceDialog.then(function(oDialog) {
                // Bật lại trường chọn supplier (nếu cần)
                var oSupplierField = this._findFormElement(oDialog, "supplierComboBox");
                if (oSupplierField) {
                    oSupplierField.setEnabled(true);
                }
                
                // Đóng dialog
                oDialog.close();
            }.bind(this));
        },
        
        onExport: function () {
            var oTable = this.byId("servicesTable");
            var oBinding = oTable.getBinding("items");
            var aItems = oBinding.getContexts().map(function (oContext) {
                return oContext.getObject();
            });
            
            var oSettings = {
                workbook: {
                    columns: [
                        {
                            label: "Service ID",
                            property: "ID",
                            type: EdmType.String
                        },
                        {
                            label: "Service Name",
                            property: "ServiceName",
                            type: EdmType.String
                        },
                        {
                            label: "Service Type",
                            property: "ServiceType",
                            type: EdmType.String
                        },
                        {
                            label: "Supplier",
                            property: "SupplierName",
                            type: EdmType.String
                        },
                        {
                            label: "Description",
                            property: "Description",
                            type: EdmType.String
                        },
                        {
                            label: "Price",
                            property: "Price",
                            type: EdmType.Number
                        }
                    ],
                    hierarchyLevel: "Level"
                },
                dataSource: aItems,
                fileName: "Services.xlsx"
            };
            
            var oSpreadsheet = new Spreadsheet(oSettings);
            oSpreadsheet.build()
                .then(function () {
                    MessageToast.show("Spreadsheet export has finished");
                })
                .catch(function (sMessage) {
                    MessageBox.error("Export error: " + sMessage);
                });
        },
        
        onTableSettings: function () {
            // Mở dialog cài đặt bảng (columns visibility, sorting)
            if (!this._oTableSettingsDialog) {
                this._oTableSettingsDialog = sap.ui.xmlfragment("tourishui.view.fragments.TableSettingsDialog", this);
                this.getView().addDependent(this._oTableSettingsDialog);
            }
            
            // Mở dialog
            this._oTableSettingsDialog.open();
        },
        
        onCloseTableSettings: function (oEvent) {
            // Lưu và áp dụng cài đặt
            var mParams = oEvent.getParameters();
            var oTable = this.byId("servicesTable");
            
            // Áp dụng sort
            var aSorters = [];
            if (mParams.sortItem) {
                var sPath = mParams.sortItem.getKey();
                var bDescending = mParams.sortDescending;
                aSorters.push(new sap.ui.model.Sorter(sPath, bDescending));
            }
            
            var oBinding = oTable.getBinding("items");
            oBinding.sort(aSorters);
            
            // Áp dụng column visibility
            mParams.columns.forEach(function (oColumn) {
                oTable.getColumns().forEach(function (oTableColumn) {
                    if (oTableColumn.getData() === oColumn.columnKey) {
                        oTableColumn.setVisible(oColumn.visible);
                    }
                });
            });
            
            // Đóng dialog
            if (this._oTableSettingsDialog) {
                this._oTableSettingsDialog.close();
            }
        }
    });
});