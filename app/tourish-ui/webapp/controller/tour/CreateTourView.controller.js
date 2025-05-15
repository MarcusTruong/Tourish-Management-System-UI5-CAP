sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
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
    "tourishui/model/CloudinaryAdapter"
], function (Controller, JSONModel, MessageToast, MessageBox, History, Fragment, Panel, Title, Button, Label, TextArea, Input, VBox, HBox, TimePicker, CheckBox, SimpleForm, CloudinaryAdapter) {
    "use strict";

    return Controller.extend("tourishui.controller.tour.CreateTourView", {
        onInit: function () { // Set up router
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("templateCreate").attachPatternMatched(this._onRouteMatched, this);

            // Initialize model for template data
            var oTourModel = new JSONModel({
                templateID: "",
                templateName: "",
                description: "",
                days: 1,
                nights: 0,
                tourType: "",
                adultPrice: 0,
                childPrice: 0,
                servicesIncluded: "",
                servicesNotIncluded: "",
                cancellationTerms: "",
                generalTerms: "",
                images: [],
                schedule: []
            });
            this.getView().setModel(oTourModel, "tour");

            // Initialize the step indicator model
            var oStepModel = new JSONModel({
                currentStep: 1, // 1 = General Info, 2 = Schedule, 3 = Price & Terms
                generalInfoComplete: false,
                scheduleComplete: false,
                priceTermsComplete: false
            });
            this.getView().setModel(oStepModel, "steps");

            // Initialize the first day in the schedule
            this._initializeSchedule(1);
        },

        _onRouteMatched: function (oEvent) { // Reset model data
            var oTourModel = this.getView().getModel("tour");
            oTourModel.setData({
                templateID: "",
                templateName: "",
                description: "",
                days: 1,
                nights: 0,
                tourType: "Cultural",
                adultPrice: 0,
                childPrice: 0,
                servicesIncluded: "",
                servicesNotIncluded: "",
                cancellationTerms: "",
                generalTerms: "",
                images: [],
                schedule: []
            });

            // Initialize schedule
            this._initializeSchedule(1);

            // Check if we're in edit mode (from route parameter or from component model)
            var oArgs = oEvent.getParameter("arguments");
            var sTemplateId = null;

            // Try to get template ID from route parameter
            if (oArgs && oArgs.templateId) {
                sTemplateId = oArgs.templateId;
                console.log("Template ID from route:", sTemplateId);
            }

            // If not in route, check the component model
            if (! sTemplateId) {
                var oTemplateEditModel = this.getOwnerComponent().getModel("templateEdit");
                if (oTemplateEditModel) {
                    sTemplateId = oTemplateEditModel.getProperty("/templateId");
                    console.log("Template ID from model:", sTemplateId);

                    // Clear the model after reading
                    oTemplateEditModel.setProperty("/templateId", null);
                }
            }

            // If we have a template ID, load it for editing
            if (sTemplateId) {
                this._loadTemplateForEdit(sTemplateId);
            }
        },

        onTemplateNameChange: function (oEvent) { // Template name has been bound to the page title via expression binding
        },

        onDaysChange: function (oEvent) {
            var iDays = parseInt(oEvent.getParameter("value") || "1");
            var iNights = Math.max(0, iDays - 1);

            // Update nights automatically based on days
            this.getView().getModel("tour").setProperty("/nights", iNights);

            // Update the schedule to match the number of days
            this._initializeSchedule(iDays);
        },

        onBeforeUploadStarts: function(oEvent) {
            // Không cần thêm CSRF token nếu endpoint không yêu cầu
            // Có thể thêm các header khác nếu cần
            
            // Thêm header Cache-Control để tránh cache
            var oUploadSetItem = oEvent.getParameter("item");
            var oCacheHeader = new sap.ui.core.Item({
                key: "Cache-Control",
                text: "no-cache"
            });
            oUploadSetItem.addHeaderField(oCacheHeader);
        },

        _formatFileSize: function (iBytes) {
            if (iBytes < 1024) {
                return iBytes + " B";
            } else if (iBytes < 1048576) {
                return(iBytes / 1024).toFixed(2) + " KB";
            } else {
                return(iBytes / 1048576).toFixed(2) + " MB";
            }
        },

        onTabSelect: function (oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedKey");
            var oStepModel = this.getView().getModel("steps");

            // Update the current step based on the selected tab
            switch (sSelectedKey) {
                case "general": oStepModel.setProperty("/currentStep", 1);
                    break;
                case "schedule": oStepModel.setProperty("/currentStep", 2);
                    break;
                case "priceTerms": oStepModel.setProperty("/currentStep", 3);
                    break;
            }

            // Validate and update completion status
            this._validateCurrentStep();
        },

        _validateCurrentStep: function () {
            var oStepModel = this.getView().getModel("steps");
            var oTourModel = this.getView().getModel("tour");
            var iCurrentStep = oStepModel.getProperty("/currentStep");

            switch (iCurrentStep) {
                case 1: // General Information
                    var bValid = !! oTourModel.getProperty("/templateName") && !! oTourModel.getProperty("/description") && oTourModel.getProperty("/days") > 0;
                    oStepModel.setProperty("/generalInfoComplete", bValid);
                    break;

                case 2: // Schedule
                    var aSchedule = oTourModel.getProperty("/schedule");
                    var bValid = aSchedule && aSchedule.length > 0 && aSchedule.every(function (oDay) {
                        return !! oDay.title && !! oDay.description && oDay.activities.length > 0;
                    });
                    oStepModel.setProperty("/scheduleComplete", bValid);
                    break;

                case 3: // Price & Terms
                    var bValid = oTourModel.getProperty("/adultPrice") > 0 && !! oTourModel.getProperty("/servicesIncluded") && !! oTourModel.getProperty("/cancellationTerms");
                    oStepModel.setProperty("/priceTermsComplete", bValid);
                    break;
            }
        },

        _initializeSchedule: function (iDays) {
            var oTourModel = this.getView().getModel("tour");
            var aCurrentSchedule = oTourModel.getProperty("/schedule") || [];
            var aNewSchedule = [];

            // Keep existing days if available
            for (var i = 0; i < iDays; i++) {
                if (i < aCurrentSchedule.length) {
                    aNewSchedule.push(aCurrentSchedule[i]);
                } else { // Create a new day with default values
                    aNewSchedule.push({
                        dayNumber: i + 1,
                        title: "Day " + (
                            i + 1
                        ),
                        description: "",
                        breakfast: false,
                        lunch: false,
                        dinner: false,
                        activities: [
                            {
                                startTime: "09:00",
                                endTime: "12:00",
                                title: "",
                                description: ""
                            }
                        ]
                    });
                }
            }

            // Update the model with the new schedule
            oTourModel.setProperty("/schedule", aNewSchedule);

            // Generate the UI for the schedule
            this._generateScheduleUI();
        },

        _generateScheduleUI: function () {
            var oScheduleContainer = this.byId("scheduleContainer");
            var oTourModel = this.getView().getModel("tour");
            var aSchedule = oTourModel.getProperty("/schedule");

            // Clear current content
            oScheduleContainer.destroyContent();

            // Create panels for each day
            aSchedule.forEach(function (oDay, iDayIndex) { // Create the panel with a dynamic header text binding
                var oDayPanel = new sap.m.Panel({
                    expandable: true,
                    expanded: iDayIndex === 0, // Expand the first day by default
                    headerText: {
                        parts: [
                            {
                                path: "tour>/schedule/" + iDayIndex + "/dayNumber"
                            }, {
                                path: "tour>/schedule/" + iDayIndex + "/title"
                            }
                        ],
                        formatter: function (dayNumber, title) {
                            return "Day " + dayNumber + ": " + (
                                title || ""
                            );
                        }
                    }
                }).addStyleClass("sapUiSmallMarginBottom");

                // Create a form for the day details
                var oDayForm = new sap.ui.layout.form.SimpleForm({
                    layout: "ResponsiveGridLayout",
                    editable: true,
                    content: [
                        new sap.m.Label(
                            {text: "Day Title"}
                        ),
                        new sap.m.Input(
                            {
                                value: "{tour>/schedule/" + iDayIndex + "/title}",
                                placeholder: "Enter title for Day " + oDay.dayNumber,
                                liveChange: function (oEvent) { // Optional - force panel header refresh if binding isn't working
                                    var sTitle = oEvent.getParameter("value");
                                    oDayPanel.invalidate();
                                }
                            }
                        ),

                        new sap.m.Label(
                            {text: "Day Overview"}
                        ),
                        new sap.m.TextArea(
                            {
                                value: "{tour>/schedule/" + iDayIndex + "/description}",
                                rows: 2,
                                placeholder: "Describe what happens on this day"
                            }
                        ),

                        new sap.m.Label(
                            {text: "Meals Included"}
                        ),
                        new sap.m.HBox(
                            {
                                items: [
                                    new sap.m.CheckBox(
                                        {
                                            text: "Breakfast",
                                            selected: "{tour>/schedule/" + iDayIndex + "/breakfast}"
                                        }
                                    ),
                                    new sap.m.CheckBox(
                                        {
                                            text: "Lunch",
                                            selected: "{tour>/schedule/" + iDayIndex + "/lunch}"
                                        }
                                    ).addStyleClass("sapUiSmallMarginBegin"),
                                    new sap.m.CheckBox(
                                        {
                                            text: "Dinner",
                                            selected: "{tour>/schedule/" + iDayIndex + "/dinner}"
                                        }
                                    ).addStyleClass("sapUiSmallMarginBegin")
                                ]
                            }
                        )
                    ]
                });

                // Add the form to the panel
                oDayPanel.addContent(oDayForm);

                // Add activity section
                var oActivitiesVBox = new sap.m.VBox();
                oActivitiesVBox.addItem(new sap.m.Title({text: "Activities", level: "H4"}).addStyleClass("sapUiSmallMarginTop"));

                // Add each activity
                this._addActivitiesToContainer(oActivitiesVBox, iDayIndex);

                // Add button to add more activities
                oActivitiesVBox.addItem(new sap.m.Button({
                    text: "Add Activity",
                    icon: "sap-icon://add",
                    press: this.onAddActivity.bind(this, iDayIndex)
                }).addStyleClass("sapUiSmallMarginTop"));

                // Add activities to the panel
                oDayPanel.addContent(oActivitiesVBox);

                // Add the panel to the container
                oScheduleContainer.addContent(oDayPanel);
            }.bind(this));
        },

        _addActivitiesToContainer: function (oContainer, iDayIndex) {
            var oTourModel = this.getView().getModel("tour");
            var aActivities = oTourModel.getProperty("/schedule/" + iDayIndex + "/activities") || [];

            // Create UI for each activity
            aActivities.forEach(function (oActivity, iActivityIndex) {
                var sPathPrefix = "/schedule/" + iDayIndex + "/activities/" + iActivityIndex;

                var oActivityBox = new VBox().addStyleClass("sapUiSmallMarginTop sapUiSmallMarginBottom");

                // Time and title row
                var oHeaderBox = new HBox({
                    alignItems: "Center",
                    items: [
                        new Input(
                            {
                                value: "{tour>" + sPathPrefix + "/title}",
                                placeholder: "Activity Title"
                            }
                        ).addStyleClass("sapUiSmallMarginEnd"),

                        new TimePicker(
                            {
                                value: "{tour>" + sPathPrefix + "/startTime}",
                                placeholder: "Start Time",
                                valueFormat: "HH:mm",
                                displayFormat: "HH:mm"
                            }
                        ).addStyleClass("sapUiSmallMarginEnd"),

                        // new Text({text: "to"}).addStyleClass("sapUiSmallMarginEnd"),

                        new TimePicker(
                            {
                                value: "{tour>" + sPathPrefix + "/endTime}",
                                placeholder: "End Time",
                                valueFormat: "HH:mm",
                                displayFormat: "HH:mm"
                            }
                        ).addStyleClass("sapUiSmallMarginEnd"),

                        new Button(
                            {
                                icon: "sap-icon://delete",
                                type: "Transparent",
                                press: this.onDeleteActivity.bind(this, iDayIndex, iActivityIndex)
                            }
                        )
                    ]
                });

                // Description
                var oDescBox = new VBox({
                    items: [
                        new Label(
                            {text: "Description"}
                        ).addStyleClass("sapUiTinyMarginTop"),
                        new TextArea(
                            {
                                value: "{tour>" + sPathPrefix + "/description}",
                                placeholder: "Detailed description of this activity",
                                rows: 2,
                                width: "100%"
                            }
                        )
                    ]
                });

                // Add to container
                oActivityBox.addItem(oHeaderBox);
                oActivityBox.addItem(oDescBox);

                // Add separator
                if (iActivityIndex < aActivities.length - 1) { // oActivityBox.addItem(new sap.m.Separator());
                }oContainer.addItem(oActivityBox);
            }.bind(this));
        },

        onAddActivity: function (iDayIndex) {
            var oTourModel = this.getView().getModel("tour");
            var aActivities = oTourModel.getProperty("/schedule/" + iDayIndex + "/activities") || [];

            // Add a new empty activity
            aActivities.push({startTime: "00:00", endTime: "12:00", title: "", description: ""});

            // Update the model
            oTourModel.setProperty("/schedule/" + iDayIndex + "/activities", aActivities);

            // Regenerate the UI
            var oScheduleContainer = this.byId("scheduleContainer");
            var aContent = oScheduleContainer.getContent();
            var oDayPanel = aContent[iDayIndex];
            var oActivitiesVBox = oDayPanel.getContent()[1];
            // The activities VBox is the second content item

            // Clear and recreate activities
            oActivitiesVBox.removeAllItems();
            oActivitiesVBox.addItem(new Title({text: "Activities", level: "H4"}).addStyleClass("sapUiSmallMarginTop"));

            this._addActivitiesToContainer(oActivitiesVBox, iDayIndex);

            // Re-add the "Add Activity" button
            oActivitiesVBox.addItem(new Button({
                text: "Add Activity",
                icon: "sap-icon://add",
                press: this.onAddActivity.bind(this, iDayIndex)
            }).addStyleClass("sapUiSmallMarginTop"));

            // Validate the schedule step
            this._validateCurrentStep();
        },

        onDeleteActivity: function (iDayIndex, iActivityIndex) {
            var oTourModel = this.getView().getModel("tour");
            var aActivities = oTourModel.getProperty("/schedule/" + iDayIndex + "/activities");

            // Don't delete if it's the only activity
            if (aActivities.length<= 1) {
                MessageToast.show("Cannot delete the only activity. At least one activity is required.");
                return;
            }
            
            // Remove the activity
            aActivities.splice(iActivityIndex, 1);
            oTourModel.setProperty("/schedule/" + iDayIndex + "/activities", aActivities);
            
            // Regenerate the UI for this day
            var oScheduleContainer = this.byId("scheduleContainer");
            var aContent = oScheduleContainer.getContent();
            var oDayPanel = aContent[iDayIndex];
            var oActivitiesVBox = oDayPanel.getContent()[1]; // The activities VBox is the second content item
            
            // Clear and recreate activities
            oActivitiesVBox.removeAllItems();
            oActivitiesVBox.addItem(new Title({
                text: "Activities", level: "H4"
            }).addStyleClass("sapUiSmallMarginTop"));
            
            this._addActivitiesToContainer(oActivitiesVBox, iDayIndex);
            
            // Re-add the "Add Activity" button
            oActivitiesVBox.addItem(new Button({
                text: "Add Activity", icon: "sap-icon://add", press: this.onAddActivity.bind(this, iDayIndex)
            }).addStyleClass("sapUiSmallMarginTop"));
            
            // Validate the schedule step
            this._validateCurrentStep();
        }, onShowScheduleHelp: function () {
            MessageBox.information(
                "Creating a Schedule:\n\n" +
                "1. Each day must have a title and description\n" +
                "2. Add at least one activity per day\n" +
                "3. Specify start and end times for each activity\n" +
                "4. Check the meals included for each day\n\n" +
                "You can add as many activities as needed for each day.", {
                    title: "Schedule Help"
                }
            );
        }, 

        onSaveTemplate: function () {
            this._saveTemplate("Published");
        },
        
        onSaveAsDraft: function () {
            // Validate at least the basic required fields
            var oTourModel = this.getView().getModel("tour");
            var sTemplateName = oTourModel.getProperty("/templateName");
            
            if (!sTemplateName) {
                MessageBox.error("Template name is required to save a draft.");
                return;
            }
            
            // Prepare the data for saving
            this._saveTemplate("Draft");
        }, 
        onCreateActiveTour: function() {
            // Lấy thông tin từ model tour
            var oTourModel = this.getView().getModel("tour");
            var sTemplateId = oTourModel.getProperty("/templateID");
            var sTemplateName = oTourModel.getProperty("/templateName");
            var sTemplateStatus = oTourModel.getProperty("/status");
            
            // Kiểm tra xem template đã được publish chưa
            if (sTemplateStatus === "Published") {
                // Mở dialog để tạo Active Tour
                this._openCreateActiveTourDialog(sTemplateId, sTemplateName);
            } else {
                // Thông báo lỗi nếu template chưa được publish
                MessageBox.error("Tour Template must be published before creating an Active Tour. Please complete and publish the template first.");
            }
        },
        
        _openCreateActiveTourDialog: function(sTemplateId, sTemplateName) {
            var oView = this.getView();
            
            // Tạo dialog lần đầu nếu chưa tồn tại
            if (!this._oActiveTourDialog) {
                // Load fragment
                Fragment.load({
                    id: oView.getId(),
                    name: "tourishui.view.fragments.CreateActiveTourDialog",
                    controller: this
                }).then(function(oDialog) {
                    // Kết nối dialog với view gốc
                    oView.addDependent(oDialog);
                    this._oActiveTourDialog = oDialog;
                    this._prepareActiveTourDialog(sTemplateId, sTemplateName);
                    oDialog.open();
                }.bind(this));
            } else {
                this._prepareActiveTourDialog(sTemplateId, sTemplateName);
                this._oActiveTourDialog.open();
            }
        },
        
        _prepareActiveTourDialog: function(sTemplateId, sTemplateName) {
            // Load danh sách người chịu trách nhiệm
            this._loadResponsiblePersons();
            
            // Khởi tạo dữ liệu form với giá trị mặc định
            var oDate = new Date();
            var oNextWeek = new Date(oDate);
            oNextWeek.setDate(oDate.getDate() + 7);
            
            var oNextMonth = new Date(oDate);
            oNextMonth.setDate(oDate.getDate() + 30);
            
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern: "yyyy-MM-dd"});
            
            // Tạo model cho dialog
            var oDialogModel = new JSONModel({
                templateID: sTemplateId,
                tourName: sTemplateName + " - " + oDateFormat.format(oDate), // Đề xuất tên mặc định
                departureDate: oDateFormat.format(oNextWeek), // Ngày khởi hành mặc định: tuần sau
                returnDate: oDateFormat.format(oNextMonth), // Ngày trở về mặc định: tháng sau
                saleStartDate: oDateFormat.format(oDate), // Ngày bắt đầu bán mặc định: hôm nay
                saleEndDate: oDateFormat.format(oNextWeek), // Ngày kết thúc bán mặc định: tuần sau
                maxCapacity: 20, // Sức chứa mặc định
                responsiblePersonID: "", // Sẽ được người dùng chọn
                formValid: false, // Trạng thái xác thực ban đầu
                Members: this._aResponsiblePersons || []
            });
            
            // Đặt model cho dialog
            this._oActiveTourDialog.setModel(oDialogModel, "activeTour");
        },
        
        _loadResponsiblePersons: function() {
            var oView = this.getView();
            var oUserService = this.getOwnerComponent().getModel("userService");
            
            // Lưu trữ dữ liệu thành viên để sử dụng sau
            var that = this;
        
            var oMembersContext = oUserService.bindContext("/getWorkspaceMembers(...)");
        
            oMembersContext.execute().then(function() {
                var oResult = oMembersContext.getBoundContext().getObject();
                
                // Debug để kiểm tra dữ liệu
                console.log("Members data:", oResult);
        
                var aMembers = Array.isArray(oResult) ? oResult : (oResult.value || []);
                
                // Lưu trữ danh sách thành viên vào một thuộc tính của controller
                that._aResponsiblePersons = aMembers;
                
                // Nếu dialog đã tồn tại, cập nhật model của nó
                if (that._oActiveTourDialog) {
                    var oActiveTourModel = that._oActiveTourDialog.getModel("activeTour");
                    if (oActiveTourModel) {
                        oActiveTourModel.setProperty("/Members", aMembers);
                        console.log("Model updated with members:", aMembers);
                    }
                }
                
                // Debug để xác nhận
                console.log("Responsible persons loaded:", aMembers.length);
            });
        },
        
        // Thêm các sự kiện xử lý dialog
        onCancelActiveTour: function() {
            this._oActiveTourDialog.close();
        },
        
        onSaveActiveTour: function() {
            var oActiveTourModel = this._oActiveTourDialog.getModel("activeTour");
            var oActiveTourData = oActiveTourModel.getData();
            
            // Kiểm tra dữ liệu trước khi lưu
            if (!oActiveTourData.tourName) {
                MessageBox.error("Please enter a tour name.");
                return;
            }
            
            if (!oActiveTourData.responsiblePersonID) {
                MessageBox.error("Please select a responsible person.");
                return;
            }
            
            // Chuyển đổi ngày từ string sang Date object để so sánh
            var oDepartureDate = new Date(oActiveTourData.departureDate);
            var oReturnDate = new Date(oActiveTourData.returnDate);
            var oSaleStartDate = new Date(oActiveTourData.saleStartDate);
            var oSaleEndDate = new Date(oActiveTourData.saleEndDate);
            
            if (oReturnDate <= oDepartureDate) {
                MessageBox.error("Return date must be after departure date.");
                return;
            }
            
            if (oSaleEndDate <= oSaleStartDate) {
                MessageBox.error("Sale end date must be after sale start date.");
                return;
            }
            
            // Set busy state
            this._oActiveTourDialog.setBusy(true);
            
            // Lấy OData model
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            // Tạo context cho action createActiveTour
            var oContext = oModel.bindContext("/createActiveTour(...)");
            
            // Set các tham số
            oContext.setParameter("templateID", oActiveTourData.templateID);
            oContext.setParameter("tourName", oActiveTourData.tourName);
            oContext.setParameter("departureDate", oActiveTourData.departureDate);
            oContext.setParameter("returnDate", oActiveTourData.returnDate);
            oContext.setParameter("saleStartDate", oActiveTourData.saleStartDate);
            oContext.setParameter("saleEndDate", oActiveTourData.saleEndDate);
            oContext.setParameter("maxCapacity", parseInt(oActiveTourData.maxCapacity) || 20);
            oContext.setParameter("responsiblePersonID", oActiveTourData.responsiblePersonID);
            
            // Execute action
            oContext.execute().then(function() {
                // Clear busy state
                this._oActiveTourDialog.setBusy(false);
                
                // Get result
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.tourID) {
                    // Show success message
                    MessageBox.success(
                        "Active tour '" + oResult.tourName + "' created successfully.", {
                            title: "Success",
                            onClose: function() {
                                // Close dialog
                                this._oActiveTourDialog.close();
                                
                                // Navigate to active tour detail if needed
                                // this.getOwnerComponent().getRouter().navTo("activeTourDetail", {
                                //     tourId: oResult.tourID
                                // });
                            }.bind(this)
                        }
                    );
                } else {
                    // Show error
                    MessageBox.error(
                        oResult.message || "Failed to create active tour."
                    );
                }
            }.bind(this)).catch(function(oError) {
                // Clear busy state
                this._oActiveTourDialog.setBusy(false);
                
                // Show error
                MessageBox.error(
                    "Error creating active tour: " + (oError.message || "Unknown error")
                );
            }.bind(this));
        },
        
        onCompleteTemplate: function () {
            // Validate all steps
            var oStepModel = this.getView().getModel("steps");
            
            // Force validation of all steps
            oStepModel.setProperty("/currentStep", 1);
            this._validateCurrentStep();
            oStepModel.setProperty("/currentStep", 2);
            this._validateCurrentStep();
            oStepModel.setProperty("/currentStep", 3);
            this._validateCurrentStep();
            
            var bGeneralInfoComplete = oStepModel.getProperty("/generalInfoComplete");
            var bScheduleComplete = oStepModel.getProperty("/scheduleComplete");
            var bPriceTermsComplete = oStepModel.getProperty("/priceTermsComplete");
            
            if (!bGeneralInfoComplete || !bScheduleComplete || !bPriceTermsComplete) {
                // Show validation errors
                var aMessages = [];
                
                if (!bGeneralInfoComplete) {
                    aMessages.push("- General Information: Please fill all required fields");
                }
                
                if (!bScheduleComplete) {
                    aMessages.push("- Schedule: Each day should have a title, description, and at least one activity");
                }
                
                if (!bPriceTermsComplete) {
                    aMessages.push("- Price & Terms: Adult price, included services, and cancellation terms are required");
                }
                
                MessageBox.error(
                    "Please complete all required information before publishing the template:\n\n" + 
                    aMessages.join("\n"), {
                        title: "Validation Error"
                    }
                );
                
                // Navigate to the first incomplete tab
                var oIconTabBar = this.byId("tourTabBar");
                if (!bGeneralInfoComplete) {
                    oIconTabBar.setSelectedKey("general");
                } else if (!bScheduleComplete) {
                    oIconTabBar.setSelectedKey("schedule");
                } else if (!bPriceTermsComplete) {
                    oIconTabBar.setSelectedKey("priceTerms");
                }
                
                return;
            }
            
            // Everything is valid, confirm completion
            MessageBox.confirm(
                "Are you sure you want to complete this template? Once completed, it will be available for creating active tours.", {
                    title: "Complete Template", actions: [MessageBox.Action.YES, MessageBox.Action.NO], emphasizedAction: MessageBox.Action.YES, onClose: function (sAction) {
                        if (sAction === MessageBox.Action.YES) {
                            // Save as published
                            this._saveTemplate("Published");
                        }
                    }.bind(this)
                }
            );
        }, 
        
        _saveTemplate: function (sStatus) {
            var oTourModel = this.getView().getModel("tour");
            var oTourData = oTourModel.getData();
            var sTemplateId = oTourData.templateID;
            console.log("templateID: ", sTemplateId);
            // Set busy state
            var oView = this.getView();
            oView.setBusy(true);
            
            // Get the OData model
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            // Check if we're creating or updating
            var bIsCreate = !sTemplateId;
            var sActionName = bIsCreate ? "createTourTemplateBasicInfo" : "updateTourTemplateBasicInfo";
            console.log(sActionName);
            // Step 1: Create/Update basic information
            var oContext;
            
            try {
                // Prepare parameters for first step
                if (bIsCreate) {
                    // Creating new template
                    oContext = oModel.bindContext("/" + sActionName + "(...)");
                    
                    oContext.setParameter("templateName", oTourData.templateName);
                    oContext.setParameter("description", oTourData.description);
                    oContext.setParameter("numberDays", oTourData.days);
                    oContext.setParameter("numberNights", oTourData.nights);
                    oContext.setParameter("tourType", oTourData.tourType);
                    oContext.setParameter("images", oTourData.images.map(function(oImage) {
                        return {
                            imageURL: oImage.url, caption: oImage.fileName, isMain: oImage.isMain
                        };
                    }));
                } else {
                    // Updating existing template
                    oContext = oModel.bindContext("/" + sActionName + "(...)");
                    
                    oContext.setParameter("templateID", oTourData.templateID);
                    oContext.setParameter("templateName", oTourData.templateName);
                    oContext.setParameter("description", oTourData.description);
                    oContext.setParameter("numberDays", oTourData.days);
                    oContext.setParameter("numberNights", oTourData.nights);
                    oContext.setParameter("tourType", oTourData.tourType);
                }
                
                // Execute the first step
                oContext.execute().then(function() {
                    // If creating, store the new template ID
                    var oResult = oContext.getBoundContext().getObject();
                    if (bIsCreate && oResult) {
                        console.log(oResult);
                        // Update the templateId variable with the new value from the backend
                        sTemplateId = oResult.templateID;
                        
                        // Also update the model
                        oTourModel.setProperty("/templateID", sTemplateId);
                        
                        console.log("New template created with ID:", sTemplateId);
                    }
                    
                    // Use the updated templateId for the next steps
                    this._saveSchedules(sTemplateId || oTourData.templateID, sStatus);
                }.bind(this)).catch(function(oError) {
                    // Handle error
                    oView.setBusy(false);
                    MessageBox.error("Error saving template basic information: " + this._getErrorMessage(oError));
                }.bind(this));
            } catch (oError) {
                oView.setBusy(false);
                MessageBox.error("Error preparing request: " + oError.message);
            }
        }, 
        
        _saveSchedules: function (sTemplateId, sStatus) {
            var oTourModel = this.getView().getModel("tour");
            var aSchedule = oTourModel.getProperty("/schedule");
            var oView = this.getView();
            
            console.log("Saving schedules for template ID:", sTemplateId);
            
            // Validate template ID
            if (!sTemplateId) {
                oView.setBusy(false);
                MessageBox.error("Template ID is missing. Cannot save schedules.");
                return;
            }
            
            // Get the OData model
            var oModel = this.getOwnerComponent().getModel("tourService");
            var bIsPublished = sStatus === "Published" && oTourModel.getProperty("/status") === "Published";
            
            try {
                // For published templates with existing schedules, we need to update them one by one
                if (bIsPublished || oTourModel.getProperty("/scheduleIds")) {
                    var aScheduleIds = oTourModel.getProperty("/scheduleIds") || [];
                    
                    // Check if we have schedule IDs stored from loading the template
                    if (aScheduleIds.length > 0) {
                        this._updateExistingSchedules(sTemplateId, aScheduleIds, aSchedule, sStatus);
                        return;
                    }
                }
                
                // If we don't have existing schedule IDs or it's a new template, add schedules
                this._addNewSchedules(sTemplateId, aSchedule, sStatus);
            } catch (oError) {
                oView.setBusy(false);
                MessageBox.error("Error preparing schedule request: " + oError.message);
            }
        },
        
        _updateExistingSchedules: function(sTemplateId, aScheduleIds, aSchedule, sStatus) {
            var oView = this.getView();
            var oModel = this.getOwnerComponent().getModel("tourService");
            var iUpdatedCount = 0;
            var iExpectedCount = Math.min(aScheduleIds.length, aSchedule.length);
            var bSuccess = true;
            var sErrorMessage = "";
            
            console.log("Updating existing schedules for template ID:", sTemplateId);
            
            // Process each schedule update one by one
            for (var i = 0; i < iExpectedCount; i++) {
                var sScheduleId = aScheduleIds[i];
                var oSchedule = aSchedule[i];
                
                // Create a context for updating this schedule
                var oContext = oModel.bindContext("/updateTourTemplateSchedule(...)");
                
                oContext.setParameter("scheduleID", sScheduleId);
                oContext.setParameter("dayTitle", oSchedule.title);
                oContext.setParameter("overview", oSchedule.description);
                oContext.setParameter("breakfastIncluded", oSchedule.breakfast);
                oContext.setParameter("lunchIncluded", oSchedule.lunch);
                oContext.setParameter("dinnerIncluded", oSchedule.dinner);
                
                // Execute the update - use a closure to capture the current index
                (function(iIndex) {
                    oContext.execute().then(function() {
                        var oResult = oContext.getBoundContext().getObject();
                        // Increment counter on success
                        if (oResult && oResult.success) {
                            iUpdatedCount++;
                        } else {
                            bSuccess = false;
                            sErrorMessage = oResult && oResult.message ? oResult.message : "Failed to update schedule " + (iIndex + 1);
                        }
                        
                        // Check if all updates are completed
                        if (iIndex === iExpectedCount - 1 || !bSuccess) {
                            if (bSuccess) {
                                console.log("Successfully updated " + iUpdatedCount + " of " + iExpectedCount + " schedules");
                                
                                // Handle any new schedules if days were added
                                if (aSchedule.length > aScheduleIds.length) {
                                    var aNewSchedules = aSchedule.slice(aScheduleIds.length);
                                    this._addAdditionalSchedules(sTemplateId, aNewSchedules, sStatus);
                                } else {
                                    // All updates completed successfully, continue with activities
                                    this._updateActivities(sTemplateId, aScheduleIds, aSchedule, sStatus);
                                }
                            } else {
                                // Show error message if any update failed
                                oView.setBusy(false);
                                MessageBox.error("Error updating schedules: " + sErrorMessage);
                            }
                        }
                    }.bind(this)).catch(function(oError) {
                        bSuccess = false;
                        oView.setBusy(false);
                        MessageBox.error("Error updating schedule " + (iIndex + 1) + ": " + this._getErrorMessage(oError));
                    }.bind(this));
                }.bind(this))(i);
            }
        },
        
        _updateActivities: function(sTemplateId, aScheduleIds, aSchedule, sStatus) {
            var oView = this.getView();
            var oModel = this.getOwnerComponent().getModel("tourService");
            var iTotalActivities = 0;
            var iProcessedActivities = 0;
            var iSuccessCount = 0;
            var bSuccess = true;
            var sErrorMessage = "";
            
            console.log("Updating activities for template schedules");
            
            // First, calculate total number of activities across all schedules
            for (var i = 0; i < aSchedule.length; i++) {
                if (i < aScheduleIds.length) { // Only count activities for existing schedules
                    iTotalActivities += aSchedule[i].activities.length;
                }
            }
            
            // If no activities to update, proceed to price terms
            if (iTotalActivities === 0) {
                console.log("No activities to update");
                this._savePriceTerms(sTemplateId, sStatus);
                return;
            }
            
            // Process each schedule's activities
            for (var j = 0; j < Math.min(aScheduleIds.length, aSchedule.length); j++) {
                var sScheduleId = aScheduleIds[j];
                var oSchedule = aSchedule[j];
                var aActivities = oSchedule.activities || [];
                
                // Process each activity for this schedule
                for (var k = 0; k < aActivities.length; k++) {
                    var oActivity = aActivities[k];
                    
                    // Determine if this is an update or add operation
                    if (oActivity.id) {
                        // Update existing activity
                        var oUpdateContext = oModel.bindContext("/updateActivity(...)");
                        
                        oUpdateContext.setParameter("activityID", oActivity.id);
                        oUpdateContext.setParameter("startTime", oActivity.startTime);
                        oUpdateContext.setParameter("endTime", oActivity.endTime);
                        oUpdateContext.setParameter("title", oActivity.title);
                        oUpdateContext.setParameter("description", oActivity.description);
                        
                        // Use closure to capture current indices
                        (function(iScheduleIndex, iActivityIndex, iTotal) {
                            oUpdateContext.execute().then(function() {
                                var oResult = oUpdateContext.getBoundContext().getObject();
                                iProcessedActivities++;
                                
                                if (oResult && oResult.success) {
                                    iSuccessCount++;
                                } else {
                                    bSuccess = false;
                                    sErrorMessage = oResult && oResult.message ? 
                                        oResult.message : 
                                        "Failed to update activity " + (iActivityIndex + 1) + " in schedule " + (iScheduleIndex + 1);
                                    console.error(sErrorMessage);
                                }
                                
                                // Check if all activities have been processed
                                if (iProcessedActivities === iTotal || !bSuccess) {
                                    _checkActivitiesCompletion(iSuccessCount, iTotal, bSuccess, sErrorMessage);
                                }
                            }).catch(function(oError) {
                                iProcessedActivities++;
                                bSuccess = false;
                                var sError = "Error updating activity " + (iActivityIndex + 1) + 
                                            " in schedule " + (iScheduleIndex + 1) + ": " + 
                                            this._getErrorMessage(oError);
                                console.error(sError);
                                
                                // Check if all activities have been processed
                                if (iProcessedActivities === iTotal || !bSuccess) {
                                    _checkActivitiesCompletion(iSuccessCount, iTotal, bSuccess, sError);
                                }
                            }.bind(this));
                        }.bind(this))(j, k, iTotalActivities);
                        
                    } else {
                        // Add new activity
                        var oAddContext = oModel.bindContext("/addActivityToSchedule(...)");
                        
                        oAddContext.setParameter("scheduleID", sScheduleId);
                        oAddContext.setParameter("startTime", oActivity.startTime);
                        oAddContext.setParameter("endTime", oActivity.endTime);
                        oAddContext.setParameter("title", oActivity.title);
                        oAddContext.setParameter("description", oActivity.description);
                        
                        // Use closure to capture current indices
                        (function(iScheduleIndex, iActivityIndex, iTotal) {
                            oAddContext.execute().then(function() {
                                var oResult = oAddContext.getBoundContext().getObject();
                                iProcessedActivities++;
                                
                                if (oResult && oResult.activityID) {
                                    iSuccessCount++;
                                    
                                    // Store the new ID in the model for future reference
                                    var sPath = "/schedule/" + iScheduleIndex + "/activities/" + iActivityIndex + "/id";
                                    this.getView().getModel("tour").setProperty(sPath, oResult.activityID);
                                } else {
                                    bSuccess = false;
                                    sErrorMessage = oResult && oResult.message ? 
                                        oResult.message : 
                                        "Failed to add activity " + (iActivityIndex + 1) + " to schedule " + (iScheduleIndex + 1);
                                    console.error(sErrorMessage);
                                }
                                
                                // Check if all activities have been processed
                                if (iProcessedActivities === iTotal || !bSuccess) {
                                    _checkActivitiesCompletion(iSuccessCount, iTotal, bSuccess, sErrorMessage);
                                }
                            }.bind(this)).catch(function(oError) {
                                iProcessedActivities++;
                                bSuccess = false;
                                var sError = "Error adding activity " + (iActivityIndex + 1) + 
                                            " to schedule " + (iScheduleIndex + 1) + ": " + 
                                            this._getErrorMessage(oError);
                                console.error(sError);
                                
                                // Check if all activities have been processed
                                if (iProcessedActivities === iTotal || !bSuccess) {
                                    _checkActivitiesCompletion(iSuccessCount, iTotal, bSuccess, sError);
                                }
                            }.bind(this));
                        }.bind(this))(j, k, iTotalActivities);
                    }
                }
            }
            
            // Helper function to check if all activities have been processed
            var _checkActivitiesCompletion = function(iSuccess, iTotal, bSuccessful, sError) {
                if (bSuccessful) {
                    console.log("Successfully processed " + iSuccess + " of " + iTotal + " activities");
                    // Continue with price terms
                    this._savePriceTerms(sTemplateId, sStatus);
                } else {
                    // Show error message
                    oView.setBusy(false);
                    MessageBox.error("Error updating activities: " + sError);
                }
            }.bind(this);
        },
        
        _addAdditionalSchedules: function(sTemplateId, aNewSchedules, sStatus) {
            var oView = this.getView();
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            console.log("Adding " + aNewSchedules.length + " new schedules");
            
            // Format schedules for the API
            var aSchedulesForApi = aNewSchedules.map(function(oDay) {
                return {
                    dayNumber: oDay.dayNumber,
                    dayTitle: oDay.title,
                    overview: oDay.description,
                    breakfastIncluded: oDay.breakfast,
                    lunchIncluded: oDay.lunch,
                    dinnerIncluded: oDay.dinner,
                    activities: oDay.activities.map(function(oActivity) {
                        return {
                            startTime: oActivity.startTime,
                            endTime: oActivity.endTime,
                            title: oActivity.title,
                            description: oActivity.description
                        };
                    })
                };
            });
            
            // Prepare parameters for adding schedules
            var oContext = oModel.bindContext("/addTourTemplateSchedules(...)");
            oContext.setParameter("templateID", sTemplateId);
            oContext.setParameter("schedules", aSchedulesForApi);
            
            // Execute the schedules step
            oContext.execute().then(function() {
                // Continue with price terms
                this._savePriceTerms(sTemplateId, sStatus);
            }.bind(this)).catch(function(oError) {
                // Handle error
                oView.setBusy(false);
                MessageBox.error("Error adding new schedules: " + this._getErrorMessage(oError));
            }.bind(this));
        },
        
        _addNewSchedules: function(sTemplateId, aSchedule, sStatus) {
            var oView = this.getView();
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            // Format schedules for the API
            var aSchedulesForApi = aSchedule.map(function(oDay) {
                return {
                    dayNumber: oDay.dayNumber,
                    dayTitle: oDay.title,
                    overview: oDay.description,
                    breakfastIncluded: oDay.breakfast,
                    lunchIncluded: oDay.lunch,
                    dinnerIncluded: oDay.dinner,
                    activities: oDay.activities.map(function(oActivity) {
                        return {
                            startTime: oActivity.startTime,
                            endTime: oActivity.endTime,
                            title: oActivity.title,
                            description: oActivity.description
                        };
                    })
                };
            });
            
            // Prepare parameters for adding schedules
            var oContext = oModel.bindContext("/addTourTemplateSchedules(...)");
            oContext.setParameter("templateID", sTemplateId);
            oContext.setParameter("schedules", aSchedulesForApi);
            
            // Execute the schedules step
            oContext.execute().then(function() {
                // Continue with price terms
                this._savePriceTerms(sTemplateId, sStatus);
            }.bind(this)).catch(function(oError) {
                // Handle error
                oView.setBusy(false);
                MessageBox.error("Error adding schedules: " + this._getErrorMessage(oError));
            }.bind(this));
        }, 
        
        _savePriceTerms: function (sTemplateId, sStatus) {
            var oTourModel = this.getView().getModel("tour");
            var oTourData = oTourModel.getData();
            var oView = this.getView();
            
            // Get the OData model
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            try {
                // Prepare parameters for price terms
                var oContext = oModel.bindContext("/addTourTemplatePriceTerms(...)");
                
                oContext.setParameter("templateID", sTemplateId);
                oContext.setParameter("adultPrice", parseFloat(oTourData.adultPrice) || 0);
                oContext.setParameter("childrenPrice", parseFloat(oTourData.childPrice) || 0);
                oContext.setParameter("servicesIncluded", oTourData.servicesIncluded);
                oContext.setParameter("servicesNotIncluded", oTourData.servicesNotIncluded);
                oContext.setParameter("cancellationTerms", oTourData.cancellationTerms);
                oContext.setParameter("generalTerms", oTourData.generalTerms);
                
                // Execute the price terms step
                oContext.execute().then(function() {
                    // Final step: Update status if needed
                    if (sStatus === "Published") {
                        this._completeTemplate(sTemplateId);
                    } else {
                        // Template saved as draft
                        oView.setBusy(false);
                        MessageToast.show("Tour template saved as draft");
                        
                        // Navigate back
                        this.onNavBack();
                    }
                }.bind(this)).catch(function(oError) {
                    // Handle error
                    oView.setBusy(false);
                    MessageBox.error("Error saving price and terms: " + this._getErrorMessage(oError));
                }.bind(this));
            } catch (oError) {
                oView.setBusy(false);
                MessageBox.error("Error preparing price terms request: " + oError.message);
            }
        }, _completeTemplate: function (sTemplateId) {
            var oView = this.getView();
            
            // Get the OData model
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            try {
                // Prepare parameters to complete the template
                var oContext = oModel.bindContext("/completeTourTemplateCreation(...)");
                
                oContext.setParameter("templateID", sTemplateId);
                
                // Execute the completion
                oContext.execute().then(function() {
                    var oResult = oContext.getBoundContext().getObject();
                    oView.setBusy(false);
                    
                    if (oResult && oResult.success) {
                        MessageBox.success(
                            "Tour template published successfully.", {
                                title: "Success", onClose: function() {
                                    // Navigate back
                                    this.onNavBack();
                                }.bind(this)
                            }
                        );
                    } else {
                        // Some validation failed
                        MessageBox.warning(
                            "Could not publish template: " + (oResult.message || "Unknown error"), {
                                title: "Warning"
                            }
                        );
                    }
                }.bind(this)).catch(function(oErtemplateEditror) {
                    // Handle error
                    oView.setBusy(false);
                    MessageBox.error("Error completing template: " + this._getErrorMessage(oError));
                }.bind(this));
            } catch (oError) {
                oView.setBusy(false);
                MessageBox.error("Error preparing completion request: " + oError.message);
            }
        }, onPreview: function () {
            // Validate at least the basic fields
            var oTourModel = this.getView().getModel("tour");
            var sTemplateName = oTourModel.getProperty("/templateName");
            
            if (!sTemplateName) {
                MessageBox.error("Template name is required for preview.");
                return;
            }
            
            // Show a preview dialog (simplified)
            MessageBox.information(
                "Preview functionality will be implemented in the future.", {
                    title: "Preview"
                }
            );
        }, onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
            
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("tour", {}, true);
            }
        }, _loadTemplateForEdit: function (sTemplateId) {
            // Set busy state
            var oView = this.getView();
            oView.setBusy(true);
            
            // Get the OData model
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            try {
                // Create a context for the function import
                var oContext = oModel.bindContext("/getTourTemplateDetails(...)");
                
                // Set template ID parameter
                oContext.setParameter("templateID", sTemplateId);
                
                // Execute the function import and handle the result
                oContext.execute().then(function() {
                    try {
                        // Get the result data
                        var oResult = oContext.getBoundContext().getObject();
                        
                        if (oResult) {
                            this._fillTemplateDataForEdit(oResult);
                        } else {
                            MessageBox.error("Template not found");
                            this.onNavBack();
                        }
                    } catch (oError) {
                        console.error("Error processing template data:", oError);
                        MessageBox.error("Error processing template data");
                        this.onNavBack();
                    } finally {
                        // Clear busy state
                        oView.setBusy(false);
                    }
                }.bind(this)).catch(function(oError) {
                    // Handle error
                    console.error("Error loading template:", oError);
                    MessageBox.error("Error loading template: " + this._getErrorMessage(oError));
                    oView.setBusy(false);
                    this.onNavBack();
                }.bind(this));
            } catch (oError) {
                // Handle binding error
                console.error("Error binding context:", oError);
                MessageBox.error("Error preparing request");
                oView.setBusy(false);
                this.onNavBack();
            }
        }, 

        _fillTemplateDataForEdit: function (oTemplateData) {
            var oTourModel = this.getView().getModel("tour");
            
            // Basic information
            oTourModel.setProperty("/templateID", oTemplateData.template.ID);
            oTourModel.setProperty("/templateName", oTemplateData.template.TemplateName);
            oTourModel.setProperty("/description", oTemplateData.template.Description);
            oTourModel.setProperty("/days", oTemplateData.template.NumberDays);
            oTourModel.setProperty("/nights", oTemplateData.template.NumberNights);
            oTourModel.setProperty("/tourType", oTemplateData.template.TourType);
            oTourModel.setProperty("/status", oTemplateData.template.Status);
            
            // Images
            var aImages = [];
            if (oTemplateData.images && oTemplateData.images.length > 0) {
                aImages = oTemplateData.images.map(function(oImage) {
                    return {
                        id: oImage.ID,
                        fileName: oImage.Caption || "Image",
                        url: oImage.ImageURL,
                        thumbnailUrl: oImage.ImageURL,
                        isMain: oImage.IsMain,
                        attributes: [{
                            title: "Type",
                            text: "Image"
                        }]
                    };
                });
            }
            oTourModel.setProperty("/images", aImages);
            
            // Schedules
            var aSchedule = [];
            var aScheduleIds = [];
            
            if (oTemplateData.schedules && oTemplateData.schedules.length > 0) {
                // Extract schedule IDs and store them for later use
                aScheduleIds = oTemplateData.schedules.map(function(oSchedule) {
                    return oSchedule.ID;
                });
                
                aSchedule = oTemplateData.schedules.map(function(oSchedule) {
                    var aActivities = [];
                    
                    if (oSchedule.Activities && oSchedule.Activities.length > 0) {
                        aActivities = oSchedule.Activities.map(function(oActivity) {
                            return {
                                id: oActivity.ID, // Store activity ID for updates
                                startTime: oActivity.StartTime,
                                endTime: oActivity.EndTime,
                                title: oActivity.Title,
                                description: oActivity.Description
                            };
                        });
                    } else {
                        // Default activity if none exists
                        aActivities = [{
                            startTime: "09:00",
                            endTime: "12:00",
                            title: "",
                            description: ""
                        }];
                    }
                    
                    return {
                        id: oSchedule.ID, // Store schedule ID for updates
                        dayNumber: oSchedule.DayNumber,
                        title: oSchedule.DayTitle,
                        description: oSchedule.Overview,
                        breakfast: oSchedule.BreakfastIncluded,
                        lunch: oSchedule.LunchIncluded,
                        dinner: oSchedule.DinnerIncluded,
                        activities: aActivities
                    };
                });
            } else {
                // Create default schedules if none exists
                for (var i = 0; i < oTemplateData.template.NumberDays; i++) {
                    aSchedule.push({
                        dayNumber: i + 1,
                        title: "Day " + (i + 1),
                        description: "",
                        breakfast: false,
                        lunch: false,
                        dinner: false,
                        activities: [{
                            startTime: "09:00",
                            endTime: "12:00",
                            title: "",
                            description: ""
                        }]
                    });
                }
            }
            
            // Store schedule IDs for use in updates
            oTourModel.setProperty("/scheduleIds", aScheduleIds);
            oTourModel.setProperty("/schedule", aSchedule);
            
            // Price terms
            if (oTemplateData.priceTerms) {
                oTourModel.setProperty("/adultPrice", oTemplateData.priceTerms.AdultPrice);
                oTourModel.setProperty("/childPrice", oTemplateData.priceTerms.ChildrenPrice);
                oTourModel.setProperty("/servicesIncluded", oTemplateData.priceTerms.ServicesIncluded);
                oTourModel.setProperty("/servicesNotIncluded", oTemplateData.priceTerms.ServicesNotIncluded);
                oTourModel.setProperty("/cancellationTerms", oTemplateData.priceTerms.CancellationTerms);
                oTourModel.setProperty("/generalTerms", oTemplateData.priceTerms.GeneralTerms);
            }
            
            // Regenerate UI for schedules
            this._generateScheduleUI();
            
            // Update page title to show we're editing an existing template
            var oPage = this.byId("createTourPage");
            if (oPage) {
                oPage.setTitle("Edit Template: " + oTemplateData.template.TemplateName);
            }
            
            // Update status indicators
            this._validateCurrentStep();
        },

        _getErrorMessage: function (oError) {
            if (oError.responseText) {
                try {
                    var oErrorResponse = JSON.parse(oError.responseText);
                    if (oErrorResponse.error && oErrorResponse.error.message) {
                        return oErrorResponse.error.message;
                    }
                } catch (e) { // Parsing error, fallback to default
                }
            } else if (oError.message) {
                return oError.message;
            }
            return "An unknown error occurred";
        },

