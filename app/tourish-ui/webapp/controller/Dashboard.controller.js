sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/odata/v4/ODataModel"
], function (Controller, MessageBox, JSONModel, ODataModel) {
  "use strict";

  return Controller.extend("tourishui.controller.Dashboard", {
    onInit: function () {
      // Đảm bảo auth model đã được khởi tạo
      const oComponent = this.getOwnerComponent();
      if (!oComponent.getModel("auth")) {
        oComponent.setModel(new JSONModel({ token: null, user: null }), "auth");
      }
      
      const oAuthModel = oComponent.getModel("auth");
      // Kiểm tra xem model đã tồn tại và có thuộc tính token chưa
      if (!oAuthModel || !oAuthModel.getProperty("/token")) {
        // Kiểm tra localStorage để khôi phục session
        const sAuthData = localStorage.getItem("auth");
        if (sAuthData) {
          const oAuthData = JSON.parse(sAuthData);
          oAuthModel.setData(oAuthData);
        } else {
          oComponent.getRouter().navTo("login");
          return;
        }
      }
      
      // Đăng ký để nhận thông báo khi route thay đổi
      oComponent.getRouter().getRoute("dashboard").attachPatternMatched(this._onRouteMatched, this);
    },
    
    _onRouteMatched: function() {
      const oComponent = this.getOwnerComponent();
      const oAuthModel = oComponent.getModel("auth");
      
      // Kiểm tra xem model đã tồn tại và có thuộc tính token chưa
      if (!oAuthModel || !oAuthModel.getProperty("/token")) {
        oComponent.getRouter().navTo("login");
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
                // Cập nhật thông tin workspace vào model auth
                const oAuthModel = this.getOwnerComponent().getModel("auth");
                if (oAuthModel) {
                  oAuthModel.setProperty("/user/WorkspaceID", oResult.ID);
                  // Cập nhật localStorage
                  localStorage.setItem("auth", JSON.stringify(oAuthModel.getData()));
                }
                
                MessageBox.success("Tạo workspace thành công!");
                oDialog.close();
                
                // Refresh binding để cập nhật UI (nếu cần)
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
      const oComponent = this.getOwnerComponent();
      const oAuthModel = oComponent.getModel("auth");
      
      // Kiểm tra sự tồn tại của model trước khi cập nhật
      if (oAuthModel) {
        oAuthModel.setProperty("/token", null);
        oAuthModel.setProperty("/user", null);
        // Xóa localStorage
        localStorage.removeItem("auth");
      }
      
      // Điều hướng về trang đăng nhập
      oComponent.getRouter().navTo("login");
    }
  });
});