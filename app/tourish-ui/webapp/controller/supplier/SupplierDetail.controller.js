sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/core/format/DateFormat"
], function (Controller, JSONModel, MessageBox, MessageToast, Fragment, DateFormat) {
    "use strict";

    return Controller.extend("tourishui.controller.supplier.SupplierDetail", {
        onInit: function () {
            // Khởi tạo model và binding
            this._oODataModel = this.getOwnerComponent().getModel("supplierService");
            
            // Model để lưu trữ state
            var oViewModel = new JSONModel({
                busy: false,
                delay: 0,
                editMode: false,
                editAllowed: true,
                deleteAllowed: true
            });
            this.getView().setModel(oViewModel, "viewModel");
            
            // Model cho supplier
            var oSupplierModel = new JSONModel({
                ID: "",
                supplierName: "",
                address: "",
                phone: "",
                email: ""
            });
            this.getView().setModel(oSupplierModel, "supplier");
            
            // Đăng ký event patternMatched cho routing
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("supplierDetail").attachPatternMatched(this._onSupplierMatched, this);
        },
        
        _onSupplierMatched: function (oEvent) {
            var sSupplierID = oEvent.getParameter("arguments").supplierID;
            
            if (sSupplierID === "create") {
                // Trường hợp tạo mới
                this._setCreateMode();
            } else {
                // Trường hợp xem/sửa
                this._loadSupplier(sSupplierID);
            }
        },
        
        _setCreateMode: function () {
            var oViewModel = this.getView().getModel("viewModel");
            var oSupplierModel = this.getView().getModel("supplier");
            
            // Reset supplier model
            oSupplierModel.setData({
                ID: "",
                supplierName: "",
                address: "",
                phone: "",
                email: "",
                // Thêm validation states
                supplierNameState: "None",
                supplierNameStateText: "",
                phoneState: "None", 
                phoneStateText: "",
                emailState: "None",
                emailStateText: ""
            });
            
            // Reset services model
            var oServicesModel = new JSONModel({
                services: []
            });
            this.getView().setModel(oServicesModel, "services");
            
            // Reset debts model
            var oDebtsModel = new JSONModel({
                debts: [],
                debtStatistics: {
                    totalDebt: 0,
                    pendingDebt: 0,
                    completedDebt: 0,
                    debtCount: 0,
                    pendingDebtCount: 0
                }
            });
            this.getView().setModel(oDebtsModel, "debts");
            
            // Set view state
            oViewModel.setProperty("/editMode", true);
            oViewModel.setProperty("/editAllowed", false); // Không cho phép edit khi đang tạo mới
            oViewModel.setProperty("/deleteAllowed", false); // Không cho phép xóa khi đang tạo mới
            
            // Cập nhật tiêu đề
            this.byId("detailPageTitle").setText("New Supplier");
        },
        
        _loadSupplier: function (sSupplierID) {
            var oView = this.getView();
            var oViewModel = oView.getModel("viewModel");
            var oSupplierModel = oView.getModel("supplier");
            
            // Set busy indicator
            oViewModel.setProperty("/busy", true);
            
            // Gọi getSupplierDetails action để lấy thông tin supplier
            var oContext = this._oODataModel.bindContext("/getSupplierDetails(...)");
            oContext.setParameter("supplierID", sSupplierID);
            
            oContext.execute().then(function () {
                var oResult = oContext.getBoundContext().getObject();
                console.log("Supplier details loaded:", oResult);
                
                var oSupplierData = oResult.supplier;
// Thêm validation states
oSupplierData.supplierNameState = "None";
oSupplierData.supplierNameStateText = "";
oSupplierData.phoneState = "None";
oSupplierData.phoneStateText = "";
oSupplierData.emailState = "None";
oSupplierData.emailStateText = "";
                // Set data vào supplier model
                oSupplierModel.setData(oSupplierData);
                
                // Cập nhật services model
                var oServicesModel = new JSONModel({
                    services: oResult.services || []
                });
                oView.setModel(oServicesModel, "services");
                
                // Cập nhật debts model
                var oDebtsModel = new JSONModel({
                    debts: oResult.debts || [],
                    debtStatistics: oResult.debtStatistics || {
                        totalDebt: 0,
                        pendingDebt: 0,
                        completedDebt: 0,
                        debtCount: 0,
                        pendingDebtCount: 0
                    }
                });
                oView.setModel(oDebtsModel, "debts");
                
                // Cập nhật view state
                oViewModel.setProperty("/editMode", false);
                oViewModel.setProperty("/editAllowed", true);
                oViewModel.setProperty("/deleteAllowed", true);
                
                // Cập nhật tiêu đề
                this.byId("detailPageTitle").setText("Supplier: " + oResult.supplier.SupplierName);
                
                // Tắt busy indicator
                oViewModel.setProperty("/busy", false);
            }.bind(this)).catch(function (oError) {
                oViewModel.setProperty("/busy", false);
                var sMessage = "Failed to load supplier details!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                }
                console.error("Error loading supplier details:", sMessage);
                MessageBox.error(sMessage);
                
                // Navigate back to list
                this.onNavBack();
            }.bind(this));
        },
        
        onNavBack: function () {
            // Navigate trở lại trang danh sách
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("supplierList", {}, true);
        },
        
        onEdit: function () {
            // Chuyển sang chế độ edit
            var oViewModel = this.getView().getModel("viewModel");
            oViewModel.setProperty("/editMode", true);
        },
        
        onDelete: function () {
            var that = this;
            var oSupplierModel = this.getView().getModel("supplier");
            var sSupplierID = oSupplierModel.getProperty("/ID");
            var sSupplierName = oSupplierModel.getProperty("/SupplierName");
            
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
                            that.onNavBack(); // Navigate back to list
                        }).catch(function (oError) {
                            var sMessage = oError;
                            try {
                                var oResponse = JSON.parse(oError.responseText);
                                sMessage = oResponse.error.message || sMessage;
                            } catch (e) {
                                // Fallback to default message
                            }
                            console.error("Error deleting supplier:", sMessage);
                            MessageBox.error("Failed to delete supplier!" + sMessage);
                        });
                    }
                }
            });
        },
        
        onSave: function () {
            // Validate input
            if (!this._validateSupplierForm()) {
                return;
            }
            
            var oViewModel = this.getView().getModel("viewModel");
            var oSupplierModel = this.getView().getModel("supplier");
            var oSupplierData = oSupplierModel.getData();
            
            // Set busy indicator
            oViewModel.setProperty("/busy", true);
            
            if (!oSupplierData.ID) {
                // Create new supplier
                this._createSupplier(oSupplierData);
            } else {
                // Update existing supplier
                this._updateSupplier(oSupplierData);
            }
        },
        
        _validateSupplierForm: function () {
            var oSupplierModel = this.getView().getModel("supplier");
            var oSupplierData = oSupplierModel.getData();
            var bValid = true;
            
            // Reset all validation states first
            oSupplierModel.setProperty("/supplierNameState", "None");
            oSupplierModel.setProperty("/supplierNameStateText", "");
            oSupplierModel.setProperty("/phoneState", "None");
            oSupplierModel.setProperty("/phoneStateText", "");
            oSupplierModel.setProperty("/emailState", "None");
            oSupplierModel.setProperty("/emailStateText", "");
            
            // Validate supplier name (required)
            if (!oSupplierData.SupplierName || oSupplierData.SupplierName.trim() === "") {
                oSupplierModel.setProperty("/supplierNameState", "Error");
                oSupplierModel.setProperty("/supplierNameStateText", "Supplier Name is required");
                bValid = false;
            } else if (oSupplierData.SupplierName.length < 2) {
                oSupplierModel.setProperty("/supplierNameState", "Warning");
                oSupplierModel.setProperty("/supplierNameStateText", "Supplier Name should be at least 2 characters");
                bValid = false;
            }
            
            // Validate phone if provided
            if (oSupplierData.Phone && oSupplierData.Phone.trim() !== "") {
                var phoneRegex = /^[\+]?[0-9\s\-\(\)]+$/;
                if (!phoneRegex.test(oSupplierData.Phone)) {
                    oSupplierModel.setProperty("/phoneState", "Error");
                    oSupplierModel.setProperty("/phoneStateText", "Invalid phone number format");
                    bValid = false;
                } else if (oSupplierData.Phone.replace(/\D/g, '').length < 10) {
                    oSupplierModel.setProperty("/phoneState", "Warning");
                    oSupplierModel.setProperty("/phoneStateText", "Phone number seems too short");
                }
            }
            
            // Validate email if provided
            if (oSupplierData.Email && oSupplierData.Email.trim() !== "") {
                if (!this._isValidEmail(oSupplierData.Email)) {
                    oSupplierModel.setProperty("/emailState", "Error");
                    oSupplierModel.setProperty("/emailStateText", "Invalid email format");
                    bValid = false;
                }
            }
            
            if (!bValid) {
                MessageBox.error("Please correct the highlighted fields before saving");
            }
            
            return bValid;
        },
        
        _isValidEmail: function (sEmail) {
            var regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return regex.test(sEmail);
        },
        
        _createSupplier: function (oSupplierData) {
            var that = this;
            var oViewModel = this.getView().getModel("viewModel");
            
            // Gọi action createSupplier
            var oCreateContext = this._oODataModel.bindContext("/createSupplier(...)");
            oCreateContext.setParameter("supplierName", oSupplierData.SupplierName);
            oCreateContext.setParameter("address", oSupplierData.Address);
            oCreateContext.setParameter("phone", oSupplierData.Phone);
            oCreateContext.setParameter("email", oSupplierData.Email);
            
            oCreateContext.execute().then(function () {
                var oResult = oCreateContext.getBoundContext().getObject();
                console.log("Supplier created:", oResult);
                
                // Tắt busy indicator
                oViewModel.setProperty("/busy", false);
                
                // Hiển thị thông báo
                MessageToast.show("Supplier created successfully");
                
                // Navigate to detail view of new supplier
                var oRouter = that.getOwnerComponent().getRouter();
                oRouter.navTo("supplierDetail", {
                    supplierID: oResult.ID
                }, true);
            }).catch(function (oError) {
                // Tắt busy indicator
                oViewModel.setProperty("/busy", false);
                
                var sMessage = "Failed to create supplier!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                }
                console.error("Error creating supplier:", sMessage);
                MessageBox.error(sMessage);
            });
        },
        
        _updateSupplier: function (oSupplierData) {
            var that = this;
            var oViewModel = this.getView().getModel("viewModel");
            
            // Gọi action updateSupplier
            var oUpdateContext = this._oODataModel.bindContext("/updateSupplier(...)");
            oUpdateContext.setParameter("supplierID", oSupplierData.ID);
            oUpdateContext.setParameter("supplierName", oSupplierData.SupplierName);
            oUpdateContext.setParameter("address", oSupplierData.Address);
            oUpdateContext.setParameter("phone", oSupplierData.Phone);
            oUpdateContext.setParameter("email", oSupplierData.Email);
            
            oUpdateContext.execute().then(function () {
                var oResult = oUpdateContext.getBoundContext().getObject();
                console.log("Supplier updated:", oResult);
                
                // Update model với dữ liệu từ server
                var oSupplierModel = that.getView().getModel("supplier");
                oSupplierModel.setData(oResult);
                
                // Tắt busy indicator
                oViewModel.setProperty("/busy", false);
                oViewModel.setProperty("/editMode", false);
                
                // Hiển thị thông báo
                MessageToast.show("Supplier updated successfully");
                
                // Cập nhật tiêu đề
                that.byId("detailPageTitle").setText("Supplier: " + oResult.supplier.SupplierName);
            }).catch(function (oError) {
                // Tắt busy indicator
                oViewModel.setProperty("/busy", false);
                
                var sMessage = "Failed to update supplier!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                }
                console.error("Error updating supplier:", sMessage);
                MessageBox.error(sMessage);
            });
        },
        
        onCancel: function () {
            var oViewModel = this.getView().getModel("viewModel");
            var oSupplierModel = this.getView().getModel("supplier");
            var sSupplierID = oSupplierModel.getProperty("/ID");
            
            if (!sSupplierID) {
                // Đối với trường hợp tạo mới, quay lại trang danh sách
                this.onNavBack();
            } else {
                // Đối với trường hợp chỉnh sửa, quay lại chế độ xem
                oViewModel.setProperty("/editMode", false);
                
                // Reload dữ liệu từ server để hủy các thay đổi
                this._loadSupplier(sSupplierID);
            }
        },
        // Thêm sau hàm onCancel
