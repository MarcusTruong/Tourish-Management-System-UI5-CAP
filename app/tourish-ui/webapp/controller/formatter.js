// File: tourishui/formatter.js
sap.ui.define([], function () {
    "use strict";

    return {
        /**
         * Formats a date to a readable string
         * @param {Date|string} oDate - The date to format
         * @returns {string} The formatted date
         */
        formatDate: function(oDate) {
            if (!oDate) {
                return "";
            }
            
            // If it's already a Date object, no need to convert
            var date = oDate instanceof Date ? oDate : new Date(oDate);
            
            // Return empty string if invalid date
            if (isNaN(date.getTime())) {
                return "";
            }
            
            // Format the date
            var oFormat = sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "MMM d, yyyy"
            });
            
            return oFormat.format(date);
        },
        
        /**
         * Formats a date for backend (YYYY-MM-DD)
         * @param {Date} oDate - The date to format
         * @returns {string} The formatted date
         */
        formatDateForBackend: function(oDate) {
            if (!oDate) {
                return null;
            }
            
            // Return empty string if invalid date
            if (isNaN(oDate.getTime())) {
                return null;
            }
            
            var year = oDate.getFullYear();
            var month = String(oDate.getMonth() + 1).padStart(2, '0');
            var day = String(oDate.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        },
        
        /**
         * Formats a customer title based on type
         * @param {string} sCustomerType - The customer type
         * @param {string} sName - The customer name
         * @returns {string} The formatted title
         */
        formatCustomerTitle: function(sCustomerType, sName) {
            if (!sName) {
                return "";
            }
            
            if (sCustomerType === "Individual") {
                return "Customer: " + sName;
            } else if (sCustomerType === "Business") {
                return "Business: " + sName;
            } else {
                return sName;
            }
        },
        
        /**
         * Formats customer type for display
         * @param {string} sType - The customer type
         * @returns {string} The formatted type
         */
        formatCustomerType: function(sType) {
            if (sType === "Individual") {
                return "Individual Customer";
            } else if (sType === "Business") {
                return "Business Customer";
            } else {
                return sType || "";
            }
        },

        /**
         * Gets sale status text
         * @param {string} saleStart - Sale start date
         * @param {string} saleEnd - Sale end date
         * @returns {string} Status text
         */
        getSaleStatus: function(saleStart, saleEnd) {
            if (!saleStart || !saleEnd) return 'Unknown';
            
            const now = new Date();
            const startDate = new Date(saleStart);
            const endDate = new Date(saleEnd);
            
            if (now < startDate) return 'Not Started';
            if (now > endDate) return 'Ended';
            return 'Active';
        },
        
        /**
         * Gets sale status state for ObjectStatus
         * @param {string} saleStart - Sale start date
         * @param {string} saleEnd - Sale end date
         * @returns {string} Valid state value
         */
        getSaleStatusState: function(saleStart, saleEnd) {
            if (!saleStart || !saleEnd) return 'None';
            
            const now = new Date();
            const startDate = new Date(saleStart);
            const endDate = new Date(saleEnd);
            
            if (now < startDate) return 'Warning';
            if (now > endDate) return 'Error';
            return 'Success';
        },

        /**
         * Formats currency value
         * @param {number} value - The value to format
         * @returns {string} Formatted currency
         */
        formatCurrency: function(value) {
            if (!value && value !== 0) return "0.00";
            return parseFloat(value).toFixed(2);
        },

        /**
         * Formats percentage value
         * @param {number} value - The value to format
         * @returns {string} Formatted percentage
         */
        formatPercentage: function(value) {
            if (!value && value !== 0) return "0%";
            return parseFloat(value).toFixed(1) + "%";
        },

        /**
 * Formats order status for display
 * @param {string} status - Order status
 * @returns {string} Formatted status
 */
formatOrderStatus: function(status) {
    switch(status) {
        case 'Pending': return 'Pending Payment';
        case 'Completed': return 'Completed';
        case 'Canceled': return 'Canceled';
        case 'Overpaid': return 'Overpaid';
        default: return status || 'Unknown';
    }
},

/**
 * Gets order status state for ObjectStatus
 * @param {string} status - Order status
 * @returns {string} Valid state value
 */
getOrderStatusState: function(status) {
    switch(status) {
        case 'Completed': return 'Success';
        case 'Pending': return 'Warning';
        case 'Overpaid': return 'Information';
        case 'Canceled': return 'Error';
        default: return 'None';
    }
}
    };
});