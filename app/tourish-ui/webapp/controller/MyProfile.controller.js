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
            this._loadWorkspaceInfo();
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

        _loadWorkspaceInfo: function () {
            var oAuthModel = this.getOwnerComponent().getModel("auth");
            var oODataModel = this.getOwnerComponent().getModel("userService");
            var sWorkspaceId = oAuthModel.getProperty("/user/WorkspaceID");

            // Only load workspace info if user has a workspace
            if (!sWorkspaceId) {
                console.log("User has no workspace assigned");
                return;
            }

            // Call getWorkspaceInfo action
            var oInfoContext = oODataModel.bindContext("/getWorkspaceInfo(...)");
            oInfoContext.execute().then(function () {
                var oWorkspace = oInfoContext.getBoundContext().getObject();
                console.log("Workspace info loaded:", oWorkspace);
                
                // Store workspace info in auth model
                oAuthModel.setProperty("/workspace", oWorkspace);
                
            }.bind(this)).catch(function (oError) {
                var sMessage = "Cannot load workspace information!";
                try {
                    if (oError.responseText) {
                        var oResponse = JSON.parse(oError.responseText);
                        sMessage = oResponse.error?.message || sMessage;
                    }
                } catch (e) {
                    // Fallback to default message
                }
                console.error("Error loading workspace info:", sMessage);
                MessageBox.warning("Could not load workspace information: " + sMessage);
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
                    MessageBox.error(oResult.message || "Failed to update profile!");
                }
            }.bind(this)).catch(function (oError) {
                var sMessage = "Failed to update profile!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                }
                console.error("Error updating profile:", sMessage);
                MessageBox.error(sMessage);
            }.bind(this));
        },

        onChangePasswordPress: function () {
            if (!this._oPasswordDialog) {
                this._oPasswordDialog = new Dialog({
                    title: "Change Password",
                    content: new VBox({
                        items: [
                            new Label({ text: "Current Password:", required: true }),
                            new Input({
                                id: "currentPasswordInput",
                                type: "Password",
                                placeholder: "Enter current password...",
                                width: "100%"
                            }),
                            new Label({ text: "New Password:", required: true, class: "sapUiSmallMarginTop" }),
                            new Input({
                                id: "newPasswordInput",
                                type: "Password",
                                placeholder: "Enter new password...",
                                width: "100%"
                            }),
                            new Label({ text: "Confirm New Password:", required: true, class: "sapUiSmallMarginTop" }),
                            new Input({
                                id: "confirmPasswordInput",
                                type: "Password",
                                placeholder: "Confirm new password...",
                                width: "100%"
                            })
                        ],
                        width: "300px"
                    }),
                    beginButton: new Button({
                        text: "Change Password",
                        type: "Emphasized",
                        press: this._onConfirmPasswordChange.bind(this)
                    }),
                    endButton: new Button({
                        text: "Cancel",
                        press: function () {
                            this._oPasswordDialog.close();
                        }.bind(this)
                    })
                });
                this.getView().addDependent(this._oPasswordDialog);
            }

            // Clear previous values
            sap.ui.getCore().byId("currentPasswordInput").setValue("");
            sap.ui.getCore().byId("newPasswordInput").setValue("");
            sap.ui.getCore().byId("confirmPasswordInput").setValue("");

            this._oPasswordDialog.open();
        },

        _onConfirmPasswordChange: function () {
            var sCurrentPassword = sap.ui.getCore().byId("currentPasswordInput").getValue();
            var sNewPassword = sap.ui.getCore().byId("newPasswordInput").getValue();
            var sConfirmPassword = sap.ui.getCore().byId("confirmPasswordInput").getValue();

            // Validation
            if (!sCurrentPassword || !sNewPassword || !sConfirmPassword) {
                MessageBox.error("Please fill in all password fields!");
                return;
            }

            if (sNewPassword !== sConfirmPassword) {
                MessageBox.error("New passwords do not match!");
                return;
            }

            if (sNewPassword.length < 6) {
                MessageBox.error("New password must be at least 6 characters long!");
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
                    this._oPasswordDialog.close();
                } else {
                    MessageBox.error(oResult.message || "Failed to change password!");
                }
            }.bind(this)).catch(function (oError) {
                var sMessage = "Failed to change password!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                }
                console.error("Error changing password:", sMessage);
                MessageBox.error(sMessage);
            }.bind(this));
        },

        // Validation functions
        _validateFullName: function (sFullName) {
            if (!sFullName || sFullName.length < 2) {
                return { valid: false, message: "Full name must be at least 2 characters long." };
            }
            if (sFullName.length > 100) {
                return { valid: false, message: "Full name cannot exceed 100 characters." };
            }
            if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(sFullName)) {
                return { valid: false, message: "Full name can only contain letters and spaces." };
            }
            return { valid: true };
        },

        _validateEmail: function (sEmail) {
            if (!sEmail) {
                return { valid: false, message: "Email is required." };
            }
            if (sEmail.length > 100) {
                return { valid: false, message: "Email cannot exceed 100 characters." };
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sEmail)) {
                return { valid: false, message: "Please enter a valid email address." };
            }
            return { valid: true };
        },

        _validatePhone: function (sPhone) {
            if (!sPhone) {
                return { valid: false, message: "Phone number is required." };
            }
            if (sPhone.length > 20) {
                return { valid: false, message: "Phone number cannot exceed 20 characters." };
            }
            // Allow Vietnamese phone numbers (with or without country code)
            const phoneRegex = /^(\+84|84|0)?[1-9][0-9]{8,9}$/;
            if (!phoneRegex.test(sPhone.replace(/[\s\-\.]/g, ''))) {
                return { valid: false, message: "Please enter a valid Vietnamese phone number." };
            }
            return { valid: true };
        }
    });
});