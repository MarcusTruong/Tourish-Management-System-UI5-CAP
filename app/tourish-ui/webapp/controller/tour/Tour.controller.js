sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library"
], function (Controller, JSONModel, Fragment, MessageBox, MessageToast, Spreadsheet, exportLibrary) {
    "use strict";

    var EdmType = exportLibrary.EdmType;

    return Controller.extend("tourishui.controller.tour.Tour", {
        onInit: function () {
            // Initialize templates model
            var oTemplatesModel = new JSONModel({
                items: [],
                pagination: {
                    total: 0,
                    skip: 0,
                    limit: 20
                },
                currency: "USD",
                busy: false
            });
            this.getView().setModel(oTemplatesModel, "templates");
            
            // Set up event handler for route matched
            this.getOwnerComponent().getRouter().getRoute("createSampleTour").attachPatternMatched(this._onRouteMatched, this);
            
            // Load initial data
            this._loadTemplates();
        },
                
        onTourPress: function (oEvent) {
            // Get the selected item context
            var oItem = oEvent.getSource();
            var oBindingContext = oItem.getBindingContext("templates");
            console.log(oBindingContext);
            if (oBindingContext) {
                var sTemplateId = oBindingContext.getProperty("ID");
                
                // Navigate to template details
                MessageToast.show("Navigate to template details: " + sTemplateId);
                // this.getOwnerComponent().getRouter().navTo("templateDetail", {
                //     templateId: sTemplateId
                // });
            }
        },
        
        _onRouteMatched: function () {
            // Reload data when route is matched
            this._loadTemplates();
        },
        
        _loadTemplates: function () {
            var oTemplatesModel = this.getView().getModel("templates");
            var oTable = this.byId("tourTemplatesTable");
            
            // Set busy states
            oTemplatesModel.setProperty("/busy", true);
            if (oTable) {
                oTable.setBusy(true);
            }
            
            // Get filter values
            var sSearchTerm = this.byId("searchField")?.getValue() || "";
            var sTourType = this.byId("tourTypeFilter")?.getSelectedKey() || "";
            var sStatus = this.byId("statusFilter")?.getSelectedKey() || "";
            
            // Get pagination values
            var iSkip = oTemplatesModel.getProperty("/pagination/skip");
            var iLimit = oTemplatesModel.getProperty("/pagination/limit");
            
            // Get the OData model
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            // Ensure we have a model
            if (!oModel) {
                MessageToast.show("Không tìm thấy model OData");
                oTemplatesModel.setProperty("/busy", false);
                if (oTable) {
                    oTable.setBusy(false);
                }
                return;
            }
            
            try {
                // Tạo context cho function import
                var oContext = oModel.bindContext("/listTourTemplates(...)");
                
                // Thiết lập tham số cho context
                oContext.setParameter("searchTerm", sSearchTerm);
                oContext.setParameter("tourType", sTourType);
                oContext.setParameter("status", sStatus);
                oContext.setParameter("skip", iSkip);
                oContext.setParameter("limit", iLimit);
                
                // Thực thi function import và xử lý kết quả
                oContext.execute()
                    .then(function () {
                        try {
                            // Lấy dữ liệu kết quả
                            var oResult = oContext.getBoundContext().getObject();
                            
                            console.log("Kết quả từ backend:", oResult);
                            
                            // Cập nhật model templates
                            if (oResult) {
                                oTemplatesModel.setData(oResult);
                            } else {
                                // Xử lý kết quả trống
                                oTemplatesModel.setProperty("/items", []);
                                oTemplatesModel.setProperty("/pagination/total", 0);
                            }
                        } catch (oError) {
                            console.error("Lỗi khi xử lý dữ liệu:", oError);
                            MessageToast.show("Lỗi khi xử lý dữ liệu trả về");
                        } finally {
                            // Xóa trạng thái busy
                            oTemplatesModel.setProperty("/busy", false);
                            if (oTable) {
                                oTable.setBusy(false);
                            }
                        }
                    })
                    .catch(function (oError) {
                        console.error("Lỗi khi gọi function import:", oError);
                        MessageToast.show(`Lỗi khi tải danh sách tour: ${oError.message || "Không xác định"}`);
                        
                        // Xóa trạng thái busy
                        oTemplatesModel.setProperty("/busy", false);
                        if (oTable) {
                            oTable.setBusy(false);
                        }
                    });
            } catch (oError) {
                console.error("Lỗi khi tạo context:", oError);
                MessageToast.show("Lỗi khi chuẩn bị yêu cầu");
                
                // Xóa trạng thái busy
                oTemplatesModel.setProperty("/busy", false);
                if (oTable) {
                    oTable.setBusy(false);
                }
            }
        },
        
        onSearch: function (oEvent) {
            // Reset pagination and reload with search term
            var oTemplatesModel = this.getView().getModel("templates");
            oTemplatesModel.setProperty("/pagination/skip", 0);
            this._loadTemplates();
        },
        
        onFilterChange: function (oEvent) {
            // Reset pagination and reload with new filters
            var oTemplatesModel = this.getView().getModel("templates");
            oTemplatesModel.setProperty("/pagination/skip", 0);
            this._loadTemplates();
        },
        
        onClearFilters: function () {
            // Clear all filters
            this.byId("searchField").setValue("");
            this.byId("tourTypeFilter").setSelectedKey("");
            this.byId("statusFilter").setSelectedKey("");
            
            // Reset pagination and reload
            var oTemplatesModel = this.getView().getModel("templates");
            oTemplatesModel.setProperty("/pagination/skip", 0);
            this._loadTemplates();
        },
        
        onCreateTemplate: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("templateCreate");
        },

        
        onEdit: function (oEvent) {
            // Get the template ID from the binding context
            var oSource = oEvent.getSource();
            var oBindingContext = oSource.getBindingContext("templates");
            
            if (oBindingContext) {
                var sTemplateId = oBindingContext.getProperty("ID");
                
                // Debug log
                console.log("Template ID for edit:", sTemplateId);
                
                // Store the ID in a global model instead of passing as route parameter
                var oTemplateEditModel = new sap.ui.model.json.JSONModel({
                    templateId: sTemplateId
                });
                
                this.getOwnerComponent().setModel(oTemplateEditModel, "templateEdit");
                
                // Navigate without parameter
                try {
                    this.getOwnerComponent().getRouter().navTo("templateCreate");
                } catch (oError) {
                    console.error("Navigation error:", oError);
                    MessageBox.error("Error navigating: " + oError.message);
                }
            }
        },
        
        onCopy: function (oEvent) {
            // Get the template ID from the binding context
            var oSource = oEvent.getSource();
            var oBindingContext = oSource.getBindingContext("templates");
            
            if (oBindingContext) {
                var sTemplateId = oBindingContext.getProperty("ID");
                var sTemplateName = oBindingContext.getProperty("TemplateName");
                
                // Show confirmation dialog
                MessageBox.confirm("Do you want to create a copy of template '" + sTemplateName + "'?", {
                    title: "Copy Template",
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            this._copyTemplate(sTemplateId, sTemplateName);
                        }
                    }.bind(this)
                });
            }
        },
        
        _copyTemplate: function (sTemplateId, sTemplateName) {
            // Set busy state
            var oView = this.getView();
            oView.setBusy(true);
            
            // Get the OData model
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            try {
                // Step 1: Get template details
                var oContext = oModel.bindContext("/getTourTemplateDetails(...)");
                oContext.setParameter("templateID", sTemplateId);
                
                oContext.execute()
                    .then(function () {
                        var oTemplateData = oContext.getBoundContext().getObject();
                        
                        if (!oTemplateData || !oTemplateData.template) {
                            throw new Error("Template data not found");
                        }
                        
                        // Step 2: Create a new template with the copied data
                        return this._createCopiedTemplate(oTemplateData);
                    }.bind(this))
                    .then(function (oResult) {
                        // Success - show message and refresh list
                        oView.setBusy(false);
                        MessageBox.success("Template copied successfully. New template name: " + oResult.templateName, {
                            onClose: function() {
                                // Refresh the templates list
                                this._loadTemplates();
                            }.bind(this)
                        });
                    }.bind(this))
                    .catch(function (oError) {
                        // Error handling
                        oView.setBusy(false);
                        var sErrorMessage = "Error copying template: " + (oError.message || "Unknown error");
                        
                        if (oError.responseText) {
                            try {
                                var oErrorResponse = JSON.parse(oError.responseText);
                                if (oErrorResponse && oErrorResponse.error && oErrorResponse.error.message) {
                                    sErrorMessage = "Error copying template: " + oErrorResponse.error.message;
                                }
                            } catch (e) {
                                // If parsing fails, use the error message we already have
                            }
                        }
                        
                        MessageBox.error(sErrorMessage);
                    });
            } catch (oError) {
                oView.setBusy(false);
                MessageBox.error("Error preparing copy request: " + oError.message);
            }
        },
        
        _createCopiedTemplate: function (oTemplateData) {
            return new Promise(function (resolve, reject) {
                var oModel = this.getOwnerComponent().getModel("tourService");
                
                // Generate a new name for the copied template
                var sNewName = oTemplateData.template.TemplateName + " (Copy)";
                
                // Step 1: Create basic info
                var oBasicInfoContext = oModel.bindContext("/createTourTemplateBasicInfo(...)");
                
                oBasicInfoContext.setParameter("templateName", sNewName);
                oBasicInfoContext.setParameter("description", oTemplateData.template.Description);
                oBasicInfoContext.setParameter("numberDays", oTemplateData.template.NumberDays);
                oBasicInfoContext.setParameter("numberNights", oTemplateData.template.NumberNights);
                oBasicInfoContext.setParameter("tourType", oTemplateData.template.TourType);
                
                // Prepare images if available
                var aImages = [];
                if (oTemplateData.images && oTemplateData.images.length > 0) {
                    aImages = oTemplateData.images.map(function (oImage) {
                        return {
                            imageURL: oImage.ImageURL,
                            caption: oImage.Caption,
                            isMain: oImage.IsMain
                        };
                    });
                }
                
                oBasicInfoContext.setParameter("images", aImages);
                
                // Execute basic info creation
                oBasicInfoContext.execute()
                    .then(function () {
                        var oResult = oBasicInfoContext.getBoundContext().getObject();
                        
                        if (!oResult || !oResult.templateID) {
                            throw new Error("Failed to create basic template information");
                        }
                        
                        var sNewTemplateId = oResult.templateID;
                        
                        // Step 2: Copy schedules if available
                        if (oTemplateData.schedules && oTemplateData.schedules.length > 0) {
                            return this._copySchedules(sNewTemplateId, oTemplateData.schedules)
                                .then(function () {
                                    // Return the new template ID for next step
                                    return sNewTemplateId;
                                });
                        }
                        
                        // If no schedules, just return the new template ID
                        return sNewTemplateId;
                    }.bind(this))
                    .then(function (sNewTemplateId) {
                        // Step 3: Copy price terms if available
                        if (oTemplateData.priceTerms) {
                            return this._copyPriceTerms(sNewTemplateId, oTemplateData.priceTerms)
                                .then(function () {
                                    // Return the new template ID for next step
                                    return sNewTemplateId;
                                });
                        }
                        
                        // If no price terms, just return the new template ID
                        return sNewTemplateId;
                    }.bind(this))
                    .then(function (sNewTemplateId) {
                        // Step 4: Set final status as Draft
                        var oStatusContext = oModel.bindContext("/updateTourTemplateStatus(...)");
                        
                        oStatusContext.setParameter("templateID", sNewTemplateId);
                        oStatusContext.setParameter("status", "Draft");
                        
                        return oStatusContext.execute()
                            .then(function () {
                                // Return success information
                                resolve({
                                    templateID: sNewTemplateId,
                                    templateName: sNewName
                                });
                            });
                    })
                    .catch(function (oError) {
                        reject(oError);
                    });
            }.bind(this));
        },
        
        _copySchedules: function (sTemplateId, aSchedules) {
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            // Format schedules for the API
            var aSchedulesForApi = aSchedules.map(function (oSchedule) {
                return {
                    dayNumber: oSchedule.DayNumber,
                    dayTitle: oSchedule.DayTitle,
                    overview: oSchedule.Overview,
                    breakfastIncluded: oSchedule.BreakfastIncluded,
                    lunchIncluded: oSchedule.LunchIncluded,
                    dinnerIncluded: oSchedule.DinnerIncluded,
                    activities: oSchedule.Activities ? oSchedule.Activities.map(function (oActivity) {
                        return {
                            startTime: oActivity.StartTime,
                            endTime: oActivity.EndTime,
                            title: oActivity.Title,
                            description: oActivity.Description
                        };
                    }) : []
                };
            });
            
            // Add schedules
            var oSchedulesContext = oModel.bindContext("/addTourTemplateSchedules(...)");
            
            oSchedulesContext.setParameter("templateID", sTemplateId);
            oSchedulesContext.setParameter("schedules", aSchedulesForApi);
            
            return oSchedulesContext.execute();
        },
        
        _copyPriceTerms: function (sTemplateId, oPriceTerms) {
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            // Add price terms
            var oPriceTermsContext = oModel.bindContext("/addTourTemplatePriceTerms(...)");
            
            oPriceTermsContext.setParameter("templateID", sTemplateId);
            oPriceTermsContext.setParameter("adultPrice", oPriceTerms.AdultPrice);
            oPriceTermsContext.setParameter("childrenPrice", oPriceTerms.ChildrenPrice);
            oPriceTermsContext.setParameter("servicesIncluded", oPriceTerms.ServicesIncluded);
            oPriceTermsContext.setParameter("servicesNotIncluded", oPriceTerms.ServicesNotIncluded);
            oPriceTermsContext.setParameter("cancellationTerms", oPriceTerms.CancellationTerms);
            oPriceTermsContext.setParameter("generalTerms", oPriceTerms.GeneralTerms);
            
            return oPriceTermsContext.execute();
        },

        onDeleteTemplateTour: function (oEvent) {
            var oSource = oEvent.getSource();
            var oBindingContext = oSource.getBindingContext("templates");

            if (oBindingContext) {
                var sTemplateId = oBindingContext.getProperty("ID");
                var sTemplateName = oBindingContext.getProperty("TemplateName");

                MessageBox.confirm("Are you sure you want to delete the template '" + sTemplateName + "'? " +
            "This action cannot be undone and all associated data will be deleted.", {
                title: "Confirm Deletion",
                icon: MessageBox.Icon.WARNING,
                actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.DELETE,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.DELETE) {
                        this._executeTemplateDelete(sTemplateId);
                    }
                }.bind(this)
            })

            }
        },

        _executeTemplateDelete: function (sTemplateId) {
            // Set busy state
            var oView = this.getView();
            var oTable = this.byId("tourTemplatesTable");
            
            oView.setBusy(true);
            if (oTable) {
                oTable.setBusy(true);
            }
            
            // Get the OData model
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            try {
                // Prepare delete action
                var oContext = oModel.bindContext("/deleteTourTemplate(...)");
                oContext.setParameter("templateID", sTemplateId);
                
                // Execute deletion
                oContext.execute()
                    .then(function () {
                        var oResult = oContext.getBoundContext().getObject();
                        // Clear busy states
                        oView.setBusy(false);
                        if (oTable) {
                            oTable.setBusy(false);
                        }
                        
                        if (oResult && oResult.success) {
                            // Show success message
                            MessageToast.show("Template deleted successfully");
                            
                            // Refresh the templates table
                            this._loadTemplates();
                        } else {
                            // Show error
                            MessageBox.error(oResult && oResult.message ? oResult.message : "Failed to delete template");
                        }
                    }.bind(this))
                    .catch(function (oError) {
                        // Clear busy states
                        oView.setBusy(false);
                        if (oTable) {
                            oTable.setBusy(false);
                        }
                        
                        // Handle error
                        var sErrorMessage = "Error deleting template";
                        
                        // Try to extract detailed message
                        if (oError.responseText) {
                            try {
                                var oErrorResponse = JSON.parse(oError.responseText);
                                if (oErrorResponse && oErrorResponse.error && oErrorResponse.error.message) {
                                    sErrorMessage = oErrorResponse.error.message;
                                }
                            } catch (e) {
                                // If parsing fails, use the raw response text
                                sErrorMessage = oError.responseText;
                            }
                        } else if (oError.message) {
                            sErrorMessage = oError.message;
                        }
                        
                        MessageBox.error(sErrorMessage);
                    }.bind(this));
            } catch (oError) {
                // Clear busy states
                oView.setBusy(false);
                if (oTable) {
                    oTable.setBusy(false);
                }
                
                // Handle preparation error
                MessageBox.error("Error preparing delete request: " + oError.message);
            }
        },
        
        onCreateActiveTour: function(oEvent) {
            // Get the template ID from the button's binding context
            var oSource = oEvent.getSource();
            var oBindingContext = oSource.getBindingContext("templates");
            
            if (oBindingContext) {
                var sTemplateId = oBindingContext.getProperty("ID");
                var sTemplateName = oBindingContext.getProperty("TemplateName");
                var sTemplateStatus = oBindingContext.getProperty("Status");
                if (sTemplateStatus == "Published") {
                                    // Store template ID for later use
                    this._sSelectedTemplateId = sTemplateId;
                
                // Open the Create Active Tour dialog
                    this._openCreateActiveTourDialog(sTemplateId, sTemplateName);
                } else {
                    MessageBox.error("Tour Template is not published yet");
                               }

            }
        },
        
        _openCreateActiveTourDialog: function(sTemplateId, sTemplateName) {
            var oView = this.getView();
            
            // Create dialog lazily
            if (!this._oActiveTourDialog) {
                // Load fragment
                Fragment.load({
                    id: oView.getId(),
                    name: "tourishui.view.fragments.CreateActiveTourDialog",
                    controller: this
                }).then(function(oDialog) {
                    // Connect dialog to the root view of this component
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
            // Load and set responsible persons (e.g., users who can manage the tour)
            this._loadResponsiblePersons();
            
            // Initialize form data with default values
            var oDate = new Date();
            var oNextWeek = new Date(oDate);
            oNextWeek.setDate(oDate.getDate() + 7);
            
            var oNextMonth = new Date(oDate);
            oNextMonth.setDate(oDate.getDate() + 30);
            
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern: "yyyy-MM-dd"});
            
            // Create a model for the dialog
            var oDialogModel = new JSONModel({
                templateID: sTemplateId,
                tourName: sTemplateName + " - " + oDateFormat.format(oDate), // Default name suggestion
                departureDate: oDateFormat.format(oNextWeek), // Default departure: next week
                returnDate: oDateFormat.format(oNextMonth), // Default return: next month
                saleStartDate: oDateFormat.format(oDate), // Default sale start: today
                saleEndDate: oDateFormat.format(oNextWeek), // Default sale end: next week
                maxCapacity: 20, // Default capacity
                responsiblePersonID: "", // Will be selected by user
                formValid: false, // Initial validation state
                Members: this._aResponsiblePersons || []
            });
            
            // Set the model to the dialog
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
        
        onCancelActiveTour: function() {
            // Close the dialog
            if (this._oActiveTourDialog) {
                this._oActiveTourDialog.close();
            }
        },
        
        onSaveActiveTour: function() {
            // Get the dialog model
            var oDialogModel = this._oActiveTourDialog.getModel("activeTour");
            var oData = oDialogModel.getData();
            
            // Validate input
            if (!this._validateActiveTourForm(oData)) {
                return;
            }
            
            // Set busy state
            this._oActiveTourDialog.setBusy(true);
            
            // Get the OData model
            var oModel = this.getOwnerComponent().getModel("tourService");
            
            try {
                // Prepare action call
                var oContext = oModel.bindContext("/createActiveTour(...)");
                
                // Set parameters
                oContext.setParameter("templateID", oData.templateID);
                oContext.setParameter("tourName", oData.tourName);
                oContext.setParameter("departureDate", oData.departureDate);
                oContext.setParameter("returnDate", oData.returnDate);
                oContext.setParameter("saleStartDate", oData.saleStartDate);
                oContext.setParameter("saleEndDate", oData.saleEndDate);
                oContext.setParameter("maxCapacity", parseInt(oData.maxCapacity, 10));
                oContext.setParameter("responsiblePersonID", oData.responsiblePersonID);
                
                // Execute the action
                oContext.execute().then(function() {
                    // Get the result
                    var oResult = oContext.getBoundContext().getObject();
                    
                    // Clear busy state
                    this._oActiveTourDialog.setBusy(false);
                    
                    if (oResult && oResult.tourID) {
                        // Show success message
                        MessageBox.success("Active tour created successfully.", {
                            title: "Success",
                            onClose: function() {
                                // Close the dialog
                                this._oActiveTourDialog.close();
                                
                                // Navigate to the active tour details (if needed)
                                /*
                                this.getOwnerComponent().getRouter().navTo("activeTourDetail", {
                                    tourId: oResult.tourID
                                });
                                */
                                
                                // For now, just show a toast
                                MessageToast.show("Active tour created with ID: " + oResult.tourID);
                            }.bind(this)
                        });
                    } else {
                        // Show error message
                        MessageBox.error(oResult && oResult.message ? oResult.message : "Failed to create active tour");
                    }
                }.bind(this)).catch(function(oError) {
                    // Clear busy state
                    this._oActiveTourDialog.setBusy(false);
                    
                    // Show error message
                    var sErrorMessage = this._getErrorMessage(oError);
                    MessageBox.error("Error creating active tour: " + sErrorMessage);
                }.bind(this));
            } catch (oError) {
                // Clear busy state
                this._oActiveTourDialog.setBusy(false);
                
                // Show error message
                MessageBox.error("Error preparing request: " + oError.message);
            }
        },
        
        _validateActiveTourForm: function(oData) {
            // List of required fields
            var aRequiredFields = [
                { name: "tourName", label: "Tour Name" },
                { name: "departureDate", label: "Departure Date" },
                { name: "returnDate", label: "Return Date" },
                { name: "saleStartDate", label: "Sale Start Date" },
                { name: "saleEndDate", label: "Sale End Date" },
                { name: "maxCapacity", label: "Max Capacity" },
                { name: "responsiblePersonID", label: "Responsible Person" }
            ];
            
            // Check if any required field is empty
            var aMissingFields = [];
            aRequiredFields.forEach(function(oField) {
                if (!oData[oField.name]) {
                    aMissingFields.push(oField.label);
                }
            });
            
            if (aMissingFields.length > 0) {
                MessageBox.error("Please fill in all required fields: " + aMissingFields.join(", "));
                return false;
            }
            
            // Validate dates
            try {
                var dDeparture = new Date(oData.departureDate);
                var dReturn = new Date(oData.returnDate);
                var dSaleStart = new Date(oData.saleStartDate);
                var dSaleEnd = new Date(oData.saleEndDate);
                var dToday = new Date();
                
                // Reset time portions for fair comparison
                dDeparture.setHours(0, 0, 0, 0);
                dReturn.setHours(0, 0, 0, 0);
                dSaleStart.setHours(0, 0, 0, 0);
                dSaleEnd.setHours(0, 0, 0, 0);
                dToday.setHours(0, 0, 0, 0);
                
                // Departure should be after today
                if (dDeparture < dToday) {
                    MessageBox.error("Departure date must be in the future");
                    return false;
                }
                
                // Return should be after or equal to departure
                if (dReturn < dDeparture) {
                    MessageBox.error("Return date must be after or equal to departure date");
                    return false;
                }
                
                // Sale end should be after or equal to sale start
                if (dSaleEnd < dSaleStart) {
                    MessageBox.error("Sale end date must be after or equal to sale start date");
                    return false;
                }
            } catch (oError) {
                MessageBox.error("Invalid date format");
                return false;
            }
            
            // Validate max capacity
            var iMaxCapacity = parseInt(oData.maxCapacity, 10);
            if (isNaN(iMaxCapacity) || iMaxCapacity < 1) {
                MessageBox.error("Max capacity must be at least 1");
                return false;
            }
            
            return true;
        },
        
        // Helper method to extract error message from different error objects
        _getErrorMessage: function(oError) {
            if (oError.responseText) {
                try {
                    var oErrorResponse = JSON.parse(oError.responseText);
                    if (oErrorResponse.error && oErrorResponse.error.message) {
                        return oErrorResponse.error.message;
                    }
                } catch (e) {
                    // If JSON parsing fails, return the raw response
                    return oError.responseText;
                }
            } else if (oError.message) {
                return oError.message;
            }
            return "Unknown error";
        },

        onImagePress: function (oEvent) {
            // Get the image source
            var oImage = oEvent.getSource();
            var sImageSrc = oImage.getSrc();
            
            // Create and open image dialog if not exists
            if (!this._oImageDialog) {
                this._oImageDialog = new sap.m.Dialog({
                    title: "Tour Image",
                    contentWidth: "600px",
                    contentHeight: "500px",
                    resizable: true,
                    draggable: true,
                    content: new sap.m.Image({
                        src: sImageSrc,
                        width: "100%",
                        height: "100%",
                        mode: "Image"
                    }),
                    beginButton: new sap.m.Button({
                        text: "Close",
                        press: function () {
                            this._oImageDialog.close();
                        }.bind(this)
                    })
                });
                
                this.getView().addDependent(this._oImageDialog);
            } else {
                // Update image source
                var oDialogImage = this._oImageDialog.getContent()[0];
                oDialogImage.setSrc(sImageSrc);
            }
            
            // Open the dialog
            this._oImageDialog.open();
        },
        
        onExport: function () {
            var oTable = this.byId("tourTemplatesTable");
            var oBinding = oTable.getBinding("items");
            
            // Define columns for export
            var aColumns = [
                {
                    label: "Template Name",
                    property: "TemplateName",
                    type: EdmType.String
                },
                {
                    label: "Tour Type",
                    property: "TourType",
                    type: EdmType.String
                },
                {
                    label: "Number of Days",
                    property: "NumberDays",
                    type: EdmType.Number
                },
                {
                    label: "Number of Nights",
                    property: "NumberNights",
                    type: EdmType.Number
                },
                {
                    label: "Adult Price",
                    property: "AdultPrice",
                    type: EdmType.Currency,
                    scale: 2,
                    unitProperty: "USD"
                },
                {
                    label: "Status",
                    property: "Status",
                    type: EdmType.String
                }
            ];
            
            // Create spreadsheet
            var oSettings = {
                workbook: {
                    columns: aColumns,
                    context: {
                        sheetName: "Tour Templates"
                    }
                },
                dataSource: {
                    type: "json",
                    data: this.getView().getModel("templates").getProperty("/items")
                },
                fileName: "TourTemplates.xlsx"
            };
            
            // Create and build spreadsheet
            var oSheet = new Spreadsheet(oSettings);
            oSheet.build()
                .then(function() {
                    MessageToast.show("Export started");
                })
                .finally(function() {
                    oSheet.destroy();
                });
        },
        
        onTableSettings: function () {
            // Create and open table settings dialog if not exists
            if (!this._oTableSettingsDialog) {
                Fragment.load({
                    name: "tourishui.view.fragments.TableSettings",
                    controller: this
                }).then(function (oDialog) {
                    this._oTableSettingsDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    this._configureTableSettingsDialog();
                    oDialog.open();
                }.bind(this));
            } else {
                this._configureTableSettingsDialog();
                this._oTableSettingsDialog.open();
            }
        },
        
        _configureTableSettingsDialog: function () {
            // Get the table
            var oTable = this.byId("tourTemplatesTable");
            
            // Get columns from table
            var aColumns = oTable.getColumns();
            var aItems = [];
            
            // Create model for column visibility
            var oModel = new JSONModel({
                items: []
            });
            
            // Create items for each column
            aColumns.forEach(function (oColumn) {
                var oColumnHeader = oColumn.getHeader();
                var sText = "";
                
                if (oColumnHeader instanceof sap.m.Text) {
                    sText = oColumnHeader.getText();
                } else if (oColumnHeader instanceof sap.m.Label) {
                    sText = oColumnHeader.getText();
                }
                
                aItems.push({
                    text: sText,
                    visible: oColumn.getVisible()
                });
            });
            
            oModel.setProperty("/items", aItems);
            
            // Set model to dialog
            this._oTableSettingsDialog.setModel(oModel);
            
            // Get list in dialog
            var oList = this._oTableSettingsDialog.getContent()[0].getContent()[0];
            
            // Select visible columns
            var aSelectedItems = [];
            aItems.forEach(function (oItem, iIndex) {
                if (oItem.visible) {
                    aSelectedItems.push(oList.getItems()[iIndex]);
                }
            });
            
            oList.setSelectedItems(aSelectedItems);
        },
        
        onTableSettingsConfirm: function (oEvent) {
            var oTable = this.byId("tourTemplatesTable");
            var oDialog = this._oTableSettingsDialog;
            var oList = oDialog.getContent()[0].getContent()[0];
            var aSelectedItems = oList.getSelectedItems();
            
            // Update column visibility
            oTable.getColumns().forEach(function (oColumn, iIndex) {
                var bVisible = false;
                
                aSelectedItems.forEach(function (oSelectedItem) {
                    if (oSelectedItem.getBindingContext().getProperty("text") === oColumn.getHeader().getText()) {
                        bVisible = true;
                    }
                });
                
                oColumn.setVisible(bVisible);
            });
            
            // Close dialog
            oDialog.close();
        },
        
        onTableSettingsCancel: function () {
            // Close dialog
            this._oTableSettingsDialog.close();
        }
    });
});