// Phương thức xử lý sau khi upload hoàn tất
onImageUploadComplete: function(oEvent) {
    // Lấy các model và item cần thiết
    var oUploadSet = this.byId("templateImageUpload");
    var oTourModel = this.getView().getModel("tour");
    var aImages = oTourModel.getProperty("/images") || [];
    var oUploadSetItem = oEvent.getParameter("item");
    var sResponseText = oEvent.getParameter("response");
    
    try {
        // Parse response từ server
        var oResponse = JSON.parse(sResponseText);
        
        // Kiểm tra phản hồi từ server
        if (oResponse && oResponse.success) {
            // Xác định xem đây có phải là ảnh đầu tiên không (để set làm ảnh chính)
            var bIsMain = aImages.length === 0;
            
            // Tạo đối tượng ảnh mới
            var oNewImage = {
                id: null, // Sẽ được cập nhật sau khi lưu template
                fileName: oResponse.fileName,
                url: oResponse.url,
                thumbnailUrl: oResponse.url,
                cloudinaryPublicId: oResponse.public_id,
                isMain: bIsMain,
                pendingSave: true,
                attributes: [{
                    title: "Size",
                    text: this._formatFileSize(oResponse.fileSize || oUploadSetItem.getFileObject().size)
                }]
            };
            
            // Thêm ảnh đã upload vào model
            aImages.push(oNewImage);
            oTourModel.setProperty("/images", aImages);
            
            // Cập nhật trạng thái upload thành công
            oUploadSetItem.setUploadState("Complete");
            MessageToast.show("Ảnh đã được tải lên thành công");
            
            // Lưu ảnh vào database nếu đã có template ID
            var sTemplateId = oTourModel.getProperty("/templateID");
            if (sTemplateId) {
                this._saveImageToDatabase(oNewImage, sTemplateId);
            }
        } else {
            // Xử lý lỗi
            oUploadSetItem.setUploadState("Error");
            MessageBox.error("Upload không thành công: " + (oResponse.message || "Lỗi không xác định"));
        }
    } catch (oError) {
        // Xử lý lỗi khi parse JSON hoặc xử lý phản hồi
        console.error("Lỗi khi xử lý phản hồi từ server:", oError, sResponseText);
        oUploadSetItem.setUploadState("Error");
        MessageBox.error("Lỗi khi xử lý phản hồi từ server: " + oError.message);
    }
},