onSupplierNameChange: function(oEvent) {
    var sValue = oEvent.getParameter("value");
    var oSupplierModel = this.getView().getModel("supplier");
    
    if (!sValue || sValue.trim() === "") {
        oSupplierModel.setProperty("/supplierNameState", "Error");
        oSupplierModel.setProperty("/supplierNameStateText", "Supplier Name is required");
    } else if (sValue.length < 2) {
        oSupplierModel.setProperty("/supplierNameState", "Warning");
        oSupplierModel.setProperty("/supplierNameStateText", "Supplier Name should be at least 2 characters");
    } else {
        oSupplierModel.setProperty("/supplierNameState", "Success");
        oSupplierModel.setProperty("/supplierNameStateText", "");
    }
},

onPhoneChange: function(oEvent) {
    var sValue = oEvent.getParameter("value");
    var oSupplierModel = this.getView().getModel("supplier");
    
    if (sValue && sValue.trim() !== "") {
        // Simple phone validation (digits, spaces, hyphens, parentheses, plus sign)
        var phoneRegex = /^[\+]?[0-9\s\-\(\)]+$/;
        if (!phoneRegex.test(sValue)) {
            oSupplierModel.setProperty("/phoneState", "Error");
            oSupplierModel.setProperty("/phoneStateText", "Invalid phone number format");
        } else if (sValue.replace(/\D/g, '').length < 10) {
            oSupplierModel.setProperty("/phoneState", "Warning");
            oSupplierModel.setProperty("/phoneStateText", "Phone number seems too short");
        } else {
            oSupplierModel.setProperty("/phoneState", "Success");
            oSupplierModel.setProperty("/phoneStateText", "");
        }
    } else {
        oSupplierModel.setProperty("/phoneState", "None");
        oSupplierModel.setProperty("/phoneStateText", "");
    }
},

