sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/odata/v4/ODataModel",
    "../model/utils"
  ], function (Controller, MessageToast, MessageBox, ODataModel, utils) {
    "use strict";
  
    return Controller.extend("tourishui.controller.Register", {
        onInit: function() {

          // Kiểm tra session từ SessionManager
          const oSessionManager = this.getOwnerComponent().getSessionManager();
          if (oSessionManager.isLoggedIn()) {
            this.getOwnerComponent().getRouter().navTo("dashboard");
          };
          
            // Tạo các chỉ báo yêu cầu mật khẩu
            this._createPasswordRequirementIndicators();
          },
          
          _createPasswordRequirementIndicators: function() {
            const oRequirementBox = this.byId("passwordRequirements");
            
            // Xóa nội dung cũ nếu có
            oRequirementBox.removeAllItems();
            
            // Thêm các chỉ báo yêu cầu
            const aRequirements = [
              { id: "minLength", text: "At least 8 characters" },
              { id: "hasUpperCase", text: "At least one uppercase letter" },
              { id: "hasLowerCase", text: "At least one lowercase letter" },
              { id: "hasNumber", text: "At least one number" },
              { id: "hasSpecialChar", text: "At least one special character" }
            ];
            
            aRequirements.forEach(req => {
              const oHBox = new sap.m.HBox({
                items: [
                  new sap.ui.core.Icon({
                    src: "sap-icon://message-error",
                    color: "#FF0000",
                    visible: true
                  }).addStyleClass("sapUiTinyMarginEnd"),
                  new sap.m.Text({
                    text: req.text
                  })
                ]
              });
              oHBox.data("requirement", req.id);
              oRequirementBox.addItem(oHBox);
            });
          },
          
          onPasswordLiveChange: function(oEvent) {
            const sPassword = oEvent.getParameter("value");
            const oInput = oEvent.getSource();
            
            // Lấy kết quả validation từ utils
            const validationResult = utils.validatePasswordComplexity(sPassword);
            
            // Cập nhật trạng thái của các chỉ báo yêu cầu
            const oRequirementBox = this.byId("passwordRequirements");
            const aRequirementItems = oRequirementBox.getItems();
            
            aRequirementItems.forEach(oHBox => {
              const sRequirementId = oHBox.data("requirement");
              const oIcon = oHBox.getItems()[0];
              
              if (validationResult.requirements[sRequirementId].met) {
                oIcon.setSrc("sap-icon://accept");
                oIcon.setColor("#007833"); // green
              } else {
                oIcon.setSrc("sap-icon://message-error");
                oIcon.setColor("#FF0000"); // Red
              }
            });
            
            if (sPassword === "") {
              oInput.setValueState("None");
            } else if (!validationResult.valid) {
              oInput.setValueState("None");
            } else {
              oInput.setValueState("Success");
            }
          },

  
      onNavBack: function () {
        this.getOwnerComponent().getRouter().navTo("login");
      },
  
      onRegisterPress: function () {
        const oView = this.getView();
        const sUsername = oView.byId("usernameInput2").getValue();
        const sPassword = oView.byId("passwordInput2").getValue();
        const sFullName = oView.byId("fullNameInput").getValue();
        const sEmail = oView.byId("emailInput").getValue();
        const sPhone = oView.byId("phoneInput").getValue();
  
        if (!sUsername || !sPassword || !sFullName || !sEmail || !sPhone) {
          MessageBox.error("Please enter complete information!");
          return;
        }
  
        // Validate mật khẩu trước khi gửi
        const passwordValidation = utils.validatePasswordComplexity(sPassword);
        if (!passwordValidation.valid) {
          MessageBox.error(passwordValidation.message);
          return;
        }
  
        const oData = {
          username: sUsername,
          password: sPassword,
          fullName: sFullName,
          email: sEmail,
          phone: sPhone
        };
  
        // Sử dụng OData model để gọi action createUser
        const oModel = this.getOwnerComponent().getModel("userService");
        const oContext = oModel.bindContext("/createUser(...)");
        oContext.setParameter("username", oData.username);
        oContext.setParameter("password", oData.password);
        oContext.setParameter("fullName", oData.fullName);
        oContext.setParameter("email", oData.email);
        oContext.setParameter("phone", oData.phone);
  
        oContext.execute().then(() => {
          const oResult = oContext.getBoundContext().getObject();
          if (oResult.ID) {
            MessageBox.success("Registration successful! Please login.");
            this.getOwnerComponent().getRouter().navTo("login");
          } else {
            MessageBox.error("Register failed: Unknown error");
          }
        }).catch(error => {
          console.error("Error during registration:", error);
          MessageBox.error("An error occurred while registering: " + error.message);
        });
      }
    });
  });