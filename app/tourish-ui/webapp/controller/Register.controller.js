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

      onUsernameLiveChange: function(oEvent) {
        const sUsername = oEvent.getParameter("value");
        const oInput = oEvent.getSource();
        
        if (sUsername === "") {
          oInput.setValueState("None");
          oInput.setValueStateText("");
        } else if (sUsername.length < 3) {
          oInput.setValueState("Error");
          oInput.setValueStateText("Username must be at least 3 characters long");
        } else if (!/^[a-zA-Z0-9_.-]+$/.test(sUsername)) {
          oInput.setValueState("Error");
          oInput.setValueStateText("Username can only contain letters, numbers, dots, hyphens and underscores");
        } else {
          oInput.setValueState("Success");
          oInput.setValueStateText("");
        }
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

      onFullNameLiveChange: function(oEvent) {
        const sFullName = oEvent.getParameter("value");
        const oInput = oEvent.getSource();
        
        if (sFullName === "") {
          oInput.setValueState("None");
          oInput.setValueStateText("");
        } else if (sFullName.trim().length < 2) {
          oInput.setValueState("Error");
          oInput.setValueStateText("Full name must be at least 2 characters long");
        } else if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(sFullName)) {
          oInput.setValueState("Error");
          oInput.setValueStateText("Full name can only contain letters and spaces");
        } else if (sFullName.trim().split(/\s+/).length < 2) {
          oInput.setValueState("Warning");
          oInput.setValueStateText("Please enter both first and last name");
        } else {
          oInput.setValueState("Success");
          oInput.setValueStateText("");
        }
      },

      onEmailLiveChange: function(oEvent) {
        const sEmail = oEvent.getParameter("value");
        const oInput = oEvent.getSource();
        
        if (sEmail === "") {
          oInput.setValueState("None");
          oInput.setValueStateText("");
        } else {
          // Email regex pattern
          const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          
          if (!emailPattern.test(sEmail)) {
            oInput.setValueState("Error");
            oInput.setValueStateText("Please enter a valid email address");
          } else {
            oInput.setValueState("Success");
            oInput.setValueStateText("");
          }
        }
      },

      onPhoneLiveChange: function(oEvent) {
        const sPhone = oEvent.getParameter("value");
        const oInput = oEvent.getSource();
        
        if (sPhone === "") {
          oInput.setValueState("None");
          oInput.setValueStateText("");
        } else {
          // Remove all non-digit characters for validation
          const cleanPhone = sPhone.replace(/\D/g, '');
          
          if (cleanPhone.length < 10) {
            oInput.setValueState("Error");
            oInput.setValueStateText("Phone number must be at least 10 digits");
          } else if (cleanPhone.length > 15) {
            oInput.setValueState("Error");
            oInput.setValueStateText("Phone number cannot exceed 15 digits");
          } else if (!/^[\d\s\-\+\(\)\.]+$/.test(sPhone)) {
            oInput.setValueState("Error");
            oInput.setValueStateText("Phone number contains invalid characters");
          } else {
            oInput.setValueState("Success");
            oInput.setValueStateText("");
          }
        }
      },

      // Validation helpers
      _validateUsername: function(sUsername) {
        if (!sUsername || sUsername.trim() === "") {
          return { valid: false, message: "Username is required" };
        }
        if (sUsername.length < 3) {
          return { valid: false, message: "Username must be at least 3 characters long" };
        }
        if (!/^[a-zA-Z0-9_.-]+$/.test(sUsername)) {
          return { valid: false, message: "Username can only contain letters, numbers, dots, hyphens and underscores" };
        }
        return { valid: true };
      },

      _validateFullName: function(sFullName) {
        if (!sFullName || sFullName.trim() === "") {
          return { valid: false, message: "Full name is required" };
        }
        if (sFullName.trim().length < 2) {
          return { valid: false, message: "Full name must be at least 2 characters long" };
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
        const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailPattern.test(sEmail)) {
          return { valid: false, message: "Please enter a valid email address" };
        }
        return { valid: true };
      },

      _validatePhone: function(sPhone) {
        if (!sPhone || sPhone.trim() === "") {
          return { valid: false, message: "Phone number is required" };
        }
        const cleanPhone = sPhone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
          return { valid: false, message: "Phone number must be at least 10 digits" };
        }
        if (cleanPhone.length > 15) {
          return { valid: false, message: "Phone number cannot exceed 15 digits" };
        }
        if (!/^[\d\s\-\+\(\)\.]+$/.test(sPhone)) {
          return { valid: false, message: "Phone number contains invalid characters" };
        }
        return { valid: true };
      },

      onNavBack: function () {
        this.getOwnerComponent().getRouter().navTo("login");
      },

      onRegisterPress: function () {
        const oView = this.getView();
        const sUsername = oView.byId("usernameInput2").getValue();
        const sPassword = oView.byId("passwordInput2").getValue();
        const sFullName = oView.byId("fullNameInput").getValue();
        const sEmail = oView.byId("emailInput11").getValue();
        const sPhone = oView.byId("phoneInput11").getValue();

        // Validate all fields
        const usernameValidation = this._validateUsername(sUsername);
        const passwordValidation = utils.validatePasswordComplexity(sPassword);
        const fullNameValidation = this._validateFullName(sFullName);
        const emailValidation = this._validateEmail(sEmail);
        const phoneValidation = this._validatePhone(sPhone);

        // Collect all validation errors
        const errors = [];
        if (!usernameValidation.valid) errors.push(usernameValidation.message);
        if (!passwordValidation.valid) errors.push(passwordValidation.message);
        if (!fullNameValidation.valid) errors.push(fullNameValidation.message);
        if (!emailValidation.valid) errors.push(emailValidation.message);
        if (!phoneValidation.valid) errors.push(phoneValidation.message);

        if (errors.length > 0) {
          MessageBox.error("Please fix the following errors:\n\n" + errors.join("\n"));
          return;
        }

        const oData = {
          username: sUsername.trim(),
          password: sPassword,
          fullName: sFullName.trim(),
          email: sEmail.trim().toLowerCase(),
          phone: sPhone.trim()
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
            MessageToast.show("Registration successful! Please login.");
            this.getOwnerComponent().getRouter().navTo("login");
          } else {
            MessageToast.show("Register failed: Unknown error");
          }
        }).catch(error => {
          console.error("Error during registration:", error);
          MessageBox.error("An error occurred while registering: " + error.message);
        });
      }
  });
});