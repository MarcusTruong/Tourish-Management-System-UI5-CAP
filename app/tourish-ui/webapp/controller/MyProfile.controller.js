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
            var oODataModel = this.getOwnerComponent().getModel("userService");
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
            var oODataModel = this.getOwnerComponent().getModel("userService");
            var oAuthModel = this.getOwnerComponent().getModel("auth");
        
            var oUpdatedData = {
                fullName: oView.byId("fullNameInput0").getValue().trim(),
                email: oView.byId("emailInput0").getValue().trim().toLowerCase(),
                phone: oView.byId("phoneInput0").getValue().trim()
            };
        
            // Comprehensive validation
            const errors = [];
        
            // Validate full name
            const fullNameValidation = this._validateFullName(oUpdatedData.fullName);
            if (!fullNameValidation.valid) errors.push(fullNameValidation.message);
        
            // Validate email
            const emailValidation = this._validateEmail(oUpdatedData.email);
            if (!emailValidation.valid) errors.push(emailValidation.message);
        
            // Validate phone
            const phoneValidation = this._validatePhone(oUpdatedData.phone);
            if (!phoneValidation.valid) errors.push(phoneValidation.message);
        
            // If there are validation errors, show them all
            if (errors.length > 0) {
                MessageBox.error("Please fix the following errors:\n\n" + errors.join("\n"));
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
                    MessageBox.success("Profile updated successfully!");
                } else {
                    MessageBox.error("Update failed: " + (oResult.message || "Unknown error"));
                }
            }.bind(this)).catch(function (oError) {
                var sMessage = "Update failed!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                }
                MessageBox.error(sMessage);
            });
        },
        
        // Helper validation functions (add these if not already present)
        _validateFullName: function(sFullName) {
            if (!sFullName || sFullName.trim() === "") {
                return { valid: false, message: "Full name is required" };
            }
            
            if (sFullName.trim().length < 2) {
                return { valid: false, message: "Full name must be at least 2 characters long" };
            }
            
            if (sFullName.length > 100) {
                return { valid: false, message: "Full name cannot exceed 100 characters" };
            }
            
            if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(sFullName)) {
                return { valid: false, message: "Full name can only contain letters and spaces" };
            }
            
            if (sFullName.trim().split(/\s+/).length < 2) {
                return { valid: false, message: "Please enter both first and last name" };
            }
            
            return { valid: true };
        },
        
        _validateEmail: function(sEmail) {
            if (!sEmail || sEmail.trim() === "") {
                return { valid: false, message: "Email is required" };
            }
            
            // Comprehensive email regex pattern
            const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            
            if (!emailPattern.test(sEmail.trim())) {
                return { valid: false, message: "Please enter a valid email address" };
            }
            
            // Additional checks
            if (sEmail.length > 254) {
                return { valid: false, message: "Email address is too long" };
            }
            
            // Check for consecutive dots
            if (sEmail.includes("..")) {
                return { valid: false, message: "Email cannot contain consecutive dots" };
            }
            
            return { valid: true };
        },
        
        _validatePhone: function(sPhone) {
            if (!sPhone || sPhone.trim() === "") {
                return { valid: false, message: "Phone number is required" };
            }
            
            // Remove all non-digit characters for validation
            const cleanPhone = sPhone.replace(/\D/g, '');
            
            if (cleanPhone.length < 10) {
                return { valid: false, message: "Phone number must be at least 10 digits" };
            }
            
            if (cleanPhone.length > 15) {
                return { valid: false, message: "Phone number cannot exceed 15 digits" };
            }
            
            // Check for valid phone number format (allows digits, spaces, dashes, plus, parentheses, dots)
            if (!/^[\+]?[\d\s\-\(\)\.]+$/.test(sPhone)) {
                return { valid: false, message: "Phone number contains invalid characters" };
            }
            
            // Check for minimum meaningful digits (not all zeros or ones)
            if (/^[0-1]+$/.test(cleanPhone)) {
                return { valid: false, message: "Please enter a valid phone number" };
            }
            
            return { valid: true };
        },

        onChangePasswordPress: function () {
            var oView = this.getView();
        
            // Tạo các control và lưu biến tham chiếu
            var oCurrentInput = new Input({ type: "Password", placeholder: "Enter current password" });
            var oNewInput = new Input({ type: "Password", placeholder: "Enter new password" });
            var oConfirmInput = new Input({ type: "Password", placeholder: "Confirm new password" });
        
            var oDialog = new Dialog({
                title: "Change Password",
                type: "Message",
                content: new VBox({
                    items: [
                        new Label({ text: "Current password", required: true }),
                        oCurrentInput,
                        new Label({ text: "New password", required: true }),
                        oNewInput,
                        new Label({ text: "Confirm new password", required: true }),
                        oConfirmInput
                    ]
                }),
                beginButton: new Button({
                    text: "Change password",
                    type: "Emphasized",
                    press: function () {
                        var sCurrentPassword = oCurrentInput.getValue();
                        var sNewPassword = oNewInput.getValue();
                        var sConfirmPassword = oConfirmInput.getValue();
        
                        // Validation và gọi OData như cũ...
                        if (!sCurrentPassword || !sNewPassword || !sConfirmPassword) {
                            MessageBox.error("Please fill in all fields!");
                            return;
                        }
        
                        if (sNewPassword !== sConfirmPassword) {
                            MessageBox.error("New password and confirm password do not match!");
                            return;
                        }
        
                        if (sNewPassword.length < 8 || !/[A-Z]/.test(sNewPassword) || !/[a-z]/.test(sNewPassword) || !/[0-9]/.test(sNewPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(sNewPassword)) {
                            MessageBox.error("New password must be at least 8 characters, including uppercase, lowercase, numbers and special characters!");
                            return;
                        }
        
                        var oODataModel = this.getOwnerComponent().getModel("userService");
                        var oContext = oODataModel.bindContext("/changePassword(...)");
                        oContext.setParameter("currentPassword", sCurrentPassword);
                        oContext.setParameter("newPassword", sNewPassword);
        
                        oContext.execute().then(function () {
                            var oResult = oContext.getBoundContext().getObject();
                            if (oResult.success) {
                                MessageBox.success("Password changed successfully!");
                                oDialog.close();
                            } else {
                                MessageBox.error("Password change failed: " + (oResult.message || "Unknown error"));
                            }
                        }.bind(this)).catch(function (oError) {
                            var sMessage = "Password change failed!";
                            try {
                                var oResponse = JSON.parse(oError.responseText);
                                sMessage = oResponse.error.message || sMessage;
                            } catch (e) { }
                            MessageBox.error(sMessage);
                        });
        
                    }.bind(this)
                }),
                endButton: new Button({
                    text: "Cancel",
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