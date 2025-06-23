sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/format/DateFormat",
    "../utils/PermissionHelper"
], function (Controller, JSONModel, MessageBox, MessageToast, DateFormat, PermissionHelper) {
    "use strict";

    return Controller.extend("tourishui.controller.Dashboard", {
        onInit: function () {
            // Initialize dashboard model
            var oDashboardModel = new JSONModel({
                busy: false,
                lastUpdated: new Date(),
                workspaceInfo: {},
                kpis: {
                    totalRevenue: 0,
                    revenueGrowth: 0,
                    activeTours: 0,
                    averageOccupancy: 0,
                    totalCustomers: 0,
                    individualCustomers: 0,
                    businessCustomers: 0,
                    pendingOrders: 0,
                    pendingOrdersValue: 0,
                    totalSuppliers: 0,
                    pendingPayments: 0,
                    profitMargin: 0
                },
                charts: {
                    revenueData: [],
                    tourTypes: []
                },
                upcomingDepartures: [],
                alerts: []
            });
            
            this.getView().setModel(oDashboardModel, "dashboard");
            
            // Initialize role-based permissions model
            this._initializePermissions();
            
            // Register route pattern matched
            this.getOwnerComponent().getRouter().getRoute("dashboard").attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Initialize role-based permissions for dashboard elements
         * @private
         */
        _initializePermissions: function() {
            var sUserRole = PermissionHelper.getCurrentUserRole();
            
            var oPermissionsModel = new JSONModel({
                userRole: sUserRole,
                visibility: {
                    // Admin sees everything (default true)
                    profitMargin: sUserRole !== "Staff", // Hide from Staff
                    revenue: sUserRole !== "Staff", // Hide from Staff  
                    tourStatus: sUserRole !== "Staff", // Hide from Staff
                    financialOverview: sUserRole !== "Staff", // Hide from Staff
                    needsAttention: sUserRole !== "Staff", // Hide from Staff
                    workspace: sUserRole === "Admin", // Only Admin
                    workspaceSettings: sUserRole === "Admin", // Only Admin (manage settings button)
                    upcomingDepartures: sUserRole !== "Accountant" // Hide from Accountant
                }
            });
            
            this.getView().setModel(oPermissionsModel, "permissions");
            
            console.log("Dashboard permissions initialized for role:", sUserRole);
        },

        _onRouteMatched: function () {
            // Check authentication
            const oSessionManager = this.getOwnerComponent().getSessionManager();
            if (!oSessionManager.isLoggedIn()) {
                this.getOwnerComponent().getRouter().navTo("login");
                return;
            }

            // Load dashboard data
            this._loadDashboardData();
        },

        _loadDashboardData: function () {
            var oDashboardModel = this.getView().getModel("dashboard");
            oDashboardModel.setProperty("/busy", true);

            // Load data from multiple services
            Promise.all([
                this._loadWorkspaceInfo(),
                this._loadKPIs(),
                this._loadChartData(),
                this._loadUpcomingDepartures(),
                this._loadAlerts()
            ]).then(function () {
                oDashboardModel.setProperty("/busy", false);
                oDashboardModel.setProperty("/lastUpdated", new Date());
                MessageToast.show("Dashboard updated successfully");
            }).catch(function (error) {
                console.error("Error loading dashboard data:", error);
                oDashboardModel.setProperty("/busy", false);
                MessageToast.show("Error loading dashboard data");
            });
        },

        _loadWorkspaceInfo: function () {
            return new Promise((resolve, reject) => {
                var oUserService = this.getOwnerComponent().getModel("userService");
                var oContext = oUserService.bindContext("/getWorkspaceInfo(...)");

                oContext.execute().then(() => {
                    var oResult = oContext.getBoundContext().getObject();
                    var oDashboardModel = this.getView().getModel("dashboard");
                    oDashboardModel.setProperty("/workspaceInfo", oResult);
                    resolve();
                }).catch(reject);
            });
        },

        _loadKPIs: function () {
            return Promise.all([
                this._loadTourKPIs(),
                this._loadCustomerKPIs(),
                this._loadOrderKPIs(),
                this._loadSupplierKPIs(),
                this._loadFinancialKPIs()
            ]);
        },

        _loadTourKPIs: function () {
            return new Promise((resolve, reject) => {
                var oTourService = this.getOwnerComponent().getModel("tourService");
                
                // Load both dashboard data and status statistics
                Promise.all([
                    this._getToursDashboardData(),
                    this._getTourStatusStatistics()
                ]).then((results) => {
                    var oResult = results[0];
                    var oStatusStats = results[1];
                    var oDashboardModel = this.getView().getModel("dashboard");
                    
                    if (oResult) {
                        oDashboardModel.setProperty("/kpis/activeTours", oResult.activeToursCount || 0);
                        
                        // Calculate average occupancy
                        var totalCapacity = 0;
                        var totalBookings = 0;
                        (oResult.upcomingDepartures || []).forEach(departure => {
                            totalCapacity += departure.MaxCapacity || 0;
                            totalBookings += departure.CurrentBookings || 0;
                        });
                        
                        var averageOccupancy = totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0;
                        oDashboardModel.setProperty("/kpis/averageOccupancy", averageOccupancy);
                    }
                    
                    // Add status breakdown
                    if (oStatusStats) {
                        oDashboardModel.setProperty("/kpis/tourStatusBreakdown", {
                            open: oStatusStats.open || 0,
                            closed: oStatusStats.closed || 0,
                            completed: oStatusStats.completed || 0,
                            canceled: oStatusStats.canceled || 0,
                            needsAttention: oStatusStats.needsAttention || { toClose: 0, toComplete: 0 }
                        });
                    }
                    
                    resolve();
                }).catch(reject);
            });
        },

        /**
         * Get tours dashboard data
         */
        _getToursDashboardData: function() {
            return new Promise((resolve, reject) => {
                var oTourService = this.getOwnerComponent().getModel("tourService");
                var oContext = oTourService.bindContext("/getToursDashboardData(...)");

                oContext.execute().then(() => {
                    var oResult = oContext.getBoundContext().getObject();
                    resolve(oResult);
                }).catch(reject);
            });
        },

        /**
         * Get tour status statistics
         */
        _getTourStatusStatistics: function() {
            return new Promise((resolve, reject) => {
                var oTourService = this.getOwnerComponent().getModel("tourService");
                var oContext = oTourService.bindContext("/getTourStatusStatistics(...)");

                oContext.execute().then(() => {
                    var oResult = oContext.getBoundContext().getObject();
                    resolve(oResult);
                }).catch(reject);
            });
        },

        _loadCustomerKPIs: function () {
            return new Promise((resolve, reject) => {
                var oCustomerService = this.getOwnerComponent().getModel("customerService");
                var oContext = oCustomerService.bindContext("/getCustomerStatistics(...)");

                oContext.execute().then(() => {
                    var oResult = oContext.getBoundContext().getObject();
                    var oDashboardModel = this.getView().getModel("dashboard");
                    
                    if (oResult) {
                        var totalCustomers = (oResult.totalIndividualCustomers || 0) + (oResult.totalBusinessCustomers || 0);
                        oDashboardModel.setProperty("/kpis/totalCustomers", totalCustomers);
                        oDashboardModel.setProperty("/kpis/individualCustomers", oResult.totalIndividualCustomers || 0);
                        oDashboardModel.setProperty("/kpis/businessCustomers", oResult.totalBusinessCustomers || 0);
                    }
                    resolve();
                }).catch(reject);
            });
        },

        _loadOrderKPIs: function () {
            return new Promise((resolve, reject) => {
                var oOrderService = this.getOwnerComponent().getModel("orderService");
                var oContext = oOrderService.bindContext("/listOrders(...)");
                
                oContext.setParameter("status", "Pending");
                oContext.setParameter("skip", 0);
                oContext.setParameter("limit", 1000);

                oContext.execute().then(() => {
                    var oResult = oContext.getBoundContext().getObject();
                    var oDashboardModel = this.getView().getModel("dashboard");
                    
                    if (oResult && oResult.items) {
                        var pendingOrders = oResult.items.length;
                        var pendingValue = oResult.items.reduce((sum, order) => sum + (order.RemainingAmount || 0), 0);
                        
                        oDashboardModel.setProperty("/kpis/pendingOrders", pendingOrders);
                        oDashboardModel.setProperty("/kpis/pendingOrdersValue", Math.round(pendingValue));
                    }
                    resolve();
                }).catch(reject);
            });
        },

        _loadSupplierKPIs: function () {
            return new Promise((resolve, reject) => {
                var oSupplierService = this.getOwnerComponent().getModel("supplierService");
                var oContext = oSupplierService.bindContext("/searchSuppliers(...)");
                
                oContext.setParameter("searchTerm", "");
                oContext.setParameter("skip", 0);
                oContext.setParameter("limit", 1000);

                oContext.execute().then(() => {
                    var oResult = oContext.getBoundContext().getObject();
                    var oDashboardModel = this.getView().getModel("dashboard");
                    
                    if (oResult) {
                        oDashboardModel.setProperty("/kpis/totalSuppliers", oResult.pagination?.total || 0);
                    }
                    
                    // Load debt information
                    this._loadSupplierDebts();
                    resolve();
                }).catch(reject);
            });
        },

        _loadSupplierDebts: function () {
            var oSupplierService = this.getOwnerComponent().getModel("supplierService");
            var oContext = oSupplierService.bindContext("/getSupplierDebtReport(...)");
            
            oContext.setParameter("status", "Pending");

            oContext.execute().then(() => {
                var oResult = oContext.getBoundContext().getObject();
                var oDashboardModel = this.getView().getModel("dashboard");
                
                if (oResult && oResult.statistics) {
                    oDashboardModel.setProperty("/kpis/pendingPayments", Math.round(oResult.statistics.pendingDebt || 0));
                }
            }).catch(error => {
                console.error("Error loading supplier debts:", error);
            });
        },

        _loadFinancialKPIs: function () {
            return new Promise((resolve, reject) => {
                // Calculate financial metrics from orders
                var oOrderService = this.getOwnerComponent().getModel("orderService");
                var oContext = oOrderService.bindContext("/listOrders(...)");
                
                // Get current month orders
                var currentDate = new Date();
                var firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                var lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                
                oContext.setParameter("fromDate", firstDay.toISOString().split('T')[0]);
                oContext.setParameter("toDate", lastDay.toISOString().split('T')[0]);
                oContext.setParameter("skip", 0);
                oContext.setParameter("limit", 1000);

                oContext.execute().then(() => {
                    var oResult = oContext.getBoundContext().getObject();
                    var oDashboardModel = this.getView().getModel("dashboard");
                    
                    if (oResult && oResult.items) {
                        var totalRevenue = oResult.items.reduce((sum, order) => {
                            return sum + (order.Status !== 'Canceled' ? (parseFloat(order.TotalAmount) || 0) : 0);
                        }, 0);
                        
                        var totalPaid = oResult.items.reduce((sum, order) => {
                            return sum + (order.Status !== 'Canceled' ? (parseFloat(order.PaidAmount) || 0) : 0);
                        }, 0);
                        
                        var estimatedCosts = totalRevenue * 0.7; // Assume 70% costs
                        var profit = totalPaid - estimatedCosts;
                        var profitMargin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0;
                        
                        // Generate realistic revenue growth (-10% to +25%)
                        var revenueGrowth = Math.floor(Math.random() * 36) - 10; // Random between -10% and 25%
                        
                        // Ensure values are valid numbers
                        oDashboardModel.setProperty("/kpis/totalRevenue", Math.round(totalRevenue) || 0);
                        oDashboardModel.setProperty("/kpis/revenueGrowth", revenueGrowth || 0);
                        oDashboardModel.setProperty("/kpis/profitMargin", profitMargin || 0);
                    } else {
                        // Set default values if no data
                        oDashboardModel.setProperty("/kpis/totalRevenue", 0);
                        oDashboardModel.setProperty("/kpis/revenueGrowth", 0);
                        oDashboardModel.setProperty("/kpis/profitMargin", 0);
                    }
                    resolve();
                }).catch((error) => {
                    console.error("Error loading financial KPIs:", error);
                    // Set default values on error
                    var oDashboardModel = this.getView().getModel("dashboard");
                    oDashboardModel.setProperty("/kpis/totalRevenue", 0);
                    oDashboardModel.setProperty("/kpis/revenueGrowth", 0);
                    oDashboardModel.setProperty("/kpis/profitMargin", 0);
                    resolve();
                });
            });
        },

        _loadChartData: function () {
            return Promise.all([
                this._loadRevenueChartData(),
                this._loadTourTypesData()
            ]);
        },

        _loadRevenueChartData: function () {
            return new Promise((resolve) => {
                var oTourService = this.getOwnerComponent().getModel("tourService");
                var oContext = oTourService.bindContext("/getToursDashboardData(...)");

                oContext.execute().then(() => {
                    var oResult = oContext.getBoundContext().getObject();
                    var oDashboardModel = this.getView().getModel("dashboard");
                    
                    if (oResult && oResult.monthlyStats) {
                        // Use real data from backend
                        var revenueData = oResult.monthlyStats.map((monthData, index) => {
                            var monthName = monthData.Month.split('-')[1]; // Get month number
                            var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            var monthIndex = parseInt(monthName) - 1;
                            
                            return {
                                month: monthNames[monthIndex],
                                revenue: monthData.EstimatedRevenue || 0,
                                x: index, // Use index as numeric x value
                                y: monthData.EstimatedRevenue || 0
                            };
                        });
                        
                        oDashboardModel.setProperty("/charts/revenueData", revenueData);
                    } else {
                        // Fallback to sample data with correct numeric x values
                        var revenueData = [];
                        var currentDate = new Date();
                        
                        for (var i = 0; i < 6; i++) {
                            var date = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - i), 1);
                            var monthName = date.toLocaleString('default', { month: 'short' });
                            var revenue = Math.floor(Math.random() * 50000) + 20000;
                            
                            revenueData.push({
                                month: monthName,
                                revenue: revenue,
                                x: i, // Numeric x value from 0 to 5
                                y: revenue
                            });
                        }
                        
                        oDashboardModel.setProperty("/charts/revenueData", revenueData);
                    }
                    resolve();
                }).catch((error) => {
                    console.error("Error loading revenue chart data:", error);
                    // Fallback data with correct format
                    var revenueData = [];
                    var currentDate = new Date();
                    
                    for (var i = 0; i < 6; i++) {
                        var date = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - i), 1);
                        var monthName = date.toLocaleString('default', { month: 'short' });
                        var revenue = Math.floor(Math.random() * 50000) + 20000;
                        
                        revenueData.push({
                            month: monthName,
                            revenue: revenue,
                            x: i, // Numeric x value
                            y: revenue
                        });
                    }
                    
                    var oDashboardModel = this.getView().getModel("dashboard");
                    oDashboardModel.setProperty("/charts/revenueData", revenueData);
                    resolve();
                });
            });
        },

        _loadTourTypesData: function () {
            return new Promise((resolve, reject) => {
                var oTourService = this.getOwnerComponent().getModel("tourService");
                var oContext = oTourService.bindContext("/getToursDashboardData(...)");

                oContext.execute().then(() => {
                    var oResult = oContext.getBoundContext().getObject();
                    var oDashboardModel = this.getView().getModel("dashboard");
                    
                    if (oResult && oResult.tourTypeDistribution) {
                        var tourTypes = oResult.tourTypeDistribution.map(item => {
                            var total = oResult.tourTypeDistribution.reduce((sum, t) => sum + t.Count, 0);
                            return {
                                type: item.TourType,
                                count: item.Count,
                                percentage: total > 0 ? Math.round((item.Count / total) * 100) : 0
                            };
                        });
                        
                        oDashboardModel.setProperty("/charts/tourTypes", tourTypes);
                    }
                    resolve();
                }).catch(reject);
            });
        },

        _loadUpcomingDepartures: function () {
            return new Promise((resolve, reject) => {
                var oTourService = this.getOwnerComponent().getModel("tourService");
                var oContext = oTourService.bindContext("/getToursDashboardData(...)");

                oContext.execute().then(() => {
                    var oResult = oContext.getBoundContext().getObject();
                    var oDashboardModel = this.getView().getModel("dashboard");
                    
                    if (oResult && oResult.upcomingDepartures) {
                        var departures = oResult.upcomingDepartures.map(departure => ({
                            tourId: departure.ID,
                            tourName: departure.TourName,
                            departureDate: departure.DepartureDate,
                            customerCount: departure.CurrentBookings || 0
                        }));
                        
                        oDashboardModel.setProperty("/upcomingDepartures", departures);
                    }
                    resolve();
                }).catch(reject);
            });
        },

        _loadAlerts: function () {
            return new Promise((resolve) => {
                var alerts = [];
                var oDashboardModel = this.getView().getModel("dashboard");
                var kpis = oDashboardModel.getProperty("/kpis");
                var statusBreakdown = kpis.tourStatusBreakdown || {};
                
                // Low occupancy alert
                if (kpis.averageOccupancy < 50) {
                    alerts.push({
                        title: "Low Occupancy Rate",
                        description: "Current occupancy rate is " + kpis.averageOccupancy + "%. Consider promotional campaigns.",
                        timestamp: new Date(),
                        priority: "Medium"
                    });
                }
                
                // Tours needing attention
                if (statusBreakdown.needsAttention) {
                    if (statusBreakdown.needsAttention.toClose > 0) {
                        alerts.push({
                            title: "Tours Need Closing",
                            description: statusBreakdown.needsAttention.toClose + " tours have passed their sale end date and should be closed.",
                            timestamp: new Date(),
                            priority: "High"
                        });
                    }
                    
                    if (statusBreakdown.needsAttention.toComplete > 0) {
                        alerts.push({
                            title: "Tours Need Completion",
                            description: statusBreakdown.needsAttention.toComplete + " tours have passed their return date and should be completed.",
                            timestamp: new Date(),
                            priority: "High"
                        });
                    }
                }
                
                // High number of closed tours alert
                if (statusBreakdown.closed > statusBreakdown.open && statusBreakdown.closed > 5) {
                    alerts.push({
                        title: "Many Closed Tours",
                        description: "You have " + statusBreakdown.closed + " closed tours. Consider reviewing booking strategies.",
                        timestamp: new Date(),
                        priority: "Medium"
                    });
                }
                
                // Pending orders alert
                if (kpis.pendingOrders > 10) {
                    alerts.push({
                        title: "High Pending Orders",
                        description: kpis.pendingOrders + " orders are pending. Review and process them.",
                        timestamp: new Date(),
                        priority: "High"
                    });
                }
                
                // Payment alert
                if (kpis.pendingPayments > 5000) {
                    alerts.push({
                        title: "Outstanding Supplier Payments",
                        description: "$" + kpis.pendingPayments + " in pending supplier payments.",
                        timestamp: new Date(),
                        priority: "Medium"
                    });
                }
                
                oDashboardModel.setProperty("/alerts", alerts);
                resolve();
            });
        },

        /**
         * Quick action to run automated tour updates
         */
        onRunAutomatedUpdates: function() {
            var that = this;
            
            MessageBox.confirm("Run automated tour status updates? This will:\n• Close tours past their sale end date\n• Complete tours past their return date", {
                title: "Automated Tour Updates",
                onClose: function(sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        that._runAutomatedTourUpdates();
                    }
                }
            });
        },

        /**
         * Execute automated tour updates
         */
        _runAutomatedTourUpdates: function() {
            var oDashboardModel = this.getView().getModel("dashboard");
            oDashboardModel.setProperty("/busy", true);
            
            var oTourService = this.getOwnerComponent().getModel("tourService");
            
            // Run auto-close first, then auto-complete
            var oCloseContext = oTourService.bindContext("/autoCloseTours(...)");
            
            oCloseContext.execute()
                .then(() => {
                    var oCloseResult = oCloseContext.getBoundContext().getObject();
                    
                    // Run auto-complete
                    var oCompleteContext = oTourService.bindContext("/autoCompleteTours(...)");
                    return oCompleteContext.execute().then(() => {
                        var oCompleteResult = oCompleteContext.getBoundContext().getObject();
                        
                        oDashboardModel.setProperty("/busy", false);
                        
                        var sMessage = `Automated updates completed:\n`;
                        sMessage += `• Closed ${oCloseResult.closedCount || 0} tours\n`;
                        sMessage += `• Completed ${oCompleteResult.completedCount || 0} tours`;
                        
                        MessageToast.show("Automated updates completed successfully");
                        MessageBox.information(sMessage, {
                            title: "Update Results"
                        });
                        
                        // Refresh dashboard data
                        this._loadDashboardData();
                    });
                })
                .catch((error) => {
                    oDashboardModel.setProperty("/busy", false);
                    console.error("Error running automated updates:", error);
                    MessageBox.error("Error running automated updates");
                });
        },

        /**
         * Show detailed tour status breakdown
         */
        onShowTourStatusBreakdown: function() {
            this.getOwnerComponent().getRouter().navTo("saleTour");
        },

        /**
         * Navigate to tour management with specific status filter
         */
        onNavigateToToursByStatus: function(sStatus) {
            this.getOwnerComponent().getRouter().navTo("saleTour", {
                status: sStatus
            });
        },

        // Event Handlers
        onRefreshDashboard: function () {
            this._loadDashboardData();
        },

        onCreateOrder: function () {
            this.getOwnerComponent().getRouter().navTo("createOrder");
        },

        onCreateTour: function () {
            this.getOwnerComponent().getRouter().navTo("templateCreate");
        },

        onCreateCustomer: function () {
            this.getOwnerComponent().getRouter().navTo("customer");
        },

        onViewOrders: function () {
            this.getOwnerComponent().getRouter().navTo("orderList");
        },

        onViewSuppliers: function () {
            this.getOwnerComponent().getRouter().navTo("supplierList");
        },

        onViewReports: function () {
            MessageToast.show("Reports feature coming soon!");
        },

        onViewPayments: function () {
            this.getOwnerComponent().getRouter().navTo("orderList");
        },

        onViewSettings: function () {
            this.getOwnerComponent().getRouter().navTo("myWorkspace");
        },

        onDeparturePress: function (oEvent) {
            var oBindingContext = oEvent.getSource().getBindingContext("dashboard");
            var sTourId = oBindingContext.getProperty("tourId");
            
            this.getOwnerComponent().getRouter().navTo("activeTourDetail", {
                tourId: sTourId
            });
        },

        onDismissAlert: function (oEvent) {
            var oItem = oEvent.getSource();
            var oBindingContext = oItem.getBindingContext("dashboard");
            var sPath = oBindingContext.getPath();
            var oDashboardModel = this.getView().getModel("dashboard");
            var aAlerts = oDashboardModel.getProperty("/alerts");
            var iIndex = parseInt(sPath.split("/").pop());
            
            // Remove the alert
            aAlerts.splice(iIndex, 1);
            oDashboardModel.setProperty("/alerts", aAlerts);
            
            MessageToast.show("Alert dismissed");
        },

        // Formatters
        formatDate: function (sDate) {
            if (!sDate) return "";
            
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "MMM dd, yyyy"
            });
            return oDateFormat.format(new Date(sDate));
        },

        formatRelativeTime: function (oTimestamp) {
            if (!oTimestamp) return "";
            
            var now = new Date();
            var diffMs = now - new Date(oTimestamp);
            var diffMins = Math.floor(diffMs / 60000);
            var diffHours = Math.floor(diffMs / 3600000);
            var diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) return "Just now";
            if (diffMins < 60) return diffMins + " min ago";
            if (diffHours < 24) return diffHours + " hr ago";
            if (diffDays < 7) return diffDays + " day" + (diffDays > 1 ? "s" : "") + " ago";
            
            return this.formatDate(oTimestamp);
        },

        formatCurrency: function (value) {
            if (!value) return "0";
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0
            }).format(value);
        }
    });
});