// Phương thức lưu ảnh vào database
_saveImageToDatabase: function(oImage, sTemplateId) {
    // Lấy model
    var oModel = this.getOwnerComponent().getModel("tourService");
    var oTourModel = this.getView().getModel("tour");
    var aImages = oTourModel.getProperty("/images");
    var iLastIndex = aImages.indexOf(oImage);
    
    if (iLastIndex === -1) {
        console.error("Không tìm thấy ảnh trong model");
        return;
    }
    
    try {
        // Tạo context cho function import
        var oContext = oModel.bindContext("/addImageToTemplate(...)");
        
        // Thiết lập tham số
        oContext.setParameter("templateID", sTemplateId);
        oContext.setParameter("imageURL", oImage.url);
        oContext.setParameter("caption", oImage.fileName);
        oContext.setParameter("isMain", oImage.isMain);
        oContext.setParameter("cloudinaryPublicId", oImage.cloudinaryPublicId); // Thêm public_id
        
        // Thực thi function
        oContext.execute()
            .then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.imageID) {
                    // Cập nhật ID cho ảnh trong model
                    oTourModel.setProperty("/images/" + iLastIndex + "/id", oResult.imageID);
                    oTourModel.setProperty("/images/" + iLastIndex + "/pendingSave", false);
                    MessageToast.show("Ảnh đã được lưu vào cơ sở dữ liệu");
                } else {
                    // Xử lý lỗi
                    MessageBox.error("Không thể lưu ảnh: " + (oResult.message || "Lỗi không xác định"));
                }
            })
            .catch(function(oError) {
                // Xử lý lỗi thực thi
                MessageBox.error("Lỗi khi lưu ảnh: " + this._getErrorMessage(oError));
            }.bind(this));
    } catch (oError) {
        // Xử lý lỗi binding
        MessageBox.error("Lỗi chuẩn bị yêu cầu lưu: " + oError.message);
    }
},

