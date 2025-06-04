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

    return Controller.extend("tourishui.controller.supplier.SupplierInformation", {
        onInit: function () {
            // Khởi tạo model và binding
            this._oODataModel = this.getOwnerComponent().getModel("supplierService");
            
            // Model để lưu trữ state
            var oViewModel = new JSONModel({
                busy: false,
                delay: 0,
                tableTitle: "Suppliers",
                countTitle: "Suppliers: 0",
                selectedItems: []
            });
            this.getView().setModel(oViewModel, "viewModel");
            
            // Khởi tạo model JSON rỗng để lưu danh sách suppliers
            var oSupplierListModel = new JSONModel({
                Suppliers: []
            });
            this.getView().setModel(oSupplierListModel);
            
            // Đăng ký event patternMatched cho routing
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("supplierList").attachPatternMatched(this._onPatternMatched, this);
            
            // Khởi tạo bộ lọc
            this._initializeFilters();
        },
        
        _onPatternMatched: function (oEvent) {
            // Load data khi route được matched
            this._loadSuppliers();
        },
        
        _initializeFilters: function () {
            // Khởi tạo model và binding cho filters
            var oFilterModel = new JSONModel({
                supplierID: "",
                supplierName: "",
                address: ""
            });
            this.getView().setModel(oFilterModel, "filters");
            
            // Bind các filter input
            this.byId("supplierIDFilter").bindProperty("value", "filters>/supplierID");
            this.byId("supplierNameFilter").bindProperty("value", "filters>/supplierName");
            this.byId("addressFilter").bindProperty("value", "filters>/address");
        },
        
        _loadSuppliers: function () {
            var oView = this.getView();
            var oViewModel = oView.getModel("viewModel");
            var oODataModel = this._oODataModel;
            
            // Set busy indicator
            oViewModel.setProperty("/busy", true);
            
            // Sử dụng searchSuppliers action để lấy danh sách suppliers
            var oContext = oODataModel.bindContext("/searchSuppliers(...)");
            oContext.setParameter("searchTerm", "");
            oContext.setParameter("skip", 0);
            oContext.setParameter("limit", 100);
            
            oContext.execute().then(function () {
                var oResult = oContext.getBoundContext().getObject();
                console.log("Suppliers loaded:", oResult);
                
                // Cập nhật model
                var oModel = oView.getModel();
                oModel.setData({
                    Suppliers: oResult.items || []
                });
                
                // Cập nhật số lượng nhà cung cấp
                var iCount = (oResult.items || []).length;
                oViewModel.setProperty("/countTitle", "Suppliers: " + iCount);
                this.byId("tableCountText").setText("Suppliers: " + iCount);
                
                // Tắt busy indicator
                oViewModel.setProperty("/busy", false);
            }.bind(this)).catch(function (oError) {
                oViewModel.setProperty("/busy", false);
                var sMessage = "Failed to load suppliers!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                }
                console.error("Error loading suppliers:", sMessage);
                MessageBox.error(sMessage);
            });
        },
        
        onSearch: function (oEvent) {
            var oView = this.getView();
            var oViewModel = oView.getModel("viewModel");
            var oODataModel = this._oODataModel;
            var oFilterModel = this.getView().getModel("filters");
            var oFilterData = oFilterModel.getData();
            var sSearchTerm = this.byId("supplierSearchField").getValue();
            
            // Kết hợp các filter
            var sFinalSearchTerm = sSearchTerm || "";
            if (oFilterData.supplierID) {
                sFinalSearchTerm += oFilterData.supplierID;
            }
            if (oFilterData.supplierName) {
                sFinalSearchTerm += oFilterData.supplierName;
            }
            if (oFilterData.address) {
                sFinalSearchTerm += oFilterData.address;
            }
            
            // Set busy indicator
            oViewModel.setProperty("/busy", true);
            
            // Sử dụng searchSuppliers action để lấy danh sách suppliers theo filter
            var oContext = oODataModel.bindContext("/searchSuppliers(...)");
            oContext.setParameter("searchTerm", sFinalSearchTerm.trim());
            oContext.setParameter("skip", 0);
            oContext.setParameter("limit", 100);
            
            oContext.execute().then(function () {
                var oResult = oContext.getBoundContext().getObject();
                console.log("Filtered suppliers loaded:", oResult);
                
                // Cập nhật model
                var oModel = oView.getModel();
                oModel.setData({
                    Suppliers: oResult.items || []
                });
                
                // Cập nhật số lượng nhà cung cấp
                var iCount = (oResult.items || []).length;
                oViewModel.setProperty("/countTitle", "Suppliers: " + iCount);
                this.byId("tableCountText").setText("Suppliers: " + iCount);
                
                // Tắt busy indicator
                oViewModel.setProperty("/busy", false);
            }.bind(this)).catch(function (oError) {
                oViewModel.setProperty("/busy", false);
                var sMessage = "Failed to search suppliers!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                }
                console.error("Error searching suppliers:", sMessage);
                MessageBox.error(sMessage);
            });
        },
        
        onClearFilters: function () {
            // Reset các filter fields
            var oFilterModel = this.getView().getModel("filters");
            oFilterModel.setData({
                supplierID: "",
                supplierName: "",
                address: ""
            });
            
            // Clear search field
            this.byId("supplierSearchField").setValue("");
            
            // Refresh data
            this._loadSuppliers();
        },
        
        onAddSupplier: function () {
            // Navigate tới trang tạo mới supplier
            var oRouter = this.getOwnerComponent().getRouter();
            console.log(oRouter);
            oRouter.navTo("supplierDetail", {
                supplierID: "create"
            });
        },
        
        onEditSupplier: function (oEvent) {
            // Lấy context của item được click
            var oSource = oEvent.getSource();
            var oContext = oSource.getBindingContext();
            var sSupplierID = oContext.getProperty("ID");
            
            // Navigate tới trang chi tiết supplier để chỉnh sửa
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("supplierDetail", {
                supplierID: sSupplierID
            });
            
            // Dừng sự kiện để không navigate theo onSupplierPress
            oEvent.stopPropagation();
        },
        
        onSupplierPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext();
            var sSupplierID = oContext.getProperty("ID");
            
            // Navigate tới trang chi tiết supplier
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("supplierDetail", {
                supplierID: sSupplierID
            });
        },
        
        onDeleteSupplier: function (oEvent) {
            var that = this;
            var oSource = oEvent.getSource();
            var oContext = oSource.getBindingContext();
            var sSupplierID = oContext.getProperty("ID");
            var sSupplierName = oContext.getProperty("SupplierName");
            
            // Xác nhận xóa
            MessageBox.confirm("Are you sure you want to delete supplier '" + sSupplierName + "'?", {
                title: "Confirm Delete",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        // Gọi action deleteSupplier
                        var oDeleteContext = that._oODataModel.bindContext("/deleteSupplier(...)");
                        oDeleteContext.setParameter("supplierID", sSupplierID);
                        
                        oDeleteContext.execute().then(function () {
                            MessageToast.show("Supplier deleted successfully");
                            that._loadSuppliers(); // Reload the list
                        }).catch(function (oError) {
                            console.log(oError);
                            var sMessage = oError;
                            console.error("Error deleting supplier:", sMessage);
                            MessageBox.error("Error deleting supplier:" + sMessage);
                        });
                    }
                }
            });
            
        },
        
        onDeleteSelected: function () {
            var oTable = this.byId("suppliersTable");
            var aSelectedItems = oTable.getSelectedItems();
            
            if (aSelectedItems.length === 0) {
                MessageBox.information("Please select at least one supplier to delete");
                return;
            }
            
            // Xác nhận xóa
            MessageBox.confirm("Are you sure you want to delete " + aSelectedItems.length + " selected suppliers?", {
                title: "Confirm Delete",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this._deleteSelectedSuppliers(aSelectedItems);
                    }
                }.bind(this)
            });
        },
        
        _deleteSelectedSuppliers: function (aSelectedItems) {
            var that = this;
            var oViewModel = this.getView().getModel("viewModel");
            var iSuccessCount = 0;
            var iFailCount = 0;
            var iTotalCount = aSelectedItems.length;
            var iProcessedCount = 0;
            
            // Set busy state
            oViewModel.setProperty("/busy", true);
            
            // Xử lý từng item một
            var aPromises = aSelectedItems.map(function(oItem) {
                var oContext = oItem.getBindingContext();
                var sSupplierID = oContext.getProperty("ID");
                
                var oDeleteContext = that._oODataModel.bindContext("/deleteSupplier(...)");
                oDeleteContext.setParameter("supplierID", sSupplierID);
                
                return oDeleteContext.execute()
                    .then(function() {
                        iSuccessCount++;
                        return true;
                    })
                    .catch(function() {
                        iFailCount++;
                        return false;
                    });
            });
            
            // Đợi tất cả các action hoàn thành
            Promise.all(aPromises)
                .then(function() {
                    // Tất cả đã hoàn thành
                    oViewModel.setProperty("/busy", false);
                    
                    // Hiển thị thông báo
                    if (iFailCount === 0) {
                        MessageToast.show(iSuccessCount + " suppliers deleted successfully");
                    } else {
                        MessageBox.warning(iSuccessCount + " suppliers deleted successfully, " + iFailCount + " failed");
                    }
                    
                    // Reload danh sách
                    that._loadSuppliers();
                    
                    // Clear selection
                    that.byId("suppliersTable").removeSelections();
                });
        },
        
        onExport: function () {
            var oTable = this.byId("suppliersTable");
            var oBinding = oTable.getBinding("items");
            var aItems = oBinding.getContexts().map(function (oContext) {
                return oContext.getObject();
            });
            
            var oSettings = {
                workbook: {
                    columns: [
                        {
                            label: "Supplier ID",
                            property: "ID",
                            type: EdmType.String
                        },
                        {
                            label: "Supplier Name",
                            property: "SupplierName",
                            type: EdmType.String
                        },
                        {
                            label: "Address",
                            property: "Address",
                            type: EdmType.String
                        },
                        {
                            label: "Phone",
                            property: "Phone",
                            type: EdmType.String
                        },
                        {
                            label: "Email",
                            property: "Email",
                            type: EdmType.String
                        }
                    ],
                    hierarchyLevel: "Level"
                },
                dataSource: aItems,
                fileName: "Suppliers.xlsx"
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
            // Mở dialog cài đặt bảng
            if (!this._pSupplierTableSettingsDialog) {
                this._pSupplierTableSettingsDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "tourishui.view.fragments.SupplierTableSettingsDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            
            this._pSupplierTableSettingsDialog.then(function(oDialog) {
                // Mở dialog
                oDialog.open();
            });
        },
        
        onConfirmSupplierTableSettings: function (oEvent) {
            var mParams = oEvent.getParameters();
            var oTable = this.byId("suppliersTable");
            var oBinding = oTable.getBinding("items");
            
            // Áp dụng sắp xếp
            if (mParams.sortItem) {
                var sPath = mParams.sortItem.getKey();
                var bDescending = mParams.sortDescending;
                
                // Tạo sorter
                var oSorter = new sap.ui.model.Sorter(sPath, bDescending);
                oBinding.sort(oSorter);
            }
        },
        
        onCancelSupplierTableSettings: function () {
            // Không làm gì, dialog sẽ tự đóng
        }
    });
});