onEmailChange: function(oEvent) {
    var sValue = oEvent.getParameter("value");
    var oSupplierModel = this.getView().getModel("supplier");
    
    if (sValue && sValue.trim() !== "") {
        if (!this._isValidEmail(sValue)) {
            oSupplierModel.setProperty("/emailState", "Error");
            oSupplierModel.setProperty("/emailStateText", "Invalid email format");
        } else {
            oSupplierModel.setProperty("/emailState", "Success");
            oSupplierModel.setProperty("/emailStateText", "");
        }
    } else {
        oSupplierModel.setProperty("/emailState", "None");
        oSupplierModel.setProperty("/emailStateText", "");
    }
},
        
        // Service Tab Methods
        onAddService: function () {
            // Hiển thị dialog để thêm dịch vụ mới
            if (!this._oServiceDialog) {
                this._oServiceDialog = sap.ui.xmlfragment("tourishui.view.fragments.ServiceDialog", this);
                this.getView().addDependent(this._oServiceDialog);
            }
            
            // Reset model
            var oServiceModel = new JSONModel({
                ID: "",
                supplierID: this.getView().getModel("supplier").getProperty("/ID"),
                serviceName: "",
                serviceType: "",
                description: "",
                price: 0
            });
            this.getView().setModel(oServiceModel, "newService");
            
            // Lấy danh sách service types
            this._loadServiceTypes();
            
            // Cài đặt tiêu đề
            sap.ui.getCore().byId("serviceDialogTitle").setText("Add New Service");
            
            // Mở dialog
            this._oServiceDialog.open();
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
                }
                console.error("Error loading service types:", sMessage);
            });
        },
        
        onEditService: function (oEvent) {
            // Lấy service đã chọn
            var oSource = oEvent.getSource();
            var oContext = oSource.getBindingContext("services");
            var oService = oContext.getObject();
            
            // Hiển thị dialog để sửa service
            if (!this._oServiceDialog) {
                this._oServiceDialog = sap.ui.xmlfragment("tourishui.view.fragments.ServiceDialog", this);
                this.getView().addDependent(this._oServiceDialog);
            }
            
            // Set model
            var oServiceModel = new JSONModel(oService);
            this.getView().setModel(oServiceModel, "newService");
            
            // Lấy danh sách service types
            this._loadServiceTypes();
            
            // Cài đặt tiêu đề
            sap.ui.getCore().byId("serviceDialogTitle").setText("Edit Service");
            
            // Mở dialog
            this._oServiceDialog.open();
        },
        
        onDeleteService: function (oEvent) {
            var that = this;
            var oSource = oEvent.getSource();
            var oContext = oSource.getBindingContext("services");
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
                            that._loadSupplier(that.getView().getModel("supplier").getProperty("/ID"));
                        }).catch(function (oError) {
                            var sMessage = "Failed to delete service!";
                            try {
                                var oResponse = JSON.parse(oError.responseText);
                                sMessage = oResponse.error.message || sMessage;
                            } catch (e) {
                                // Fallback to default message
                            }
                            console.error("Error deleting service:", sMessage);
                            MessageBox.error(sMessage);
                        });
                    }
                }
            });
        },
        
        onSaveService: function () {
            // Validate input
            if (!this._validateServiceForm()) {
                return;
            }
            
            var oServiceModel = this.getView().getModel("newService");
            console.log(oServiceModel)

            var oServiceData = oServiceModel.getData();
            console.log(oServiceData)

            // Đặt busy state
            sap.ui.core.BusyIndicator.show(0);
            
            if (!oServiceData.ID) {
                // Create new service
                this._createService(oServiceData);
            } else {
                // Update existing service
                this._updateService(oServiceData);
            }
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
        
        _createService: function (oServiceData) {
            var that = this;
            
            // Gọi action createService
            var oCreateContext = this._oODataModel.bindContext("/createService(...)");
            console.log(oServiceData);
            console.log(oCreateContext)
            oCreateContext.setParameter("supplierID", oServiceData.supplierID);
            oCreateContext.setParameter("serviceName", oServiceData.ServiceName);
            oCreateContext.setParameter("serviceType", oServiceData.ServiceType);
            oCreateContext.setParameter("description", oServiceData.Description);
            oCreateContext.setParameter("price", oServiceData.Price);
            
            oCreateContext.execute().then(function () {
                var oResult = oCreateContext.getBoundContext().getObject();
                console.log("Service created:", oResult);
                
                // Tắt busy indicator
                sap.ui.core.BusyIndicator.hide();
                
                // Hiển thị thông báo
                MessageToast.show("Service created successfully");
                
                // Đóng dialog
                that._oServiceDialog.close();
                
                // Reload supplier details
                that._loadSupplier(that.getView().getModel("supplier").getProperty("/ID"));
            }).catch(function (oError) {
                // Tắt busy indicator
                sap.ui.core.BusyIndicator.hide();
                
                var sMessage = "Failed to create service!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                }
                console.error("Error creating service:", sMessage);
                MessageBox.error(sMessage);
            });
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
                
                // Đóng dialog
                that._oServiceDialog.close();
                
                // Reload supplier details
                that._loadSupplier(that.getView().getModel("supplier").getProperty("/ID"));
            }).catch(function (oError) {
                // Tắt busy indicator
                sap.ui.core.BusyIndicator.hide();
                
                var sMessage = "Failed to update service!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                }
                console.error("Error updating service:", sMessage);
                MessageBox.error(sMessage);
            });
        },
        
        onCancelService: function () {
            // Đóng dialog
            this._oServiceDialog.close();
        },
        
        // Debt Tab Methods
        onAddDebt: function () {
            // Hiển thị dialog để thêm công nợ mới
            if (!this._oDebtDialog) {
                this._oDebtDialog = sap.ui.xmlfragment("tourishui.view.fragments.DebtDialog", this);
                this.getView().addDependent(this._oDebtDialog);
            }
            
            // Reset model với description field
            var oDebtModel = new JSONModel({
                ID: "",
                supplierID: this.getView().getModel("supplier").getProperty("/ID"),
                amount: 0,
                dueDate: new Date(),
                status: "Pending",
                description: "",  
                isEditMode: false
            });
            this.getView().setModel(oDebtModel, "newDebt");
            
            // Cài đặt tiêu đề
            sap.ui.getCore().byId("debtDialogTitle").setText("Add New Debt");
            
            // Mở dialog
            this._oDebtDialog.open();
        },
        
        onMarkDebtAsPaid: function (oEvent) {
            var that = this;
            var oSource = oEvent.getSource();
            var oContext = oSource.getBindingContext("debts");
            var oDebt = oContext.getObject();
            
            // Xác nhận thanh toán
            MessageBox.confirm("Are you sure you want to mark this debt as paid?", {
                title: "Confirm Payment",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        // Gọi action markDebtAsPaid
                        var oMarkContext = that._oODataModel.bindContext("/markDebtAsPaid(...)");
                        oMarkContext.setParameter("debtID", oDebt.ID);
                        
                        oMarkContext.execute().then(function () {
                            MessageToast.show("Debt marked as paid successfully");
                            // Reload supplier details
                            that._loadSupplier(that.getView().getModel("supplier").getProperty("/ID"));
                        }).catch(function (oError) {
                            var sMessage = "Failed to mark debt as paid!";
                            try {
                                var oResponse = JSON.parse(oError.responseText);
                                sMessage = oResponse.error.message || sMessage;
                            } catch (e) {
                                // Fallback to default message
                            }
                            console.error("Error marking debt as paid:", sMessage);
                            MessageBox.error(sMessage);
                        });
                    }
                }
            });
        },
        
        onSaveDebt: function () {
            var oDebtModel = this.getView().getModel("newDebt");
            var oData = oDebtModel.getData();
            
            // === VALIDATION ===
            if (!oData.amount || oData.amount <= 0) {
                MessageBox.error("Please enter a valid amount");
                return;
            }
            
            if (!oData.dueDate) {
                MessageBox.error("Please select a due date");
                return;
            }
            
            // Set busy state
            this._oDebtDialog.setBusy(true);
            
            var oSupplierService = this.getOwnerComponent().getModel("supplierService");
            var oContext;
            var sSuccessMessage;
            
            if (oData.isEditMode) {
                // === EDIT MODE ===
                oContext = oSupplierService.bindContext("/updateSupplierDebt(...)");
                oContext.setParameter("debtID", oData.ID);
                oContext.setParameter("amount", parseFloat(oData.amount));
                oContext.setParameter("dueDate", oData.dueDate);
                oContext.setParameter("status", oData.status);
                oContext.setParameter("description", oData.description || "");
                sSuccessMessage = "Debt updated successfully";
            } else {
                // === CREATE MODE ===
                // Auto-generate description nếu rỗng
                if (!oData.description || oData.description.trim() === "") {
                    var oSupplierModel = this.getView().getModel("supplier");
                    var sSupplierName = oSupplierModel.getProperty("/SupplierName");
                    oData.description = `Manual debt entry for ${sSupplierName} - Amount: ${oData.amount} USD`;
                }
                
                oContext = oSupplierService.bindContext("/createSupplierDebt(...)");
                oContext.setParameter("supplierID", oData.supplierID);
                oContext.setParameter("amount", parseFloat(oData.amount));
                oContext.setParameter("dueDate", oData.dueDate);
                oContext.setParameter("status", oData.status);
                oContext.setParameter("description", oData.description);
                oContext.setParameter("tourServiceID", null);
                sSuccessMessage = "Debt created successfully";
            }
            
            oContext.execute().then(function () {
                var oResult = oContext.getBoundContext().getObject();
                
                // Clear busy state
                this._oDebtDialog.setBusy(false);
                
                if (oResult && (oResult.ID || oResult.success)) {
                    MessageToast.show(sSuccessMessage);
                    this._oDebtDialog.close();
                    
                    // Reload supplier details
                    var sSupplierID = this.getView().getModel("supplier").getProperty("/ID");
                    this._loadSupplier(sSupplierID);
                } else {
                    MessageBox.error("Failed to save debt");
                }
            }.bind(this)).catch(function (oError) {
                // Clear busy state
                this._oDebtDialog.setBusy(false);
                
                var sMessage = "Failed to save debt!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                }
                console.error("Error saving debt:", sMessage);
                MessageBox.error(sMessage);
            }.bind(this));
        },

        onEditDebt: function (oEvent) {
            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext("debts");
            var oDebt = oContext.getObject();
            
            // Hiển thị dialog để edit debt
            if (!this._oDebtDialog) {
                this._oDebtDialog = sap.ui.xmlfragment("tourishui.view.fragments.DebtDialog", this);
                this.getView().addDependent(this._oDebtDialog);
            }
            
            // Set model với data hiện tại
            var oDebtModel = new JSONModel({
                ID: oDebt.ID,
                supplierID: oDebt.SupplierID,
                amount: oDebt.Amount,
                dueDate: new Date(oDebt.DueDate),
                status: oDebt.Status,
                description: oDebt.Description || "", // === INCLUDE DESCRIPTION ===
                isEditMode: true
            });
            this.getView().setModel(oDebtModel, "newDebt");
            
            // Cài đặt tiêu đề cho edit mode
            sap.ui.getCore().byId("debtDialogTitle").setText("Edit Debt");
            
            // Disable amount editing nếu là auto-generated debt
            var oAmountInput = sap.ui.getCore().byId("debtAmountInput");
            var oDescriptionTextArea = sap.ui.getCore().byId("debtDescriptionTextArea");
            
            if (oDebt.TourServiceID) {
                oAmountInput.setEnabled(false);
                oAmountInput.setTooltip("Amount cannot be changed for auto-generated debts");
                oDescriptionTextArea.setEnabled(false);
                oDescriptionTextArea.setTooltip("Description cannot be changed for auto-generated debts");
            } else {
                oAmountInput.setEnabled(true);
                oAmountInput.setTooltip("");
                oDescriptionTextArea.setEnabled(true);
                oDescriptionTextArea.setTooltip("");
            }
            
            // Mở dialog
            this._oDebtDialog.open();
        },
        
        _validateDebtForm: function () {
            var oDebtModel = this.getView().getModel("newDebt");
            var oDebtData = oDebtModel.getData();
            
            // Validate amount
            if (isNaN(oDebtData.amount) || oDebtData.amount <= 0) {
                MessageBox.error("Amount must be a valid number greater than 0");
                return false;
            }
            
            // Validate due date
            if (!oDebtData.dueDate) {
                MessageBox.error("Due Date is required");
                return false;
            }
            
            return true;
        },
        
        _createDebt: function (oDebtData) {
            var that = this;
            
            // Format date object to string
            var sDueDate = "";
            if (oDebtData.dueDate instanceof Date) {
                sDueDate = oDebtData.dueDate.toISOString().split('T')[0];
            } else {
                sDueDate = oDebtData.dueDate;
            }
            
            // Gọi action createSupplierDebt
            var oCreateContext = this._oODataModel.bindContext("/createSupplierDebt(...)");
            oCreateContext.setParameter("supplierID", oDebtData.supplierID);
            oCreateContext.setParameter("amount", oDebtData.amount);
            oCreateContext.setParameter("dueDate", sDueDate);
            oCreateContext.setParameter("status", oDebtData.status);
            
            oCreateContext.execute().then(function () {
                var oResult = oCreateContext.getBoundContext().getObject();
                console.log("Debt created:", oResult);
                
                // Tắt busy indicator
                sap.ui.core.BusyIndicator.hide();
                
                // Hiển thị thông báo
                MessageToast.show("Debt created successfully");
                
                // Đóng dialog
                that._oDebtDialog.close();
                
                // Reload supplier details
                that._loadSupplier(that.getView().getModel("supplier").getProperty("/ID"));
            }).catch(function (oError) {
                // Tắt busy indicator
                sap.ui.core.BusyIndicator.hide();
                
                var sMessage = "Failed to create debt!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                }
                console.error("Error creating debt:", sMessage);
                MessageBox.error(sMessage);
            });
        },
        
        onCancelDebt: function () {
            // Đóng dialog
            this._oDebtDialog.close();
        },
        
        // Hàm định dạng ngày
        formatDate: function (oDate) {
            if (!oDate) {
                return "";
            }
            
            // Nếu là chuỗi ISO, chuyển thành đối tượng Date
            if (typeof oDate === "string") {
                oDate = new Date(oDate);
            }
            
            // Định dạng ngày tháng
            var oDateFormat = DateFormat.getDateInstance({
                pattern: "dd/MM/yyyy"
            });
            
            return oDateFormat.format(oDate);
        },


