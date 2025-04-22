sap.ui.define([
    "sap/ui/base/Object",
    "sap/m/MessageBox"
  ], function (BaseObject, MessageBox) {
    "use strict";
  
    return BaseObject.extend("tourishui.model.SessionManager", {
      constructor: function () {
        this._oAuthModel = new sap.ui.model.json.JSONModel({
          token: null,
          user: null,
          isLoggedIn: false
        });
  
        // Khởi tạo session từ localStorage
        this._initSession();
  
        // Đăng ký sự kiện Storage để đồng bộ giữa các tab
        window.addEventListener("storage", this._onStorageChange.bind(this));
      },
  
      // Khởi tạo session từ localStorage
      _initSession: function () {
        const sAuthData = localStorage.getItem("auth");
        if (sAuthData) {
          try {
            const oAuthData = JSON.parse(sAuthData);
            this._oAuthModel.setData({
              token: oAuthData.token,
              user: oAuthData.user,
              isLoggedIn: true
            });
          } catch (e) {
            console.error("Error parsing auth data from localStorage:", e);
            this.clearSession();
          }
        }
      },
  
      // Xử lý sự kiện Storage để đồng bộ giữa các tab
      _onStorageChange: function (oEvent) {
        if (oEvent.key === "auth") {
          if (!oEvent.newValue) {
            // Nếu auth bị xóa (đăng xuất), cập nhật trạng thái
            this.clearSession();
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            if (oRouter) {
              oRouter.navTo("login");
              MessageBox.information("Bạn đã đăng xuất từ một tab khác.");
            }
          } else {
            // Nếu auth được cập nhật (đăng nhập), khôi phục session
            this._initSession();
          }
        }
      },
  
      // Lưu session
      saveSession: function (oAuthData) {
        this._oAuthModel.setData({
          token: oAuthData.token,
          user: oAuthData.user,
          isLoggedIn: true
        });
        localStorage.setItem("auth", JSON.stringify({
          token: oAuthData.token,
          user: oAuthData.user
        }));
      },
  
      // Xóa session
      clearSession: function () {
        this._oAuthModel.setData({
          token: null,
          user: null,
          isLoggedIn: false
        });
        localStorage.removeItem("auth");
      },
  
      // Lấy auth model
      getAuthModel: function () {
        return this._oAuthModel;
      },
  
      // Kiểm tra trạng thái đăng nhập
      isLoggedIn: function () {
        return this._oAuthModel.getProperty("/isLoggedIn");
      },
  
      // Lấy thông tin user
      getUser: function () {
        return this._oAuthModel.getProperty("/user");
      },
  
      // Lấy token
      getToken: function () {
        return this._oAuthModel.getProperty("/token");
      }
    });
  });