// Phương thức xử lý khi ảnh bị xóa
onFileDeleted: function(oEvent) {
    var oItem = oEvent.getParameter("item");
    var oTourModel = this.getView().getModel("tour");
    var aImages = oTourModel.getProperty("/images");
    var oBindingContext = oItem.getBindingContext("tour");
    
    if (!oBindingContext) {
        console.error("Missing binding context for deleted item");
        return;
    }
    
    var sPath = oBindingContext.getPath();
    var iIndex = parseInt(sPath.substring(sPath.lastIndexOf("/") + 1));
    var oImage = aImages[iIndex];
    
    if (!oImage) {
        console.error("Image not found at index", iIndex);
        return;
    }
    
    // Nếu ảnh có Cloudinary public ID, xóa từ Cloudinary thông qua server
    if (oImage.cloudinaryPublicId) {
        jQuery.ajax({
            url: "/api/cloudinary/delete/" + encodeURIComponent(oImage.cloudinaryPublicId),
            method: "DELETE",
            success: function() {
                console.log("Ảnh đã được xóa từ Cloudinary");
            },
            error: function(oError) {
                console.warn("Không thể xóa ảnh từ Cloudinary:", oError);
                // Vẫn tiếp tục quy trình xóa ngay cả khi không thể xóa từ Cloudinary
            }
        });
    }
    
    // Nếu ảnh chưa được lưu vào database, chỉ cần xóa khỏi model
    if (!oImage.id) {
        aImages.splice(iIndex, 1);
        oTourModel.setProperty("/images", aImages);
        return;
    }
    
    // Ảnh đã tồn tại trong database, gọi removeImageFromTemplate
    var oModel = this.getOwnerComponent().getModel("tourService");
    
    try {
        // Tạo context cho function import
        var oContext = oModel.bindContext("/removeImageFromTemplate(...)");
        
        // Thiết lập tham số
        oContext.setParameter("imageID", oImage.id);
        
        // Thực thi function
        oContext.execute()
            .then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.success) {
                    // Xóa ảnh khỏi model
                    aImages.splice(iIndex, 1);
                    oTourModel.setProperty("/images", aImages);
                    MessageToast.show("Đã xóa ảnh thành công");
                    
                    // Nếu đây là ảnh chính và còn ảnh khác, đặt ảnh đầu tiên làm ảnh chính
                    if (oImage.isMain && aImages.length > 0) {
                        oTourModel.setProperty("/images/0/isMain", true);
                        
                        // Nếu đã có template ID, cập nhật ảnh chính trong database
                        var sTemplateId = oTourModel.getProperty("/templateID");
                        if (sTemplateId && aImages[0].id) {
                            this._setMainImageInDatabase(aImages[0].id, sTemplateId);
                        }
                    }
                } else {
                    // Xử lý lỗi
                    MessageBox.error("Không thể xóa ảnh: " + (oResult.message || "Lỗi không xác định"));
                }
            }.bind(this))
            .catch(function(oError) {
                // Xử lý lỗi thực thi
                MessageBox.error("Lỗi khi xóa ảnh: " + this._getErrorMessage(oError));
            }.bind(this));
    } catch (oError) {
        // Xử lý lỗi binding
        MessageBox.error("Lỗi chuẩn bị yêu cầu xóa: " + oError.message);
    }
},