formatDebtSource: function(sTourServiceID) {
    return sTourServiceID ? "Auto-Generated" : "Manual";
},

formatDebtSourceState: function(sTourServiceID) {
    return sTourServiceID ? "Success" : "Information";
},

formatDebtStatus: function(sStatus) {
    switch(sStatus) {
        case "Pending":
            return "Pending Payment";
        case "Completed":
            return "Paid";
        default:
            return sStatus || "Unknown";
    }
},

formatDebtState: function(sStatus) {
    switch(sStatus) {
        case "Pending":
            return "Warning";
        case "Completed":
            return "Success";
        default:
            return "None";
    }
},

// === FILTER METHODS ===
onShowAllDebts: function() {
    this._filterDebts(null);
    this._updateFilterButtonStates("showAllDebtsBtn");
},

onShowAutoGeneratedDebts: function() {
    var oFilter = new sap.ui.model.Filter("TourServiceID", sap.ui.model.FilterOperator.NE, null);
    this._filterDebts([oFilter]);
    this._updateFilterButtonStates("showAutoDebtsBtn");
},

onShowManualDebts: function() {
    var oFilter = new sap.ui.model.Filter("TourServiceID", sap.ui.model.FilterOperator.EQ, null);
    this._filterDebts([oFilter]);
    this._updateFilterButtonStates("showManualDebtsBtn");
},

