sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
    "sap/m/MessageBox",
    "sap/m/Panel",
    "sap/m/Title",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/TextArea",
    "sap/m/Input",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/TimePicker",
    "sap/m/CheckBox",
    "sap/ui/layout/form/SimpleForm",
    "sap/m/ToolbarSpacer"
], function (Controller, JSONModel, MessageToast, History, MessageBox,
    Panel, Title, Button, Label, TextArea, Input, VBox, HBox,
    TimePicker, CheckBox, SimpleForm, ToolbarSpacer) {
    "use strict";

    return Controller.extend("tourishui.controller.tour.CreateTourView", {
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("templateCreate").attachPatternMatched(this._onRouteMatched, this);

            // Model cho dữ liệu tour mới với cấu trúc mở rộng
            var oTourModel = new JSONModel({
                tourID: "",
                tourName: "",
                description: "",
                days: 1,
                nights: 0,
                type: "cultural",
                price: 0,
                childPrice: 0,
                includes: "",
                excludes: "",
                cancellationPolicy: "",
                terms: "",
                images: [],
                itinerary: []
            });
            this.getView().setModel(oTourModel, "tour");

            // Khởi tạo một ngày mặc định trong lịch trình
            this._initializeItinerary(1);
        },

        _onRouteMatched: function (oEvent) {
            var oModel = this.getOwnerComponent().getModel(); // Model từ TourList
            var aTours = oModel.getProperty("/createSampleTour") || [];
            var iNewID = aTours.length + 1;
            var sNewTourID = "TOUR" + iNewID.toString().padStart(3, "0");

            // Cập nhật tourID tự động
            this.getView().getModel("tour").setProperty("/tourID", sNewTourID);
        },

        onTourNameChange: function (oEvent) {
            // Tên tour đã được binding tự động cập nhật tiêu đề trang
            // Không cần thực hiện thêm - tiêu đề sẽ tự động cập nhật qua binding
        },
        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("createSampleTour");
          },

        onDaysChange: function (oEvent) {
            var iDays = parseInt(oEvent.getParameter("value")) || 1;
            var iNights = Math.max(0, iDays - 1);

            // Cập nhật số đêm tự động theo số ngày
            this.getView().getModel("tour").setProperty("/nights", iNights);

            // Khởi tạo lịch trình cho số ngày đã chọn
            this._initializeItinerary(iDays);
        },

        _initializeItinerary: function (iDays) {
            var oTourModel = this.getView().getModel("tour");
            var aCurrentItinerary = oTourModel.getProperty("/itinerary") || [];
            var aNewItinerary = [];

            // Giữ lại dữ liệu hiện có cho các ngày đã có
            for (var i = 0; i < iDays; i++) {
                if (i < aCurrentItinerary.length) {
                    aNewItinerary.push(aCurrentItinerary[i]);
                } else {
                    // Tạo cấu trúc dữ liệu mới cho ngày mới
                    aNewItinerary.push({
                        day: i + 1,
                        title: "Day " + (i + 1),
                        description: "",
                        meals: {
                            breakfast: false,
                            lunch: false,
                            dinner: false
                        },
                        activities: []
                    });
                }
            }

            oTourModel.setProperty("/itinerary", aNewItinerary);

            // Render lịch trình UI
            this._renderItineraryUI();
        },

        _renderItineraryUI: function () {
            var oItineraryContainer = this.byId("dynamicItineraryContainer");
            var oTourModel = this.getView().getModel("tour");
            var aItinerary = oTourModel.getProperty("/itinerary");

            // Xóa nội dung cũ
            if (oItineraryContainer) {
                oItineraryContainer.destroyContent();

                // Thêm các panel cho từng ngày
                aItinerary.forEach(function (oDayData, index) {
                    var iDay = index + 1;
                    var oDayPanel = new Panel({
                        expandable: true,
                        expanded: true,
                        headerText: "Day " + iDay + " - " + (oDayData.title || ""),
                        content: [
                            new SimpleForm({
                                editable: true,
                                layout: "ResponsiveGridLayout",
                                content: [
                                    new Label({ text: "Title of the day" }),
                                    new Input({
                                        value: "{tour>/itinerary/" + index + "/title}",
                                        placeholder: "Enter Title of the day... " + iDay
                                    }),

                                    new Label({ text: "Describe Overview" }),
                                    new TextArea({
                                        value: "{tour>/itinerary/" + index + "/description}",
                                        placeholder: "Description of the main activities of the day",
                                        rows: 2
                                    }),

                                    new Label({ text: "Meal included" }),
                                    new HBox({
                                        items: [
                                            new CheckBox({
                                                text: "Breakfast",
                                                selected: "{tour>/itinerary/" + index + "/meals/breakfast}"
                                            }),
                                            new CheckBox({
                                                text: "Lunch",
                                                selected: "{tour>/itinerary/" + index + "/meals/lunch}"
                                            }).addStyleClass("sapUiSmallMarginBegin"),
                                            new CheckBox({
                                                text: "Dinner",
                                                selected: "{tour>/itinerary/" + index + "/meals/dinner}"
                                            }).addStyleClass("sapUiSmallMarginBegin")
                                        ]
                                    }),

                                    new Label({ text: "Activities" }),
                                    new VBox({
                                        id: this.createId("activitiesContainer" + iDay),
                                        items: this._createActivityItems(index)
                                    }),

                                    new Button({
                                        text: "Add activity",
                                        icon: "sap-icon://add",
                                        press: this.onAddActivity.bind(this, index)
                                    }).addStyleClass("sapUiSmallMarginTop")
                                ]
                            })
                        ]
                    }).addStyleClass("sapUiSmallMarginBottom");

                    oItineraryContainer.addContent(oDayPanel);
                }.bind(this));
            }
        },

        _createActivityItems: function (iDayIndex) {
            var aActivityItems = [];
            var oTourModel = this.getView().getModel("tour");
            var aDayActivities = oTourModel.getProperty("/itinerary/" + iDayIndex + "/activities") || [];

            // Tạo UI cho mỗi hoạt động hiện có
            aDayActivities.forEach(function (oActivity, iActivityIndex) {
                aActivityItems.push(this._createActivityControl(iDayIndex, iActivityIndex));
            }.bind(this));

            // Nếu chưa có hoạt động nào, thêm một mẫu trống
            if (aDayActivities.length === 0) {
                this.onAddActivity(iDayIndex);
            }

            return aActivityItems;
        },

        _createActivityControl: function (iDayIndex, iActivityIndex) {
            var sPath = "/itinerary/" + iDayIndex + "/activities/" + iActivityIndex;

            return new VBox({
                items: [
                    new HBox({
                        alignItems: "Center",
                        items: [
                            new TimePicker({
                                value: "{tour>" + sPath + "/time}",
                                placeholder: "Time"
                            }).addStyleClass("sapUiSmallMarginEnd"),
                            new Input({
                                value: "{tour>" + sPath + "/title}",
                                placeholder: "Activity Title",
                            }),
                            new Button({
                                icon: "sap-icon://delete",
                                type: "Transparent",
                                press: this.onDeleteActivity.bind(this, iDayIndex, iActivityIndex)
                            }).addStyleClass("sapUiSmallMarginBegin")
                        ]
                    }),
                    new TextArea({
                        value: "{tour>" + sPath + "/description}",
                        placeholder: "Detailed description of the activity",
                        width: "100%",
                        rows: 2
                    }).addStyleClass("sapUiTinyMarginTop")
                ]
            }).addStyleClass("sapUiSmallMarginBottom");
        },

        onAddActivity: function (iDayIndex, oEvent) {
            var oTourModel = this.getView().getModel("tour");
            var sPath = "/itinerary/" + iDayIndex + "/activities";
            var aActivities = oTourModel.getProperty(sPath) || [];

            // Thêm hoạt động mới vào model
            aActivities.push({
                time: "",
                title: "",
                description: ""
            });

            oTourModel.setProperty(sPath, aActivities);

            // Thêm UI control cho hoạt động mới
            var oActivitiesContainer = this.byId("activitiesContainer" + (iDayIndex + 1));
            if (oActivitiesContainer) {
                var iNewActivityIndex = aActivities.length - 1;
                oActivitiesContainer.addItem(this._createActivityControl(iDayIndex, iNewActivityIndex));
            }
        },

        onDeleteActivity: function (iDayIndex, iActivityIndex, oEvent) {
            var oTourModel = this.getView().getModel("tour");
            var sPath = "/itinerary/" + iDayIndex + "/activities";
            var aActivities = oTourModel.getProperty(sPath) || [];

            // Xóa hoạt động khỏi mảng
            aActivities.splice(iActivityIndex, 1);
            oTourModel.setProperty(sPath, aActivities);

            // Render lại UI cho ngày này
            var oActivitiesContainer = this.byId("activitiesContainer" + (iDayIndex + 1));
            if (oActivitiesContainer) {
                oActivitiesContainer.removeAllItems();
                aActivities.forEach(function (oActivity, iIndex) {
                    oActivitiesContainer.addItem(this._createActivityControl(iDayIndex, iIndex));
                }.bind(this));
            }
        },

        onStartUpload: function () {
            // Kích hoạt quá trình tải lên ảnh
            var oUploadCollection = this.byId("tourImageUpload");
            if (oUploadCollection) {
                oUploadCollection.upload();
            }
        },

        onImageUploadComplete: function (oEvent) {
            var aFiles = oEvent.getParameter("files") || [];
            if (aFiles.length > 0) {
                var sFileName = aFiles[0].fileName;

                // Trong thực tế, cần lấy URL thực từ phản hồi của server
                var sImageUrl = "/resources/images/uploads/" + sFileName;

                var oTourModel = this.getView().getModel("tour");
                var aImages = oTourModel.getProperty("/images") || [];

                // Thêm ảnh mới vào danh sách
                aImages.push({
                    url: sImageUrl,
                    name: sFileName
                });

                oTourModel.setProperty("/images", aImages);
                MessageToast.show("Ảnh " + sFileName + " đã được tải lên thành công!");
            }
        },

        onShowItineraryHelp: function () {
            MessageBox.information(
                "To create a tour schedule:\n\n" +
                "1. Enter the number of days in the 'General Information' Tab\n" +
                "2. Add a title and description for each day\n" +
                "3. Choose meals included in the tour\n" +
                "4. Add detailed activities for each day\n\n" +
                "You can add multiple activities for each day and arrange them in chronological order.",
                { title: "Instructions for creating a schedule" }
            );
        },

        onSaveDraft: function () {
            var oTourModel = this.getView().getModel("tour");
            var oTourData = oTourModel.getData();

            // Validation cơ bản
            if (!oTourData.tourName) {
                MessageToast.show("Enter tour name before saving!");
                return;
            }

            // Lưu vào local storage hoặc backend
            try {
                // Trong thực tế sẽ gửi API request
                localStorage.setItem("tourDraft_" + oTourData.tourID, JSON.stringify(oTourData));
                MessageToast.show("Đã lưu bản nháp thành công!");
            } catch (e) {
                MessageToast.show("Không thể lưu bản nháp. Lỗi: " + e.message);
            }
        },

        onPreview: function () {
            // Hiển thị xem trước tour (có thể mở dialog hoặc chuyển trang)
            var oTourData = this.getView().getModel("tour").getData();

            if (!oTourData.tourName) {
                MessageToast.show("Vui lòng nhập tên tour trước khi xem trước!");
                return;
            }

            // Trong thực tế có thể chuyển đến màn hình xem trước
            MessageBox.information(
                "Chức năng xem trước sẽ hiển thị tour theo giao diện người dùng sẽ thấy khi tour được đăng.",
                {
                    title: "Xem trước: " + oTourData.tourName
                }
            );
        },

        onOpenForSale: function () {
            var oTourModel = this.getView().getModel("tour");
            var oNewTour = oTourModel.getData();

            // Kiểm tra dữ liệu bắt buộc
            if (!oNewTour.tourName) {
                MessageToast.show("Vui lòng nhập tên tour!");
                return;
            }

            if (!oNewTour.price || oNewTour.price <= 0) {
                MessageToast.show("Vui lòng nhập giá tour hợp lệ!");
                return;
            }

            if (oNewTour.days <= 0) {
                MessageToast.show("Số ngày tour phải lớn hơn 0!");
                return;
            }

            // Hiển thị dialog xác nhận
            MessageBox.confirm(
                "Bạn có chắc chắn muốn mở bán tour \"" + oNewTour.tourName + "\"?",
                {
                    title: "Xác nhận mở bán tour",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            this._saveTour(oNewTour);
                        }
                    }.bind(this)
                }
            );
        },

        _saveTour: function (oNewTour) {
            var oMainModel = this.getOwnerComponent().getModel();
            var aTours = oMainModel.getProperty("/Tours") || [];

            // Bổ sung thông tin bổ sung
            oNewTour.status = "Active";
            oNewTour.createdBy = this._getCurrentUser();
            oNewTour.createdDate = new Date().toISOString();

            aTours.push(oNewTour);
            oMainModel.setProperty("/Tours", aTours);

            MessageToast.show("Tour " + oNewTour.tourName + " đã được tạo và mở bán thành công!");
            this.onNavBack();
        },

        _getCurrentUser: function () {
            // Trong thực tế lấy từ service authentication
            return {
                id: "USER001",
                name: "Nhân viên kinh doanh"
            };
        },

    });
});