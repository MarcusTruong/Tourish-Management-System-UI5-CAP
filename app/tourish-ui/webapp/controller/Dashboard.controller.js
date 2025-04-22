sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/ui/model/odata/v4/ODataModel"
], function (Controller, MessageBox, ODataModel) {
  "use strict";

  return Controller.extend("tourishui.controller.Dashboard", {
    onInit: function () {
      // Đăng ký để nhận thông báo khi route thay đổi
      this.getOwnerComponent().getRouter().getRoute("dashboard").attachPatternMatched(this._onRouteMatched, this);
    },
    
    _onRouteMatched: function() {
      const oSessionManager = this.getOwnerComponent().getSessionManager();
      if (!oSessionManager.isLoggedIn()) {
        this.getOwnerComponent().getRouter().navTo("login");
      }
    },

    onCreateWorkspacePress: function () {
      const oDialog = new sap.m.Dialog({
        title: "Tạo Workspace",
        content: [
          new sap.m.Label({ text: "Tên công ty" }),
          new sap.m.Input({ id: "companyNameInput", placeholder: "Nhập tên công ty" }),
          new sap.m.Label({ text: "Địa chỉ" }),
          new sap.m.Input({ id: "addressInput", placeholder: "Nhập địa chỉ" }),
          new sap.m.Label({ text: "Số điện thoại" }),
          new sap.m.Input({ id: "phoneInput", placeholder: "Nhập số điện thoại" }),
          new sap.m.Label({ text: "Email" }),
          new sap.m.Input({ id: "emailInput", placeholder: "Nhập email" })
        ],
        beginButton: new sap.m.Button({
          text: "Tạo",
          press: function () {
            const sCompanyName = sap.ui.getCore().byId("companyNameInput").getValue();
            const sAddress = sap.ui.getCore().byId("addressInput").getValue();
            const sPhone = sap.ui.getCore().byId("phoneInput").getValue();
            const sEmail = sap.ui.getCore().byId("emailInput").getValue();

            if (!sCompanyName || !sAddress || !sPhone || !sEmail) {
              MessageBox.error("Vui lòng nhập đầy đủ thông tin!");
              return;
            }

            // Sử dụng OData model để gọi action createWorkspace
            const oModel = this.getOwnerComponent().getModel();
            const oContext = oModel.bindContext("/createWorkspace(...)");
            
            // Đặt các tham số
            oContext.setParameter("companyName", sCompanyName);
            oContext.setParameter("address", sAddress);
            oContext.setParameter("phone", sPhone);
            oContext.setParameter("email", sEmail);
            
            // Thực thi action
            oContext.execute().then(function() {
              // Lấy kết quả từ context
              const oResult = oContext.getBoundContext().getObject();
              
              if (oResult && oResult.ID) {
                // Cập nhật thông tin workspace vào SessionManager
                const oSessionManager = this.getOwnerComponent().getSessionManager();
                const oUser = oSessionManager.getUser();
                oUser.WorkspaceID = oResult.ID;
                oSessionManager.saveSession({
                  token: oSessionManager.getToken(),
                  user: oUser
                });
                
                MessageBox.success("Tạo workspace thành công!");
                oDialog.close();
                
                // Refresh binding để cập nhật UI
                if (this.getView().getBindingContext()) {
                  this.getView().getBindingContext().refresh();
                }
              } else {
                MessageBox.error("Tạo workspace thất bại: " + (oResult.error?.message || "Unknown error"));
              }
            }.bind(this)).catch(function(oError) {
              console.error("Error creating workspace:", oError);
              
              if (oError.response) {
                try {
                  const oResponseData = JSON.parse(oError.response.body);
                  MessageBox.error(oResponseData.error.message || "Tạo workspace thất bại");
                } catch (e) {
                  MessageBox.error("Tạo workspace thất bại: " + oError.message);
                }
              } else {
                MessageBox.error("Đã xảy ra lỗi khi tạo workspace: " + oError.message);
              }
            }.bind(this));
          }.bind(this)
        }),
        endButton: new sap.m.Button({
          text: "Hủy",
          press: function () {
            oDialog.close();
          }
        }),
        afterClose: function () {
          oDialog.destroy();
        }
      });

      oDialog.open();
    },

    onManageUsersPress: function () {
      this.getOwnerComponent().getRouter().navTo("manageUsers");
    },

    onChangePasswordPress: function () {
      this.getOwnerComponent().getRouter().navTo("changePassword");
    },

    onLogoutPress: function () {
      const oSessionManager = this.getOwnerComponent().getSessionManager();
      oSessionManager.clearSession();
      
      // Điều hướng về trang đăng nhập
      this.getOwnerComponent().getRouter().navTo("login");
    }
  });
});