// Phương thức thiết lập ảnh chính
onSetAsMainImage: function(oEvent) {
    var oButton = oEvent.getSource();
    var oItem = oButton.getParent();
    var oContext = oItem.getBindingContext("tour");
    
    if (!oContext) {
        console.error("Missing binding context");
        return;
    }
    
    var sPath = oContext.getPath();
    var oTourModel = this.getView().getModel("tour");
    var aImages = oTourModel.getProperty("/images");
    var iIndex = parseInt(sPath.substring(sPath.lastIndexOf("/") + 1));
    var oImage = aImages[iIndex];
    
    if (!oImage) {
        console.error("Image not found at index", iIndex);
        return;
    }
    
    var sTemplateId = oTourModel.getProperty("/templateID");
    
    // Nếu chưa có template ID hoặc ảnh chưa được lưu, chỉ cập nhật model
    if (!sTemplateId || !oImage.id) {
        // Thiết lập tất cả ảnh thành non-main
        aImages.forEach(function(oImg, i) {
            oTourModel.setProperty("/images/" + i + "/isMain", false);
        });
        
        // Thiết lập ảnh được chọn thành main
        oTourModel.setProperty(sPath + "/isMain", true);
        MessageToast.show("Đã thiết lập ảnh chính thành công");
        return;
    }
    
    // Đã có template ID và image ID, gọi setMainImage
    this._setMainImageInDatabase(oImage.id, sTemplateId);
},

