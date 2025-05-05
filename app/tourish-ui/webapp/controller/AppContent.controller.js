sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox"
], function (Controller, MessageBox) {
    "use strict";

    return Controller.extend("tourishui.controller.AppContent", {
        onInit: function () {
            // Initialize the side navigation model
            this.getView().setModel(this.getOwnerComponent().getModel("side"), "side");
            
            // Get the router and attach route matched events for views that will be shown in mainContents
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("dashboard").attachMatched(this._onRouteMatched, this);
            oRouter.getRoute("myWorkspace").attachMatched(this._onRouteMatched, this);
            oRouter.getRoute("myProfile").attachMatched(this._onRouteMatched, this);
            oRouter.getRoute("supplierInformation").attachMatched(this._onRouteMatched, this);
            oRouter.getRoute("supplierDetail").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sRouteName = oEvent.getParameter("name");
            var oMainContents = this.getView().byId("mainContents");
            console.log("AppContent: Route matched:", sRouteName);
            
            // Ensure the correct view is displayed in mainContents
            try {
                oMainContents.to(this.getView().createId(sRouteName));
            } catch (e) {
                console.error("Error navigating to view:", sRouteName, e);
            }
        },

        onSideNavButtonPress: function () {
            var oToolPage = this.getView().byId("toolPage");
            var bSideExpanded = oToolPage.getSideExpanded();
            oToolPage.setSideExpanded(!bSideExpanded);
        },

        onMenuItemPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var sKey = oItem.getKey();
            console.log("Menu item pressed:", sKey);
            var oRouter = this.getOwnerComponent().getRouter();
            var oSessionManager = this.getOwnerComponent().getSessionManager();

            switch (sKey) {
                case "myWorkspace":
                    oRouter.navTo("myWorkspace", {}, false);
                    break;
                case "myProfile":
                    oRouter.navTo("myProfile", {}, false);
                    break;
                case "logout":
                    oSessionManager.clearSession();
                    MessageBox.success("Đăng xuất thành công!");
                    oRouter.navTo("login", {}, true);
                    break;
                default:
                    MessageBox.error("Chức năng chưa được triển khai!");
            }
        }
    });
});