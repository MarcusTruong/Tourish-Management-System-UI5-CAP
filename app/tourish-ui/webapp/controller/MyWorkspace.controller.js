sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/VBox",
    "sap/m/Select",
    "sap/ui/core/Item",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator"
], function (Controller, MessageBox, ODataModel, Dialog, Button, Label, Input, VBox, Select, Item, MessageToast, JSONModel, BusyIndicator) {
    "use strict";

    return Controller.extend("tourishui.controller.MyWorkspace", {
        onInit: function () {
            // Initialize view model
            var oViewModel = new JSONModel({
                headerExpanded: true,
                busy: false
            });
            this.getView().setModel(oViewModel);

            // Initialize users model with empty array
            var oWorkspaceMembersModel = new JSONModel({
                workspaceMembers: [],
                busy: true
            });
            this.getView().setModel(oWorkspaceMembersModel);
            
            // Load workspace info if WorkspaceID exists
            this._loadWorkspaceInfo();
        },

        _loadWorkspaceInfo: function () {
            var oView = this.getView();
            var oViewModel = oView.getModel();
            var oAuthModel = this.getOwnerComponent().getModel("auth");
            var oODataModel = this.getOwnerComponent().getModel();
            var sWorkspaceId = oAuthModel.getProperty("/user/WorkspaceID");

            oViewModel.setProperty("/busy", true);

            if (!sWorkspaceId) {
                // No workspace, show create workspace UI
                oViewModel.setProperty("/busy", false);
                return;
            }

            // Load workspace info using getWorkspaceInfo action
            var oInfoContext = oODataModel.bindContext("/getWorkspaceInfo(...)");
            oInfoContext.execute().then(function () {
                var oWorkspace = oInfoContext.getBoundContext().getObject();
                console.log("Workspace info loaded:", oWorkspace);
                oAuthModel.setProperty("/workspace", oWorkspace);
                
                // After loading workspace info, load workspace members
                this._loadWorkspaceMembers();
            }.bind(this)).catch(function (oError) {
                oViewModel.setProperty("/busy", false);
                var sMessage = "Cannot load workspace information!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                }
                console.error("Error loading workspace info:", sMessage);
                MessageBox.error(sMessage);
            });
        },

        _loadWorkspaceMembers: function() {
            var oView = this.getView();
            var oViewModel = oView.getModel();
            var oODataModel = this.getOwnerComponent().getModel();
            
            // Load workspace members using getWorkspaceMembers action
            var oMembersContext = oODataModel.bindContext("/getWorkspaceMembers(...)");
            oMembersContext.execute().then(function () {
                var aMembers = oMembersContext.getBoundContext().getObject();
                console.log("Workspace members loaded:", aMembers);
                
                // Update the model with the members
                var oModel = oView.getModel();
                oModel.setProperty("/workspaceMembers", aMembers.value);
                oViewModel.setProperty("/busy", false);
            }.bind(this)).catch(function (oError) {
                oViewModel.setProperty("/busy", false);
                var sMessage = "Cannot load workspace members!";
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    sMessage = oResponse.error.message || sMessage;
                } catch (e) {
                    // Fallback to default message
                }
                console.error("Error loading workspace members:", sMessage);
                MessageBox.error(sMessage);
            });
        },

        onCreateWorkspacePress: function () {
            var oView = this.getView();
            
            // Create inputs and save references to them
            var oCompanyNameInput = new Input({ id: this.createId("companyNameInput"), placeholder: "Enter your Company Name" });
            var oAddressInput = new Input({ id: this.createId("addressInput"), placeholder: "Enter your Address" });
            var oPhoneInput = new Input({ id: this.createId("phoneInput"), type: "Tel", placeholder: "Enter your Phone number" });
            var oEmailInput = new Input({ id: this.createId("emailInput"), type: "Email", placeholder: "Enter your Email" });
            
            var oDialog = new Dialog({
                title: "Create Workspace",
                type: "Message",
                content: new VBox({
                    items: [
                        new Label({ text: "Company Name", required: true }),
                        oCompanyNameInput,
                        new Label({ text: "Address", required: true }),
                        oAddressInput,
                        new Label({ text: "Phone", required: true }),
                        oPhoneInput,
                        new Label({ text: "Email", required: true }),
                        oEmailInput
                    ]
                }).addStyleClass("sapUiSmallMargin"),
                beginButton: new Button({
                    text: "Submit",
                    type: "Emphasized",
                    press: function () {
                        var oViewModel = oView.getModel();
                        var oODataModel = this.getOwnerComponent().getModel();
                        var oAuthModel = this.getOwnerComponent().getModel("auth");
        
                        var oWorkspaceData = {
                            companyName: oCompanyNameInput.getValue(),
                            address: oAddressInput.getValue(),
                            phone: oPhoneInput.getValue(),
                            email: oEmailInput.getValue()
                        };
        
                        // Validate input
                        if (!oWorkspaceData.companyName || !oWorkspaceData.address || !oWorkspaceData.phone || !oWorkspaceData.email) {
                            MessageBox.error("Please fill in all fields!");
                            return;
                        }
        
                        // Validate email format
                        if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(oWorkspaceData.email)) {
                            MessageBox.error("Invalid email format!");
                            return;
                        }
        
                        oViewModel.setProperty("/busy", true);
                        
                        // Call createWorkspace action
                        var oContext = oODataModel.bindContext("/createWorkspace(...)");
                        oContext.setParameter("companyName", oWorkspaceData.companyName);
                        oContext.setParameter("address", oWorkspaceData.address);
                        oContext.setParameter("phone", oWorkspaceData.phone);
                        oContext.setParameter("email", oWorkspaceData.email);
        
                        oContext.execute().then(function () {
                            var oResult = oContext.getBoundContext().getObject();
                            console.log("Workspace created:", oResult);
                            oViewModel.setProperty("/busy", false);
                            
                            if (oResult) {
                                // Update auth model with new WorkspaceID
                                oAuthModel.setProperty("/user/WorkspaceID", oResult.ID);
                                oAuthModel.setProperty("/workspace", oResult);
                                MessageBox.success("Workspace created successfully!");
                                oDialog.close();
                                // Reload workspace info to update UI
                                this._loadWorkspaceInfo();
                            } else {
                                MessageBox.error("Failed to update: " + (oResult.message || "Unknown error"));
                            }
                        }.bind(this)).catch(function (oError) {
                            oViewModel.setProperty("/busy", false);
                            var sMessage = "Failed to create workspace!";
                            try {
                                var oResponse = JSON.parse(oError.responseText);
                                sMessage = oResponse.error.message || sMessage;
                            } catch (e) {
                                // Fallback to default message
                            }
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
        },

        onEditWorkspacePress: function() {
            var oView = this.getView();
            var oAuthModel = this.getOwnerComponent().getModel("auth");
            var oWorkspace = oAuthModel.getProperty("/workspace");
            
            if (!oWorkspace) {
                MessageBox.error("No workspace information available to edit.");
                return;
            }
            
            // Create inputs with current values
            var oCompanyNameInput = new Input({ 
                id: this.createId("editCompanyNameInput"), 
                value: oWorkspace.CompanyName,
                placeholder: "Enter your Company Name" 
            });
            var oAddressInput = new Input({ 
                id: this.createId("editAddressInput"), 
                value: oWorkspace.Address,
                placeholder: "Enter your Address" 
            });
            var oPhoneInput = new Input({ 
                id: this.createId("editPhoneInput"), 
                value: oWorkspace.Phone,
                type: "Tel", 
                placeholder: "Enter your Phone number" 
            });
            var oEmailInput = new Input({ 
                id: this.createId("editEmailInput"), 
                value: oWorkspace.Email,
                type: "Email", 
                placeholder: "Enter your Email" 
            });
            
            var oDialog = new Dialog({
                title: "Edit Workspace Information",
                type: "Message",
                content: new VBox({
                    items: [
                        new Label({ text: "Company Name", required: true }),
                        oCompanyNameInput,
                        new Label({ text: "Address", required: true }),
                        oAddressInput,
                        new Label({ text: "Phone", required: true }),
                        oPhoneInput,
                        new Label({ text: "Email", required: true }),
                        oEmailInput
                    ]
                }).addStyleClass("sapUiSmallMargin"),
                beginButton: new Button({
                    text: "Save",
                    type: "Emphasized",
                    press: function () {
                        var oViewModel = oView.getModel();
                        var oODataModel = this.getOwnerComponent().getModel();
        
                        var oWorkspaceData = {
                            companyName: oCompanyNameInput.getValue(),
                            address: oAddressInput.getValue(),
                            phone: oPhoneInput.getValue(),
                            email: oEmailInput.getValue()
                        };
        
                        // Validate input
                        if (!oWorkspaceData.companyName || !oWorkspaceData.address || !oWorkspaceData.phone || !oWorkspaceData.email) {
                            MessageBox.error("Please fill in all fields!");
                            return;
                        }
        
                        // Validate email format
                        if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(oWorkspaceData.email)) {
                            MessageBox.error("Invalid email format!");
                            return;
                        }
        
                        oViewModel.setProperty("/busy", true);
                        
                        // Call updateWorkspaceInfo action
                        var oContext = oODataModel.bindContext("/updateWorkspaceInfo(...)");
                        oContext.setParameter("companyName", oWorkspaceData.companyName);
                        oContext.setParameter("address", oWorkspaceData.address);
                        oContext.setParameter("phone", oWorkspaceData.phone);
                        oContext.setParameter("email", oWorkspaceData.email);
        
                        oContext.execute().then(function () {
                            var oResult = oContext.getBoundContext().getObject();
                            oViewModel.setProperty("/busy", false);
                            
                            if (oResult && oResult.success) {
                                MessageBox.success("Workspace information updated successfully!");
                                oDialog.close();
                                // Reload workspace info to update UI
                                this._loadWorkspaceInfo();
                            } else {
                                MessageBox.error("Failed to update: " + (oResult.message || "Unknown error"));
                            }
                        }.bind(this)).catch(function (oError) {
                            oViewModel.setProperty("/busy", false);
                            var sMessage = "Failed to update workspace information!";
                            try {
                                var oResponse = JSON.parse(oError.responseText);
                                sMessage = oResponse.error.message || sMessage;
                            } catch (e) {
                                // Fallback to default message
                            }
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
        },

        onAddUserPress: function() {
            var oView = this.getView();
            
            // Create inputs
            var oUsernameInput = new Input({ id: this.createId("usernameInput"), placeholder: "Enter Username" });
            var oPasswordInput = new Input({ id: this.createId("passwordInput"), type: "Password", placeholder: "Enter Password" });
            var oFullNameInput = new Input({ id: this.createId("fullNameInput"), placeholder: "Enter Full Name" });
            var oEmailInput = new Input({ id: this.createId("userEmailInput"), type: "Email", placeholder: "Enter Email" });
            var oPhoneInput = new Input({ id: this.createId("userPhoneInput"), type: "Tel", placeholder: "Enter Phone" });
            
            // Create role dropdown
            var oRoleSelect = new Select({ id: this.createId("roleSelect") });
            oRoleSelect.addItem(new Item({ key: "Staff", text: "Staff" }));
            oRoleSelect.addItem(new Item({ key: "Admin", text: "Admin" }));
            oRoleSelect.setSelectedKey("User");
            
            var oDialog = new Dialog({
                title: "Add User",
                type: "Message",
                content: new VBox({
                    items: [
                        new Label({ text: "Username", required: true }),
                        oUsernameInput,
                        new Label({ text: "Password", required: true }),
                        oPasswordInput,
                        new Label({ text: "Full Name", required: true }),
                        oFullNameInput,
                        new Label({ text: "Email", required: true }),
                        oEmailInput,
                        new Label({ text: "Phone", required: true }),
                        oPhoneInput,
                        new Label({ text: "Role", required: true }),
                        oRoleSelect
                    ]
                }).addStyleClass("sapUiSmallMargin"),
                beginButton: new Button({
                    text: "Add",
                    type: "Emphasized",
                    press: function () {
                        var oViewModel = oView.getModel();
                        var oODataModel = this.getOwnerComponent().getModel();
        
                        var oUserData = {
                            username: oUsernameInput.getValue(),
                            password: oPasswordInput.getValue(),
                            fullName: oFullNameInput.getValue(),
                            email: oEmailInput.getValue(),
                            phone: oPhoneInput.getValue(),
                            role: oRoleSelect.getSelectedKey()
                        };
        
                        // Validate input
                        if (!oUserData.username || !oUserData.password || !oUserData.fullName || 
                            !oUserData.email || !oUserData.phone) {
                            MessageBox.error("Please fill in all fields!");
                            return;
                        }
        
                        // Validate email format
                        if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(oUserData.email)) {
                            MessageBox.error("Invalid email format!");
                            return;
                        }
        
                        oViewModel.setProperty("/busy", true);
                        
                        // Call addUser action
                        var oContext = oODataModel.bindContext("/addUser(...)");
                        oContext.setParameter("username", oUserData.username);
                        oContext.setParameter("password", oUserData.password);
                        oContext.setParameter("fullName", oUserData.fullName);
                        oContext.setParameter("email", oUserData.email);
                        oContext.setParameter("phone", oUserData.phone);
                        oContext.setParameter("role", oUserData.role);
        
                        oContext.execute().then(function () {
                            var oResult = oContext.getBoundContext().getObject();
                            oViewModel.setProperty("/busy", false);
                            console.log(oResult);
                            
                            if (oResult && oResult.ID) {
                                MessageBox.success("User added successfully!");
                                oDialog.close();
                                // Reload workspace members to update the table
                                this._loadWorkspaceMembers();
                            } else {
                                MessageBox.error("Failed to add user: " + (oResult.message || "Unknown error"));
                            }
                        }.bind(this)).catch(function (oError) {
                            oViewModel.setProperty("/busy", false);
                            var sMessage = "Failed to add user!";
                            try {
                                var oResponse = JSON.parse(oError.responseText);
                                sMessage = oResponse.error.message || sMessage;
                            } catch (e) {
                                // Fallback to default message
                            }
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
        },

        onEditUserPress: function(oEvent) {
            var oView = this.getView();
            var oBindingContext = oEvent.getSource().getBindingContext();
            var oUser = oBindingContext.getObject();
            var sPath = oBindingContext.getPath();
            
            // Log user object to verify data
            console.log("User data:", oUser);
            
            // Check if user data is valid
            if (!oUser || !oUser.Username || !oUser.Role) {
                MessageBox.error("Invalid user data. Unable to edit user role.");
                return;
            }
            
            // Use Label instead of Text for static display
            var oUsernameLabel = new Label({ 
                text: oUser.Username || "N/A",
                design: "Bold"
            });
            
            var oCurrentRoleLabel = new Label({ 
                text: oUser.Role || "N/A",
                design: "Bold"
            });
            
            // Create role dropdown
            var oRoleSelect = new Select({ id: this.createId("editRoleSelect") });
            oRoleSelect.addItem(new Item({ key: "Staff", text: "Staff" }));
            oRoleSelect.addItem(new Item({ key: "Admin", text: "Admin" }));
            oRoleSelect.setSelectedKey(oUser.Role || "Staff");
            
            var oDialog = new Dialog({
                title: "Edit User Role",
                type: "Message",
                content: new VBox({
                    items: [
                        new Label({ text: "Username", required: false }),
                        oUsernameLabel,
                        new Label({ text: "Current Role", required: false }),
                        oCurrentRoleLabel,
                        new Label({ text: "New Role", required: true }),
                        oRoleSelect
                    ],
                    spacing: "0.5rem"
                }).addStyleClass("sapUiSmallMargin"),
                beginButton: new Button({
                    text: "Save",
                    type: "Emphasized",
                    press: function () {
                        var oViewModel = oView.getModel();
                        var oODataModel = this.getOwnerComponent().getModel();
                        var sNewRole = oRoleSelect.getSelectedKey();
                        
                        // If role didn't change, just close dialog
                        if (sNewRole === oUser.Role) {
                            MessageToast.show("No changes made to user role.");
                            oDialog.close();
                            return;
                        }
                        
                        oViewModel.setProperty("/busy", true);
                        
                        // Call updateUserPermissions action
                        var oContext = oODataModel.bindContext("/updateUserPermissions(...)");
                        oContext.setParameter("userID", oUser.ID);
                        oContext.setParameter("role", sNewRole);
        
                        oContext.execute().then(function () {
                            var oResult = oContext.getBoundContext().getObject();
                            oViewModel.setProperty("/busy", false);
                            
                            if (oResult && oResult.ID) {
                                MessageBox.success("User role updated successfully!");
                                oDialog.close();
                                // Update the local model
                                var oModel = oView.getModel();
                                oModel.setProperty(sPath + "/Role", sNewRole);
                            } else {
                                MessageBox.error("Failed to update user role: " + (oResult.message || "Unknown error"));
                            }
                        }.bind(this)).catch(function (oError) {
                            oViewModel.setProperty("/busy", false);
                            var sMessage = "Failed to update user role!";
                            try {
                                var oResponse = JSON.parse(oError.responseText);
                                sMessage = oResponse.error.message || sMessage;
                            } catch (e) {
                                // Fallback to default message
                            }
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
        },

        onToggleUserStatusPress: function(oEvent) {
            var oView = this.getView();
            var oViewModel = oView.getModel();
            var oBindingContext = oEvent.getSource().getBindingContext();
            var oUser = oBindingContext.getObject();
            var sPath = oBindingContext.getPath();
            var sNewStatus = oUser.Status === "Active" ? "Inactive" : "Active";
            var sConfirmMessage = oUser.Status === "Active" 
                ? "Are you sure you want to deactivate this user?" 
                : "Are you sure you want to activate this user?";
            
            MessageBox.confirm(sConfirmMessage, {
                title: "Confirm Status Change",
                onClose: function(sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    
                    oViewModel.setProperty("/busy", true);
                    
                    var oODataModel = this.getOwnerComponent().getModel();
                    var oContext = oODataModel.bindContext("/updateUserStatus(...)");
                    oContext.setParameter("userID", oUser.ID);
                    oContext.setParameter("status", sNewStatus);
    
                    oContext.execute().then(function () {
                        var oResult = oContext.getBoundContext().getObject();
                        oViewModel.setProperty("/busy", false);
                        
                        if (oResult && oResult.success) {
                            MessageToast.show("User status updated successfully!");
                            // Update the local model
                            var oModel = oView.getModel();
                            oModel.setProperty(sPath + "/Status", sNewStatus);
                        } else {
                            MessageBox.error("Failed to update user status: " + (oResult.message || "Unknown error"));
                        }
                    }).catch(function (oError) {
                        oViewModel.setProperty("/busy", false);
                        var sMessage = "Failed to update user status!";
                        try {
                            var oResponse = JSON.parse(oError.responseText);
                            sMessage = oResponse.error.message || sMessage;
                        } catch (e) {
                            // Fallback to default message
                        }
                        MessageBox.error(sMessage);
                    });
                }.bind(this)
            });
        },

        onRemoveUserPress: function(oEvent) {
            var oView = this.getView();
            var oViewModel = oView.getModel();
            var oBindingContext = oEvent.getSource().getBindingContext();
            var oUser = oBindingContext.getObject();
            
            MessageBox.confirm("Are you sure you want to remove this user from the workspace?", {
                title: "Confirm User Removal",
                onClose: function(sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    
                    oViewModel.setProperty("/busy", true);
                    
                    var oODataModel = this.getOwnerComponent().getModel();
                    var oContext = oODataModel.bindContext("/removeUserFromWorkspace(...)");
                    oContext.setParameter("userID", oUser.ID);
    
                    oContext.execute().then(function () {
                        var oResult = oContext.getBoundContext().getObject();
                        oViewModel.setProperty("/busy", false);
                        
                        if (oResult && oResult.success) {
                            MessageBox.success("User removed successfully!");
                            // Reload workspace members to update the table
                            this._loadWorkspaceMembers();
                        } else {
                            MessageBox.error("Failed to remove user: " + (oResult.message || "Unknown error"));
                        }
                    }.bind(this)).catch(function (oError) {
                        oViewModel.setProperty("/busy", false);
                        var sMessage = "Failed to remove user!";
                        try {
                            var oResponse = JSON.parse(oError.responseText);
                            sMessage = oResponse.error.message || sMessage;
                        } catch (e) {
                            // Fallback to default message
                        }
                        MessageBox.error(sMessage);
                    });
                }.bind(this)
            });
        }
    });
});