// Phương thức hỗ trợ để thiết lập ảnh chính trong database
_setMainImageInDatabase: function(sImageId, sTemplateId) {
    var oModel = this.getOwnerComponent().getModel("tourService");
    var oTourModel = this.getView().getModel("tour");
    var aImages = oTourModel.getProperty("/images");
    
    try {
        // Tạo context cho function import
        var oContext = oModel.bindContext("/setMainImage(...)");
        
        // Thiết lập tham số
        oContext.setParameter("imageID", sImageId);
        oContext.setParameter("templateID", sTemplateId);
        
        // Thực thi function
        oContext.execute()
            .then(function() {
                var oResult = oContext.getBoundContext().getObject();
                
                if (oResult && oResult.success) {
                    // Cập nhật model
                    aImages.forEach(function(oImg, i) {
                        oTourModel.setProperty("/images/" + i + "/isMain", oImg.id === sImageId);
                    });
                    MessageToast.show("Đã thiết lập ảnh chính thành công");
                } else {
                    // Xử lý lỗi
                    MessageBox.error("Không thể thiết lập ảnh chính: " + (oResult.message || "Lỗi không xác định"));
                }
            })
            .catch(function(oError) {
                // Xử lý lỗi thực thi
                MessageBox.error("Lỗi khi thiết lập ảnh chính: " + this._getErrorMessage(oError));
            }.bind(this));
    } catch (oError) {
        // Xử lý lỗi binding
        MessageBox.error("Lỗi chuẩn bị yêu cầu thiết lập ảnh chính: " + oError.message);
    }
},

