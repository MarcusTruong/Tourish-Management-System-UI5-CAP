sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/VBox"
], function (Controller, MessageBox, ODataModel, Dialog, Button, Label, Input, VBox) {
    "use strict";

    return Controller.extend("tourishui.controller.MyProfile", {
        onInit: function () {
            // Load user profile when view is initialized
            this._loadUserProfile();
        },

        _loadUserProfile: function () {
            var oView = this.getView();
            var oAuthModel = this.getOwnerComponent().getModel("auth");
            var oODataModel = this.getOwnerComponent().getModel();
            var sUserId = oAuthModel.getProperty("/user/ID");

            // Check if user data exists in auth model
            if (!sUserId) {
                console.error("No user ID found in auth model");
                this.getOwnerComponent().getRouter().navTo("login", {}, true);
                return;
            }

            // Bind to Users entity using OData V4
            var oContext = oODataModel.bindContext("/Users('" + sUserId + "')");
            oContext.requestObject().then(function (oData) {
                console.log("User profile loaded:", oData);
                oAuthModel.setData({ user: oData }, true);
                oView.byId("fullNameInput0").setValue(oData.FullName);
                oView.byId("emailInput0").setValue(oData.Email);
                oView.byId("phoneInput0").setValue(oData.Phone);
            }.bind(this)).catch(function (oError) {
                var sMessage = "Không thể tải thông tin người dùng!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                }
                console.error("Error loading user profile:", sMessage);
                MessageBox.error(sMessage);
                this.getOwnerComponent().getRouter().navTo("login", {}, true);
            }.bind(this));
        },

        onUpdateProfilePress: function () {
            var oView = this.getView();
            var oODataModel = this.getOwnerComponent().getModel();
            var oAuthModel = this.getOwnerComponent().getModel("auth");

            var oUpdatedData = {
                fullName: oView.byId("fullNameInput0").getValue(),
                email: oView.byId("emailInput0").getValue(),
                phone: oView.byId("phoneInput0").getValue()
            };

            // Validate input
            if (!oUpdatedData.fullName || !oUpdatedData.email) {
                MessageBox.error("Vui lòng nhập đầy đủ họ tên và email!");
                return;
            }

            // Validate email format
            if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(oUpdatedData.email)) {
                MessageBox.error("Email không hợp lệ!");
                return;
            }

            // Call updateUserProfile action
            var oContext = oODataModel.bindContext("/updateUserProfile(...)");
            oContext.setParameter("fullName", oUpdatedData.fullName);
            oContext.setParameter("email", oUpdatedData.email);
            oContext.setParameter("phone", oUpdatedData.phone);

            oContext.execute().then(function () {
                var oResult = oContext.getBoundContext().getObject();
                console.log(oResult);
                if (oResult.success) {
                    // Update auth model
                    oAuthModel.setProperty("/user/FullName", oUpdatedData.fullName);
                    oAuthModel.setProperty("/user/Email", oUpdatedData.email);
                    oAuthModel.setProperty("/user/Phone", oUpdatedData.phone);
                    MessageBox.success("Cập nhật thông tin thành công!");
                } else {
                    MessageBox.error("Cập nhật thất bại: " + (oResult.message || "Lỗi không xác định"));
                }
            }.bind(this)).catch(function (oError) {
                var sMessage = "Cập nhật thất bại!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                }
                MessageBox.error(sMessage);
            });
        },

        onChangePasswordPress: function () {
            var oView = this.getView();
        
            // Tạo các control và lưu biến tham chiếu
            var oCurrentInput = new Input({ type: "Password", placeholder: "Nhập mật khẩu hiện tại" });
            var oNewInput = new Input({ type: "Password", placeholder: "Nhập mật khẩu mới" });
            var oConfirmInput = new Input({ type: "Password", placeholder: "Xác nhận mật khẩu mới" });
        
            var oDialog = new Dialog({
                title: "Đổi mật khẩu",
                type: "Message",
                content: new VBox({
                    items: [
                        new Label({ text: "Mật khẩu hiện tại", required: true }),
                        oCurrentInput,
                        new Label({ text: "Mật khẩu mới", required: true }),
                        oNewInput,
                        new Label({ text: "Xác nhận mật khẩu mới", required: true }),
                        oConfirmInput
                    ]
                }),
                beginButton: new Button({
                    text: "Gửi",
                    type: "Emphasized",
                    press: function () {
                        var sCurrentPassword = oCurrentInput.getValue();
                        var sNewPassword = oNewInput.getValue();
                        var sConfirmPassword = oConfirmInput.getValue();
        
                        // Validation và gọi OData như cũ...
                        if (!sCurrentPassword || !sNewPassword || !sConfirmPassword) {
                            MessageBox.error("Vui lòng nhập đầy đủ các trường!");
                            return;
                        }
        
                        if (sNewPassword !== sConfirmPassword) {
                            MessageBox.error("Mật khẩu mới và xác nhận mật khẩu không khớp!");
                            return;
                        }
        
                        if (sNewPassword.length < 8 || !/[A-Z]/.test(sNewPassword) || !/[a-z]/.test(sNewPassword) || !/[0-9]/.test(sNewPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(sNewPassword)) {
                            MessageBox.error("Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt!");
                            return;
                        }
        
                        var oODataModel = this.getOwnerComponent().getModel();
                        var oContext = oODataModel.bindContext("/changePassword(...)");
                        oContext.setParameter("currentPassword", sCurrentPassword);
                        oContext.setParameter("newPassword", sNewPassword);
        
                        oContext.execute().then(function () {
                            var oResult = oContext.getBoundContext().getObject();
                            if (oResult.success) {
                                MessageBox.success("Đổi mật khẩu thành công!");
                                oDialog.close();
                            } else {
                                MessageBox.error("Đổi mật khẩu thất bại: " + (oResult.message || "Lỗi không xác định"));
                            }
                        }.bind(this)).catch(function (oError) {
                            var sMessage = "Đổi mật khẩu thất bại!";
                            try {
                                var oResponse = JSON.parse(oError.responseText);
                                sMessage = oResponse.error.message || sMessage;
                            } catch (e) { }
                            MessageBox.error(sMessage);
                        });
        
                    }.bind(this)
                }),
                endButton: new Button({
                    text: "Hủy",
                    press: function () {
                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });
        
            oView.addDependent(oDialog);
            oDialog.open();
        }
        
    });
});