onShowPendingDebts: function() {
    var oFilter = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, "Pending");
    this._filterDebts([oFilter]);
    this._updateFilterButtonStates("showPendingDebtsBtn");
},

_filterDebts: function(aFilters) {
    var oTable = this.byId("debtsTable");
    var oBinding = oTable.getBinding("items");
    oBinding.filter(aFilters || []);
},

_updateFilterButtonStates: function(sActiveButtonId) {
    // Reset all button states
    var aButtonIds = ["showAllDebtsBtn", "showAutoDebtsBtn", "showManualDebtsBtn", "showPendingDebtsBtn"];
    aButtonIds.forEach(function(sId) {
        var oButton = this.byId(sId);
        if (oButton) {
            oButton.setType(sId === sActiveButtonId ? "Emphasized" : "Transparent");
        }
    }.bind(this));
},

// === ENHANCED DELETE DEBT METHOD ===
onDeleteDebt: function(oEvent) {
    var oButton = oEvent.getSource();
    var oContext = oButton.getBindingContext("debts");
    var oDebt = oContext.getObject();
    
    var sConfirmMessage = "Are you sure you want to delete this debt?";
    if (oDebt.TourServiceID) {
        sConfirmMessage += "\n\nNote: This is an auto-generated debt from a tour service.";
    }
    
    MessageBox.confirm(sConfirmMessage, {
        title: "Confirm Delete",
        onClose: function(sAction) {
            if (sAction === MessageBox.Action.OK) {
                this._deleteDebt(oDebt.ID);
            }
        }.bind(this)
    });
},

_deleteDebt: function(sDebtId) {
    var oSupplierService = this.getOwnerComponent().getModel("supplierService");
    var oContext = oSupplierService.bindContext("/deleteSupplierDebt(...)");
    oContext.setParameter("debtID", sDebtId);
    
    oContext.execute().then(function() {
        MessageToast.show("Debt deleted successfully");
        // Reload supplier details
        var sSupplierID = this.getView().getModel("supplier").getProperty("/ID");
        this._loadSupplier(sSupplierID);
    }.bind(this)).catch(function(oError) {
        var sMessage = "Failed to delete debt!";
        try {
            var oResponse = JSON.parse(oError.responseText);
            sMessage = oResponse.error.message || sMessage;
        } catch (e) {
            // Fallback to default message
        }
        console.error("Error deleting debt:", sMessage);
        MessageBox.error(sMessage);
    });
}
    });
});