// Phương thức xử lý các ảnh đang chờ khi lưu template mới
_processPendingImages: function(sTemplateId) {
    var oTourModel = this.getView().getModel("tour");
    var aImages = oTourModel.getProperty("/images") || [];
    var aPendingImages = aImages.filter(function(oImage) {
        return oImage.pendingSave;
    });
    
    if (aPendingImages.length === 0) {
        return Promise.resolve();
    }
    
    // Đã có ảnh đang chờ để lưu
    var oModel = this.getOwnerComponent().getModel("tourService");
    var aPromises = [];
    
    // Xử lý từng ảnh đang chờ
    aPendingImages.forEach(function(oImage, iIndex) {
        var pSaveImage = new Promise(function(resolve, reject) {
            try {
                // Tạo context cho function import
                var oContext = oModel.bindContext("/addImageToTemplate(...)");
                
                // Thiết lập tham số
                oContext.setParameter("templateID", sTemplateId);
                oContext.setParameter("imageURL", oImage.url);
                oContext.setParameter("caption", oImage.fileName);
                oContext.setParameter("isMain", oImage.isMain);
                oContext.setParameter("cloudinaryPublicId", oImage.cloudinaryPublicId);
                
                // Thực thi function
                oContext.execute()
                    .then(function() {
                        var oResult = oContext.getBoundContext().getObject();
                        
                        if (oResult && oResult.imageID) {
                            // Tìm chỉ mục thực tế của ảnh trong mảng
                            var iActualIndex = aImages.indexOf(oImage);
                            if (iActualIndex !== -1) {
                                // Cập nhật ảnh với ID mới
                                aImages[iActualIndex].id = oResult.imageID;
                                aImages[iActualIndex].pendingSave = false;
                            }
                            resolve();
                        } else {
                            // Xử lý lỗi
                            reject(oResult.message || "Lỗi không xác định");
                        }
                    })
                    .catch(function(oError) {
                        // Xử lý lỗi thực thi
                        reject(this._getErrorMessage(oError));
                    }.bind(this));
            } catch (oError) {
                // Xử lý lỗi binding
                reject(oError.message);
            }
        }.bind(this));
        
        aPromises.push(pSaveImage);
    }.bind(this));
    
    // Đợi tất cả ảnh được lưu
    return Promise.all(aPromises)
        .then(function() {
            // Cập nhật model
            oTourModel.setProperty("/images", aImages);
            return Promise.resolve();
        })
        .catch(function(sError) {
            // Xử lý lỗi
            return Promise.reject("Lỗi khi lưu ảnh: " + sError);
        });
},


