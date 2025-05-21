sap.ui.define([], function() {
    "use strict";
    
    return {
        /**
         * Formats a date object to a readable string
         * @param {Date} oDate Date object to format
         * @returns {string} Formatted date string
         */
        formatDate: function(oDate) {
            if (!oDate) {
                return "";
            }
            
            // Convert string to date if needed
            if (typeof oDate === "string") {
                oDate = new Date(oDate);
            }
            
            var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                pattern: "dd MMM yyyy, HH:mm"
            });
            
            return oDateFormat.format(oDate);
        },
        
        /**
         * Formats a number to currency
         * @param {number} fValue Number to format
         * @param {string} sCurrency Currency code
         * @returns {string} Formatted currency string
         */
        formatCurrency: function(fValue, sCurrency) {
            var oCurrencyFormat = sap.ui.core.format.NumberFormat.getCurrencyInstance();
            return oCurrencyFormat.format(fValue, sCurrency);
        },
        
        /**
         * Formats customer type for display
         * @param {string} sType Customer type
         * @returns {string} Formatted customer type
         */
        formatCustomerType: function(sType) {
            if (sType === "Individual") {
                return "Individual Customer";
            } else if (sType === "Business") {
                return "Business Client";
            }
            return sType;
        },
        
        /**
         * Formats customer title for page header
         * @param {string} sType Customer type
         * @param {string} sName Customer name
         * @returns {string} Formatted customer title
         */
        formatCustomerTitle: function(sType, sName) {
            if (!sName) {
                return "Customer Details";
            }
            
            return sType === "Individual" ? "Customer: " + sName : "Business Client: " + sName;
        }
    };
});