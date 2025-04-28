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

    return Controller.extend("tourishui.controller.MyWorkspace", {
        onInit: function () {
            // Load workspace info if WorkspaceID exists
            this._loadWorkspaceInfo();
        },

        _loadWorkspaceInfo: function () {
            var oView = this.getView();
            var oAuthModel = this.getOwnerComponent().getModel("auth");
            var oODataModel = this.getOwnerComponent().getModel();
            var sWorkspaceId = oAuthModel.getProperty("/user/WorkspaceID");

            if (!sWorkspaceId) {
                // No workspace, show create workspace UI
                oView.byId("noWorkspaceBox").setVisible(true);
                oView.byId("workspaceInfoBox").setVisible(false);
                return;
            }

            // Load workspace info using getWorkspaceInfo action
            var oContext = oODataModel.bindContext("/getWorkspaceInfo(...)");
            oContext.execute().then(function () {
                var oWorkspace = oContext.getBoundContext().getObject();
                console.log("Workspace info loaded:", oWorkspace);
                oAuthModel.setProperty("/workspace", oWorkspace);
                oView.byId("noWorkspaceBox").setVisible(false);
                oView.byId("workspaceInfoBox").setVisible(true);
            }.bind(this)).catch(function (oError) {
                var sMessage = "Không thể tải thông tin workspace!";
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
                            MessageBox.error("Vui lòng nhập đầy đủ các trường!");
                            return;
                        }
        
                        // Validate email format
                        if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(oWorkspaceData.email)) {
                            MessageBox.error("Email không hợp lệ!");
                            return;
                        }
        
        
                        // Call createWorkspace action
                        var oContext = oODataModel.bindContext("/createWorkspace(...)");
                        oContext.setParameter("companyName", oWorkspaceData.companyName);
                        oContext.setParameter("address", oWorkspaceData.address);
                        oContext.setParameter("phone", oWorkspaceData.phone);
                        oContext.setParameter("email", oWorkspaceData.email);
        
                        oContext.execute().then(function () {
                            var oResult = oContext.getBoundContext().getObject();
                            console.log("Workspace created:", oResult);
                            if (oResult) {
                                console.log(1);
                                // Update auth model with new WorkspaceID
                                oAuthModel.setProperty("/user/WorkspaceID", oResult.ID);
                                oAuthModel.setProperty("/workspace", oResult);
                                MessageBox.success("Tạo workspace thành công!");
                                oDialog.close();
                                // Reload workspace info to update UI
                                this._loadWorkspaceInfo();
                            } else {
                                MessageBox.error("Cập nhật thất bại: " + (oResult.message || "Lỗi không xác định"));
                            }
                        }.bind(this)).catch(function (oError) {
                            var sMessage = "Tạo workspace thất bại!";
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
        }
    });
});