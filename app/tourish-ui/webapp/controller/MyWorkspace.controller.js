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

        // =================================================================================
        // VALIDATION FUNCTIONS
        // =================================================================================

        // Email validation function
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

        // Phone validation function
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

        // Company name validation
        _validateCompanyName: function(sCompanyName) {
            if (!sCompanyName || sCompanyName.trim() === "") {
                return { valid: false, message: "Company name is required" };
            }
            
            if (sCompanyName.trim().length < 2) {
                return { valid: false, message: "Company name must be at least 2 characters long" };
            }
            
            if (sCompanyName.length > 100) {
                return { valid: false, message: "Company name cannot exceed 100 characters" };
            }
            
            return { valid: true };
        },

        // Address validation
        _validateAddress: function(sAddress) {
            if (!sAddress || sAddress.trim() === "") {
                return { valid: false, message: "Address is required" };
            }
            
            if (sAddress.trim().length < 5) {
                return { valid: false, message: "Address must be at least 5 characters long" };
            }
            
            if (sAddress.length > 200) {
                return { valid: false, message: "Address cannot exceed 200 characters" };
            }
            
            return { valid: true };
        },

        // Username validation
        _validateUsername: function(sUsername) {
            if (!sUsername || sUsername.trim() === "") {
                return { valid: false, message: "Username is required" };
            }
            
            if (sUsername.length < 3) {
                return { valid: false, message: "Username must be at least 3 characters long" };
            }
            
            if (sUsername.length > 50) {
                return { valid: false, message: "Username cannot exceed 50 characters" };
            }
            
            if (!/^[a-zA-Z0-9_.-]+$/.test(sUsername)) {
                return { valid: false, message: "Username can only contain letters, numbers, dots, hyphens and underscores" };
            }
            
            return { valid: true };
        },

        // Full name validation
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

        // Password validation
        _validatePassword: function(sPassword) {
            if (!sPassword || sPassword === "") {
                return { valid: false, message: "Password is required" };
            }
            
            if (sPassword.length < 8) {
                return { valid: false, message: "Password must be at least 8 characters long" };
            }
            
            if (sPassword.length > 128) {
                return { valid: false, message: "Password cannot exceed 128 characters" };
            }
            
            // Check for uppercase letter
            if (!/[A-Z]/.test(sPassword)) {
                return { valid: false, message: "Password must contain at least one uppercase letter" };
            }
            
            // Check for lowercase letter
            if (!/[a-z]/.test(sPassword)) {
                return { valid: false, message: "Password must contain at least one lowercase letter" };
            }
            
            // Check for number
            if (!/[0-9]/.test(sPassword)) {
                return { valid: false, message: "Password must contain at least one number" };
            }
            
            // Check for special character
            if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(sPassword)) {
                return { valid: false, message: "Password must contain at least one special character" };
            }
            
            return { valid: true };
        },

        // Comprehensive validation for workspace data
        _validateWorkspaceData: function(oWorkspaceData) {
            const errors = [];
            
            const companyNameValidation = this._validateCompanyName(oWorkspaceData.companyName);
            if (!companyNameValidation.valid) errors.push(companyNameValidation.message);
            
            const addressValidation = this._validateAddress(oWorkspaceData.address);
            if (!addressValidation.valid) errors.push(addressValidation.message);
            
            const phoneValidation = this._validatePhone(oWorkspaceData.phone);
            if (!phoneValidation.valid) errors.push(phoneValidation.message);
            
            const emailValidation = this._validateEmail(oWorkspaceData.email);
            if (!emailValidation.valid) errors.push(emailValidation.message);
            
            return {
                valid: errors.length === 0,
                errors: errors
            };
        },

        // Comprehensive validation for user data
        _validateUserData: function(oUserData) {
            const errors = [];
            
            const usernameValidation = this._validateUsername(oUserData.username);
            if (!usernameValidation.valid) errors.push(usernameValidation.message);
            
            const passwordValidation = this._validatePassword(oUserData.password);
            if (!passwordValidation.valid) errors.push(passwordValidation.message);
            
            const fullNameValidation = this._validateFullName(oUserData.fullName);
            if (!fullNameValidation.valid) errors.push(fullNameValidation.message);
            
            const emailValidation = this._validateEmail(oUserData.email);
            if (!emailValidation.valid) errors.push(emailValidation.message);
            
            const phoneValidation = this._validatePhone(oUserData.phone);
            if (!phoneValidation.valid) errors.push(phoneValidation.message);
            
            return {
                valid: errors.length === 0,
                errors: errors
            };
        },

        // =================================================================================
        // DATA LOADING FUNCTIONS
        // =================================================================================

        _loadWorkspaceInfo: function () {
            var oView = this.getView();
            var oViewModel = oView.getModel();
            var oAuthModel = this.getOwnerComponent().getModel("auth");
            var oODataModel = this.getOwnerComponent().getModel("userService");
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
            var oODataModel = this.getOwnerComponent().getModel("userService");
            
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

        // =================================================================================
        // EVENT HANDLERS WITH VALIDATION
        // =================================================================================

        onCreateWorkspacePress: function () {
            var oView = this.getView();
            
            // Create inputs with live validation
            var oCompanyNameInput = new Input({ 
                id: this.createId("companyNameInput"), 
                placeholder: "Enter your Company Name",
                liveChange: this._onWorkspaceInputLiveChange.bind(this)
            });
            var oAddressInput = new Input({ 
                id: this.createId("addressInput"), 
                placeholder: "Enter your Address",
                liveChange: this._onWorkspaceInputLiveChange.bind(this)
            });
            var oPhoneInput = new Input({ 
                id: this.createId("phoneInput"), 
                type: "Tel", 
                placeholder: "Enter your Phone number",
                liveChange: this._onWorkspaceInputLiveChange.bind(this)
            });
            var oEmailInput = new Input({ 
                id: this.createId("emailInput"), 
                type: "Email", 
                placeholder: "Enter your Email",
                liveChange: this._onWorkspaceInputLiveChange.bind(this)
            });
            
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
                        var oODataModel = this.getOwnerComponent().getModel("userService");
                        var oAuthModel = this.getOwnerComponent().getModel("auth");
        
                        var oWorkspaceData = {
                            companyName: oCompanyNameInput.getValue().trim(),
                            address: oAddressInput.getValue().trim(),
                            phone: oPhoneInput.getValue().trim(),
                            email: oEmailInput.getValue().trim().toLowerCase()
                        };
        
                        // Comprehensive validation
                        const validation = this._validateWorkspaceData(oWorkspaceData);
                        if (!validation.valid) {
                            MessageBox.error("Please fix the following errors:\n\n" + validation.errors.join("\n"));
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
                                MessageToast.show("Workspace created successfully!", {
                                    duration: 3000,
                                    width: "20em"
                                });
                                oDialog.close();
                                // Reload workspace info to update UI
                                this._loadWorkspaceInfo();
                            } else {
                                MessageBox.error("Failed to create workspace: " + (oResult.message || "Unknown error"));
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
            
            // Create inputs with current values and live validation
            var oCompanyNameInput = new Input({ 
                id: this.createId("editCompanyNameInput"), 
                value: oWorkspace.CompanyName,
                placeholder: "Enter your Company Name",
                liveChange: this._onWorkspaceInputLiveChange.bind(this)
            });
            var oAddressInput = new Input({ 
                id: this.createId("editAddressInput"), 
                value: oWorkspace.Address,
                placeholder: "Enter your Address",
                liveChange: this._onWorkspaceInputLiveChange.bind(this)
            });
            var oPhoneInput = new Input({ 
                id: this.createId("editPhoneInput"), 
                value: oWorkspace.Phone,
                type: "Tel", 
                placeholder: "Enter your Phone number",
                liveChange: this._onWorkspaceInputLiveChange.bind(this)
            });
            var oEmailInput = new Input({ 
                id: this.createId("editEmailInput"), 
                value: oWorkspace.Email,
                type: "Email", 
                placeholder: "Enter your Email",
                liveChange: this._onWorkspaceInputLiveChange.bind(this)
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
                        var oODataModel = this.getOwnerComponent().getModel("userService");
        
                        var oWorkspaceData = {
                            companyName: oCompanyNameInput.getValue().trim(),
                            address: oAddressInput.getValue().trim(),
                            phone: oPhoneInput.getValue().trim(),
                            email: oEmailInput.getValue().trim().toLowerCase()
                        };
        
                        // Comprehensive validation
                        const validation = this._validateWorkspaceData(oWorkspaceData);
                        if (!validation.valid) {
                            MessageBox.error("Please fix the following errors:\n\n" + validation.errors.join("\n"));
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
                                MessageToast.show("Workspace information updated successfully!", {
                                    duration: 3000,
                                    width: "25em"
                                });
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
            
            // Create inputs with live validation
            var oUsernameInput = new Input({ 
                id: this.createId("usernameInput"), 
                placeholder: "Enter Username",
                liveChange: this._onUserInputLiveChange.bind(this)
            });
            var oPasswordInput = new Input({ 
                id: this.createId("passwordInput"), 
                type: "Password", 
                placeholder: "Enter Password",
                liveChange: this._onUserInputLiveChange.bind(this)
            });
            var oFullNameInput = new Input({ 
                id: this.createId("fullNameInput"), 
                placeholder: "Enter Full Name",
                liveChange: this._onUserInputLiveChange.bind(this)
            });
            var oEmailInput = new Input({ 
                id: this.createId("userEmailInput"), 
                type: "Email", 
                placeholder: "Enter Email",
                liveChange: this._onUserInputLiveChange.bind(this)
            });
            var oPhoneInput = new Input({ 
                id: this.createId("userPhoneInput"), 
                type: "Tel", 
                placeholder: "Enter Phone",
                liveChange: this._onUserInputLiveChange.bind(this)
            });
            
            // Create role dropdown
            var oRoleSelect = new Select({ id: this.createId("roleSelect") });
            oRoleSelect.addItem(new Item({ key: "Staff", text: "Staff" }));
            oRoleSelect.addItem(new Item({ key: "Admin", text: "Admin" }));
            oRoleSelect.addItem(new Item({ key: "Manager", text: "Manager" }));
            oRoleSelect.addItem(new Item({ key: "Accountant", text: "Accountant" }));
            oRoleSelect.setSelectedKey("Staff");
            
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
                        var oODataModel = this.getOwnerComponent().getModel("userService");
        
                        var oUserData = {
                            username: oUsernameInput.getValue().trim(),
                            password: oPasswordInput.getValue(),
                            fullName: oFullNameInput.getValue().trim(),
                            email: oEmailInput.getValue().trim().toLowerCase(),
                            phone: oPhoneInput.getValue().trim(),
                            role: oRoleSelect.getSelectedKey()
                        };
        
                        // Comprehensive validation
                        const validation = this._validateUserData(oUserData);
                        if (!validation.valid) {
                            MessageBox.error("Please fix the following errors:\n\n" + validation.errors.join("\n"));
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
                                MessageToast.show("User added successfully!", {
                                    duration: 3000,
                                    width: "18em"
                                });
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

        // =================================================================================
        // LIVE VALIDATION EVENT HANDLERS
        // =================================================================================

        _onWorkspaceInputLiveChange: function(oEvent) {
            const sValue = oEvent.getParameter("value");
            const oInput = oEvent.getSource();
            const sInputId = oInput.getId();
            
            let validation;
            
            if (sInputId.includes("companyName")) {
                validation = this._validateCompanyName(sValue);
            } else if (sInputId.includes("address")) {
                validation = this._validateAddress(sValue);
            } else if (sInputId.includes("phone")) {
                validation = this._validatePhone(sValue);
            } else if (sInputId.includes("email")) {
                validation = this._validateEmail(sValue);
            }
            
            if (validation) {
                if (sValue === "") {
                    oInput.setValueState("None");
                    oInput.setValueStateText("");
                } else if (!validation.valid) {
                    oInput.setValueState("Error");
                    oInput.setValueStateText(validation.message);
                } else {
                    oInput.setValueState("Success");
                    oInput.setValueStateText("");
                }
            }
        },

        _onUserInputLiveChange: function(oEvent) {
            const sValue = oEvent.getParameter("value");
            const oInput = oEvent.getSource();
            const sInputId = oInput.getId();
            
            let validation;
            
            if (sInputId.includes("username")) {
                validation = this._validateUsername(sValue);
            } else if (sInputId.includes("password")) {
                validation = this._validatePassword(sValue);
            } else if (sInputId.includes("fullName")) {
                validation = this._validateFullName(sValue);
            } else if (sInputId.includes("Email")) {
                validation = this._validateEmail(sValue);
            } else if (sInputId.includes("Phone")) {
                validation = this._validatePhone(sValue);
            }
            
            if (validation) {
                if (sValue === "") {
                    oInput.setValueState("None");
                    oInput.setValueStateText("");
                } else if (!validation.valid) {
                    oInput.setValueState("Error");
                    oInput.setValueStateText(validation.message);
                } else {
                    oInput.setValueState("Success");
                    oInput.setValueStateText("");
                }
            }
        },

        // =================================================================================
        // OTHER EVENT HANDLERS
        // =================================================================================

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
                        var oODataModel = this.getOwnerComponent().getModel("userService");
                        var sNewRole = oRoleSelect.getSelectedKey();
                        
                        // If role didn't change, just close dialog
                        if (sNewRole === oUser.Role) {
                            MessageToast.show("No changes made to user role.", {
                                duration: 2000
                            });
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
                                MessageToast.show("User role updated successfully!", {
                                    duration: 3000,
                                    width: "20em"
                                });
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
                    
                    var oODataModel = this.getOwnerComponent().getModel("userService");
                    var oContext = oODataModel.bindContext("/updateUserStatus(...)");
                    oContext.setParameter("userID", oUser.ID);
                    oContext.setParameter("status", sNewStatus);
    
                    oContext.execute().then(function () {
                        var oResult = oContext.getBoundContext().getObject();
                        oViewModel.setProperty("/busy", false);
                        
                        if (oResult && oResult.success) {
                            MessageToast.show("User status updated successfully!", {
                                duration: 3000,
                                width: "20em"
                            });
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
                    
                    var oODataModel = this.getOwnerComponent().getModel("userService");
                    var oContext = oODataModel.bindContext("/removeUserFromWorkspace(...)");
                    oContext.setParameter("userID", oUser.ID);
    
                    oContext.execute().then(function () {
                        var oResult = oContext.getBoundContext().getObject();
                        oViewModel.setProperty("/busy", false);
                        
                        if (oResult && oResult.success) {
                            MessageToast.show("User removed successfully!", {
                                duration: 3000,
                                width: "18em"
                            });
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