// Cập nhật phương thức _saveTemplate để xử lý ảnh đang chờ
_saveTemplate: function(sStatus) {
    var oTourModel = this.getView().getModel("tour");
    var oTourData = oTourModel.getData();
    var sTemplateId = oTourData.templateID;
    console.log("templateID: ", sTemplateId);
    
    // Set busy state
    var oView = this.getView();
    oView.setBusy(true);
    
    // Get the OData model
    var oModel = this.getOwnerComponent().getModel("tourService");
    
    // Check if we're creating or updating
    var bIsCreate = !sTemplateId;
    var sActionName = bIsCreate ? "createTourTemplateBasicInfo" : "updateTourTemplateBasicInfo";
    
    // Step 1: Create/Update basic information
    var oContext;
    
    try {
        // Prepare parameters for first step
        if (bIsCreate) {
            // Creating new template
            oContext = oModel.bindContext("/" + sActionName + "(...)");
            
            oContext.setParameter("templateName", oTourData.templateName);
            oContext.setParameter("description", oTourData.description);
            oContext.setParameter("numberDays", oTourData.days);
            oContext.setParameter("numberNights", oTourData.nights);
            oContext.setParameter("tourType", oTourData.tourType);
            // Không cần gửi images ở đây vì chúng ta sẽ xử lý riêng từng ảnh
        } else {
            // Updating existing template
            oContext = oModel.bindContext("/" + sActionName + "(...)");
            
            oContext.setParameter("templateID", oTourData.templateID);
            oContext.setParameter("templateName", oTourData.templateName);
            oContext.setParameter("description", oTourData.description);
            oContext.setParameter("numberDays", oTourData.days);
            oContext.setParameter("numberNights", oTourData.nights);
            oContext.setParameter("tourType", oTourData.tourType);
        }
        
        // Execute the first step
        oContext.execute().then(function(oContextData) {
            var oResult;
            
            try {
                // Get result object 
                oResult = oContext.getBoundContext().getObject();
            } catch (oBindingError) {
                console.error("Error getting result from context:", oBindingError);
                oResult = null;
            }
            
            // If creating, store the new template ID
            if (bIsCreate && oResult) {
                console.log("Template creation result:", oResult);
                
                // Update the templateId variable with the new value from the backend
                sTemplateId = oResult.templateID;
                
                // Also update the model
                oTourModel.setProperty("/templateID", sTemplateId);
                
                console.log("New template created with ID:", sTemplateId);
                
                // Process any pending images
                this._processPendingImages(sTemplateId)
                    .then(function() {
                        console.log("Pending images processed successfully");
                        // Continue with next steps
                        this._saveSchedules(sTemplateId, sStatus);
                    }.bind(this))
                    .catch(function(sError) {
                        // Log error but continue with saving
                        console.warn("Warning when processing images:", sError);
                        MessageToast.show("Cảnh báo: " + sError + ". Tiếp tục lưu template.");
                        this._saveSchedules(sTemplateId, sStatus);
                    }.bind(this));
            } else {
                // For updates, continue with schedule step
                this._saveSchedules(sTemplateId || oTourData.templateID, sStatus);
            }
        }.bind(this)).catch(function(oError) {
            // Handle error
            oView.setBusy(false);
            MessageBox.error("Error saving template basic information: " + this._getErrorMessage(oError));
        }.bind(this));
    } catch (oError) {
        oView.setBusy(false);
        MessageBox.error("Error preparing request: " + oError.message);
    }
},

// Hàm hỗ trợ để định dạng kích thước file
_formatFileSize: function(iBytes) {
    if (!iBytes) return "Unknown";
    
    if (iBytes < 1024) {
        return iBytes + " B";
    } else if (iBytes < 1048576) {
        return (iBytes / 1024).toFixed(2) + " KB";
    } else {
        return (iBytes / 1048576).toFixed(2) + " MB";
    }
},

// Hàm hỗ trợ để lấy thông báo lỗi
_getErrorMessage: function(oError) {
    if (oError.responseText) {
        try {
            var oErrorResponse = JSON.parse(oError.responseText);
            if (oErrorResponse.error && oErrorResponse.error.message) {
                return oErrorResponse.error.message;
            }
        } catch (e) {
            // Lỗi khi parse JSON, trả về text gốc
            return oError.responseText;
        }
    } else if (oError.message) {
        return oError.message;
    }
    return "An unknown error occurred";
}
    });
});
