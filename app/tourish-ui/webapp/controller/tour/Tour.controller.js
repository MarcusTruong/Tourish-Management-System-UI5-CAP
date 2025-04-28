sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast, Spreadsheet) {
    "use strict";

    return Controller.extend("tourishui.controller.tour.Tour", {
        onInit: function () {
            // Tạo dữ liệu mẫu cho Tours
            var aTours = [
                {
                    tourID: "TOUR001",
                    tourName: "Hanoi City Tour",
                    price: "150.00",
                    status: "Active",
                    createdBy: "Truong",
                    imageUrl: "https://picsum.photos/200/300?random=1"
                },
                {
                    tourID: "TOUR002",
                    tourName: "Ha Long Bay Cruise",
                    price: "250.00",
                    status: "Active",
                    createdBy: "Truong",
                    imageUrl: "https://picsum.photos/200/300?random=2"
                },
                {
                    tourID: "TOUR003",
                    tourName: "Sapa Trekking",
                    price: "180.00",
                    status: "Inactive",
                    createdBy: "admin0",
                    imageUrl: "https://picsum.photos/200/300?random=3"
                }
            ];

            // Tạo JSON Model và set data
            var oModel = new JSONModel({
                Tours: aTours
            });
            this.getView().setModel(oModel);

            // Cập nhật số lượng ban đầu
            this._updateTableCount();
        },

        onSearch: function (oEvent) {
            var aFilters = [];
            var oTable = this.byId("toursTable1");
            var oBinding = oTable.getBinding("items");

            // Lấy giá trị từ các trường filter
            var sSearchQuery = this.byId("tourSearchField1").getValue();
            var sTourID = this.byId("tourIDFilter1").getValue();
            var sTourName = this.byId("tourNameFilter1").getValue();
            var sPrice = this.byId("priceFilter1").getValue();
            var sStatus = this.byId("statusFilter1").getValue();

            // Tạo filters
            if (sSearchQuery) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("tourID", FilterOperator.Contains, sSearchQuery),
                        new Filter("tourName", FilterOperator.Contains, sSearchQuery),
                        new Filter("status", FilterOperator.Contains, sSearchQuery)
                    ],
                    and: false
                }));
            }

            if (sTourID) {
                aFilters.push(new Filter("tourID", FilterOperator.Contains, sTourID));
            }
            if (sTourName) {
                aFilters.push(new Filter("tourName", FilterOperator.Contains, sTourName));
            }
            if (sPrice) {
                aFilters.push(new Filter("price", FilterOperator.Contains, sPrice));
            }
            if (sStatus) {
                aFilters.push(new Filter("status", FilterOperator.Contains, sStatus));
            }

            // Áp dụng filters
            oBinding.filter(aFilters);
            this._updateTableCount();
        },

        onClearFilters: function () {
            // Reset tất cả input fields
            this.byId("tourSearchField1").setValue("");
            this.byId("tourIDFilter1").setValue("");
            this.byId("tourNameFilter1").setValue("");
            this.byId("priceFilter1").setValue("");
            this.byId("statusFilter1").setValue("");

            // Clear filters và refresh table
            var oTable = this.byId("toursTable1");
            oTable.getBinding("items").filter([]);
            this._updateTableCount();
        },

        onAddTour: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("createTour");
        },

        onEditTour: function (oEvent) {
            var oItem = oEvent.getSource().getBindingContext().getObject();
            MessageToast.show("Edit tour: " + oItem.tourName);
        },

        onDeleteTour: function (oEvent) {
            var oModel = this.getView().getModel();
            var oItem = oEvent.getSource().getBindingContext().getObject();
            var aTours = oModel.getProperty("/Tours");

            var iIndex = aTours.findIndex(function (item) {
                return item.tourID === oItem.tourID;
            });

            if (iIndex !== -1) {
                aTours.splice(iIndex, 1);
                oModel.setProperty("/Tours", aTours);
                this._updateTableCount();
                MessageToast.show("Tour deleted successfully");
            }
        },

        onDeleteSelected: function () {
            var oTable = this.byId("toursTable1");
            var aSelectedIndices = oTable.getSelectedIndices();
            var oModel = this.getView().getModel();
            var aTours = oModel.getProperty("/Tours");

            if (aSelectedIndices.length === 0) {
                MessageToast.show("Please select at least one tour");
                return;
            }

            // Xóa từ dưới lên để tránh lỗi index
            for (var i = aSelectedIndices.length - 1; i >= 0; i--) {
                aTours.splice(aSelectedIndices[i], 1);
            }

            oModel.setProperty("/Tours", aTours);
            oTable.clearSelection();
            this._updateTableCount();
            MessageToast.show("Selected tours deleted successfully");
        },

        onExport: function () {
            var oTable = this.byId("toursTable1");
            var aCols = [
                { label: "Tour ID", property: "tourID" },
                { label: "Tour Name", property: "tourName" },
                { label: "Price", property: "price" },
                { label: "Status", property: "status" },
                { label: "Created By", property: "createdBy" }
            ];

            var oSettings = {
                workbook: { columns: aCols },
                dataSource: oTable.getBinding("items").getModel().getProperty("/Tours"),
                fileName: "Tours_Export_" + new Date().toISOString().slice(0, 10) + ".xlsx"
            };

            new Spreadsheet(oSettings).build().then(function () {
                MessageToast.show("Export completed");
            });
        },

        onTableSettings: function () {
            MessageToast.show("Table settings to be implemented");
        },

        onTourPress: function (oEvent) {
            var oItem = oEvent.getSource().getBindingContext().getObject();
            MessageToast.show("Navigating to tour details: " + oItem.tourName);
        },

        onImagePress: function (oEvent) {
            var oItem = oEvent.getSource().getBindingContext().getObject();

            // Nếu Dialog chưa tồn tại, tạo mới
            if (!this._oImageDialog) {
                this._oImageDialog = new sap.m.Dialog({
                    title: "Tour Image",
                    content: new sap.m.Image({
                        id: this.getView().createId("dialogImage"), // Đặt ID cho Image để dễ truy cập
                        width: "400px",
                        height: "300px"
                    }),
                    beginButton: new sap.m.Button({
                        text: "Close",
                        press: function () {
                            this._oImageDialog.close();
                        }.bind(this)
                    })
                });
                this.getView().addDependent(this._oImageDialog);
            }

            // Cập nhật tiêu đề và src của ảnh mỗi lần mở Dialog
            this._oImageDialog.setTitle("Tour Image: " + oItem.tourName);
            this.byId("dialogImage").setSrc(oItem.imageUrl);

            // Mở Dialog
            this._oImageDialog.open();
        },

        _updateTableCount: function () {
            var oTable = this.byId("toursTable1");
            var iCount = oTable.getBinding("items").getLength();
            this.byId("tableCountText3").setText("Tours: " + iCount);
        }
    });
});