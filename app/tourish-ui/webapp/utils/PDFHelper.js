// File: app/tourish-ui/webapp/utils/PDFHelper.js
sap.ui.define([
], function () {
    "use strict";

    return {
        /**
         * Loads jsPDF library dynamically if not already loaded
         */
        _loadJsPDF: function() {
            return new Promise(function(resolve, reject) {
                // Check if already loaded
                if (window.jsPDF || window.jspdf) {
                    resolve();
                    return;
                }
                
                // Create script element
                var script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.onload = function() {
                    // jsPDF should now be available
                    if (window.jsPDF || window.jspdf) {
                        resolve();
                    } else {
                        reject(new Error('jsPDF failed to load properly'));
                    }
                };
                script.onerror = function() {
                    // Try alternative CDN
                    var altScript = document.createElement('script');
                    altScript.src = 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js';
                    altScript.onload = function() {
                        if (window.jsPDF || window.jspdf) {
                            resolve();
                        } else {
                            reject(new Error('jsPDF failed to load from alternative CDN'));
                        }
                    };
                    altScript.onerror = function() {
                        reject(new Error('Failed to load jsPDF from both CDNs'));
                    };
                    document.head.appendChild(altScript);
                };
                
                document.head.appendChild(script);
            });
        },

        /**
         * Generates and downloads PDF invoice
         * @param {Object} oInvoiceData - Invoice data from the model
         */
        generateInvoicePDF: function(oInvoiceData) {
            var that = this;
            
            // Show loading message
            sap.m.MessageToast.show("Preparing PDF...");
            
            // Load jsPDF if needed
            this._loadJsPDF().then(function() {
                that._createPDF(oInvoiceData);
            }).catch(function(error) {
                console.error("Error loading jsPDF:", error);
                sap.m.MessageBox.error("Failed to load PDF library. Please check your internet connection and try again.");
            });
        },

        /**
         * Creates the actual PDF document
         * @param {Object} oInvoiceData - Invoice data
         */
        _createPDF: function(oInvoiceData) {
            // Check if jsPDF is available in multiple ways
            var jsPDFConstructor = null;
            
            // Try different ways to access jsPDF
            if (typeof window.jsPDF !== 'undefined') {
                jsPDFConstructor = window.jsPDF;
            } else if (typeof jsPDF !== 'undefined') {
                jsPDFConstructor = jsPDF;
            } else if (window.jspdf) {
                // Handle the case where it's window.jspdf.jsPDF
                if (window.jspdf.jsPDF) {
                    jsPDFConstructor = window.jspdf.jsPDF;
                } else if (typeof window.jspdf === 'function') {
                    jsPDFConstructor = window.jspdf;
                } else {
                    // Try to find jsPDF in the jspdf object
                    for (var key in window.jspdf) {
                        if (typeof window.jspdf[key] === 'function' && key.toLowerCase().includes('jspdf')) {
                            jsPDFConstructor = window.jspdf[key];
                            break;
                        }
                    }
                }
            }
            
            // Debug logging
            console.log("=== jsPDF Constructor Debug ===");
            console.log("window.jspdf:", window.jspdf);
            console.log("window.jspdf keys:", window.jspdf ? Object.keys(window.jspdf) : 'N/A');
            console.log("Selected constructor:", jsPDFConstructor);
            console.log("Constructor type:", typeof jsPDFConstructor);
            
            if (!jsPDFConstructor) {
                console.error("jsPDF constructor not found");
                sap.m.MessageBox.error("PDF library not loaded properly. Please refresh the page and try again.");
                return;
            }

            try {
                // Create new PDF document - try different approaches
                var doc;
                
                try {
                    // Method 1: Direct constructor
                    doc = new jsPDFConstructor();
                } catch (e1) {
                    console.log("Method 1 failed:", e1.message);
                    try {
                        // Method 2: Call as function
                        doc = jsPDFConstructor();
                    } catch (e2) {
                        console.log("Method 2 failed:", e2.message);
                        try {
                            // Method 3: Using jsPDF property
                            doc = new jsPDFConstructor.jsPDF();
                        } catch (e3) {
                            console.log("Method 3 failed:", e3.message);
                            throw new Error("Could not create jsPDF instance with any method");
                        }
                    }
                }
                
                console.log("PDF document created successfully:", doc);
                
                // Set up variables
                let yPosition = 20;
                const leftMargin = 20;
                const rightMargin = 190;
                const pageWidth = 210; // A4 width in mm
                const lineHeight = 7;

                // Helper function to add text with word wrap
                const addText = function(text, x, y, maxWidth, fontSize = 10, style = 'normal') {
                    doc.setFontSize(fontSize);
                    doc.setFont('helvetica', style);
                    
                    if (maxWidth) {
                        const lines = doc.splitTextToSize(text, maxWidth);
                        doc.text(lines, x, y);
                        return y + (lines.length * lineHeight);
                    } else {
                        doc.text(text, x, y);
                        return y + lineHeight;
                    }
                };

                // Helper function to add horizontal line
                const addLine = function(y) {
                    doc.setLineWidth(0.5);
                    doc.line(leftMargin, y, rightMargin, y);
                    return y + 5;
                };

                // 1. HEADER SECTION
                // Company name (centered, large)
                doc.setFontSize(20);
                doc.setFont('helvetica', 'bold');
                const companyName = oInvoiceData.company.Name;
                const companyNameWidth = doc.getTextWidth(companyName);
                doc.text(companyName, (pageWidth - companyNameWidth) / 2, yPosition);
                yPosition += 10;

                // Company details (centered, smaller)
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const companyDetails = [
                    oInvoiceData.company.Address,
                    `Phone: ${oInvoiceData.company.Phone} | Email: ${oInvoiceData.company.Email}`
                ];

                companyDetails.forEach(detail => {
                    const detailWidth = doc.getTextWidth(detail);
                    doc.text(detail, (pageWidth - detailWidth) / 2, yPosition);
                    yPosition += 6;
                });

                yPosition += 10;

                // 2. INVOICE HEADER
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text('INVOICE', leftMargin, yPosition);

                // Invoice details (right aligned)
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const invoiceInfo = [
                    `Invoice Number: ${oInvoiceData.invoiceNumber}`,
                    `Invoice Date: ${this.formatDate(oInvoiceData.invoiceDate)}`,
                    `Order ID: ${oInvoiceData.order.ID.substring(0, 8)}`,
                    `Order Date: ${this.formatDate(oInvoiceData.order.OrderDate)}`
                ];

                let rightYPosition = yPosition;
                invoiceInfo.forEach(info => {
                    const infoWidth = doc.getTextWidth(info);
                    doc.text(info, rightMargin - infoWidth, rightYPosition);
                    rightYPosition += 6;
                });

                yPosition = Math.max(yPosition + 20, rightYPosition + 10);

                // 3. CUSTOMER INFORMATION
                yPosition = addLine(yPosition);
                
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                yPosition = addText('Bill To:', leftMargin, yPosition, null, 12, 'bold');
                yPosition += 3;

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                yPosition = addText(oInvoiceData.customer.Name, leftMargin, yPosition, rightMargin - leftMargin, 10, 'bold');
                yPosition = addText(oInvoiceData.customer.Address, leftMargin, yPosition, rightMargin - leftMargin);
                yPosition = addText(`Phone: ${oInvoiceData.customer.Phone}`, leftMargin, yPosition);
                yPosition = addText(`Email: ${oInvoiceData.customer.Email}`, leftMargin, yPosition);
                yPosition += 10;

                // 4. TOUR INFORMATION
                yPosition = addLine(yPosition);
                
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                yPosition = addText('Tour Details:', leftMargin, yPosition, null, 12, 'bold');
                yPosition += 3;

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                yPosition = addText(`Tour: ${oInvoiceData.tour.TourName}`, leftMargin, yPosition, rightMargin - leftMargin, 10, 'bold');
                yPosition = addText(`Departure: ${this.formatDate(oInvoiceData.tour.DepartureDate)}`, leftMargin, yPosition);
                yPosition = addText(`Return: ${this.formatDate(oInvoiceData.tour.ReturnDate)}`, leftMargin, yPosition);
                yPosition = addText(`Duration: ${oInvoiceData.tour.Duration}`, leftMargin, yPosition);
                yPosition += 10;

                // 5. PASSENGERS TABLE
                yPosition = addLine(yPosition);
                
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                yPosition = addText('Passengers:', leftMargin, yPosition, null, 12, 'bold');
                yPosition += 5;

                // Table headers
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                const headers = ['Type', 'Full Name', 'Gender', 'Birth Date', 'ID Number'];
                const colWidths = [25, 50, 25, 30, 40];
                let xPos = leftMargin;

                headers.forEach((header, index) => {
                    doc.text(header, xPos, yPosition);
                    xPos += colWidths[index];
                });
                yPosition += 3;

                // Table line
                doc.setLineWidth(0.3);
                doc.line(leftMargin, yPosition, rightMargin, yPosition);
                yPosition += 5;

                // Passenger data
                doc.setFont('helvetica', 'normal');
                oInvoiceData.passengers.forEach(passenger => {
                    xPos = leftMargin;
                    const rowData = [
                        passenger.IsAdult ? 'Adult' : 'Child',
                        passenger.FullName || '',
                        passenger.Gender || '',
                        this.formatDate(passenger.BirthDate) || '',
                        passenger.IDNumber || ''
                    ];

                    rowData.forEach((data, index) => {
                        doc.text(data, xPos, yPosition);
                        xPos += colWidths[index];
                    });
                    yPosition += 6;
                });

                yPosition += 10;

                // 6. SERVICES BREAKDOWN
                yPosition = addLine(yPosition);
                
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                yPosition = addText('Service Breakdown:', leftMargin, yPosition, null, 12, 'bold');
                yPosition += 5;

                // Service table headers
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                const serviceHeaders = ['Description', 'Qty', 'Unit Price', 'Total'];
                const serviceColWidths = [80, 20, 35, 35];
                xPos = leftMargin;

                serviceHeaders.forEach((header, index) => {
                    if (index > 0) {
                        // Right align numeric columns
                        const headerWidth = doc.getTextWidth(header);
                        doc.text(header, xPos + serviceColWidths[index] - headerWidth, yPosition);
                    } else {
                        doc.text(header, xPos, yPosition);
                    }
                    xPos += serviceColWidths[index];
                });
                yPosition += 3;

                doc.line(leftMargin, yPosition, rightMargin, yPosition);
                yPosition += 5;

                // Service data
                doc.setFont('helvetica', 'normal');
                oInvoiceData.services.forEach(service => {
                    xPos = leftMargin;
                    
                    // Description
                    doc.text(service.Description, xPos, yPosition);
                    xPos += serviceColWidths[0];
                    
                    // Quantity (right aligned)
                    const qtyText = (service.Quantity || 0).toString();
                    const qtyWidth = doc.getTextWidth(qtyText);
                    doc.text(qtyText, xPos + serviceColWidths[1] - qtyWidth, yPosition);
                    xPos += serviceColWidths[1];
                    
                    // Unit Price (right aligned) - Fix toFixed error
                    const unitPrice = parseFloat(service.UnitPrice) || 0;
                    const unitPriceText = `${unitPrice.toFixed(2)}`;
                    const unitPriceWidth = doc.getTextWidth(unitPriceText);
                    doc.text(unitPriceText, xPos + serviceColWidths[2] - unitPriceWidth, yPosition);
                    xPos += serviceColWidths[2];
                    
                    // Total (right aligned) - Fix toFixed error
                    const total = parseFloat(service.Total) || 0;
                    const totalText = `${total.toFixed(2)}`;
                    const totalWidth = doc.getTextWidth(totalText);
                    doc.text(totalText, xPos + serviceColWidths[3] - totalWidth, yPosition);
                    
                    yPosition += 6;
                });

                yPosition += 10;

                // 7. TOTALS SECTION
                yPosition = addLine(yPosition);
                
                const totalsX = 130;
                const amountX = 170;

                // Subtotal
                doc.setFont('helvetica', 'normal');
                doc.text('Subtotal:', totalsX, yPosition);
                const subtotalValue = parseFloat(oInvoiceData.totals.Subtotal) || 0;
                const subtotalText = `${subtotalValue.toFixed(2)}`;
                const subtotalWidth = doc.getTextWidth(subtotalText);
                doc.text(subtotalText, amountX + 20 - subtotalWidth, yPosition);
                yPosition += 7;

                // Discount (if any)
                const discountValue = parseFloat(oInvoiceData.totals.Discount) || 0;
                if (discountValue > 0) {
                    doc.text('Discount:', totalsX, yPosition);
                    const discountText = `-${discountValue.toFixed(2)}`;
                    const discountWidth = doc.getTextWidth(discountText);
                    doc.text(discountText, amountX + 20 - discountWidth, yPosition);
                    yPosition += 7;
                }

                // Total
                doc.setFont('helvetica', 'bold');
                doc.text('Total Amount:', totalsX, yPosition);
                const totalValue = parseFloat(oInvoiceData.totals.Total) || 0;
                const totalAmountText = `${totalValue.toFixed(2)}`;
                const totalAmountWidth = doc.getTextWidth(totalAmountText);
                doc.text(totalAmountText, amountX + 20 - totalAmountWidth, yPosition);
                yPosition += 7;

                // Paid
                doc.setFont('helvetica', 'normal');
                doc.text('Paid Amount:', totalsX, yPosition);
                const paidValue = parseFloat(oInvoiceData.totals.Paid) || 0;
                const paidText = `${paidValue.toFixed(2)}`;
                const paidWidth = doc.getTextWidth(paidText);
                doc.text(paidText, amountX + 20 - paidWidth, yPosition);
                yPosition += 7;

                // Remaining
                doc.setFont('helvetica', 'bold');
                doc.text('Remaining:', totalsX, yPosition);
                const remainingValue = parseFloat(oInvoiceData.totals.Remaining) || 0;
                const remainingText = `${remainingValue.toFixed(2)}`;
                const remainingWidth = doc.getTextWidth(remainingText);
                doc.text(remainingText, amountX + 20 - remainingWidth, yPosition);
                yPosition += 15;

                // 8. FOOTER
                yPosition = addLine(yPosition);
                
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                const thankYouText = 'Thank you for choosing our tour services!';
                const thankYouWidth = doc.getTextWidth(thankYouText);
                doc.text(thankYouText, (pageWidth - thankYouWidth) / 2, yPosition);
                yPosition += 8;

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const journeyText = 'Have a wonderful journey!';
                const journeyWidth = doc.getTextWidth(journeyText);
                doc.text(journeyText, (pageWidth - journeyWidth) / 2, yPosition);
                yPosition += 15;

                const generatedText = `Generated on ${this.formatDateTime(new Date())}`;
                const generatedWidth = doc.getTextWidth(generatedText);
                doc.text(generatedText, (pageWidth - generatedWidth) / 2, yPosition);

                // Save the PDF
                const fileName = `Invoice-${oInvoiceData.invoiceNumber}.pdf`;
                doc.save(fileName);

                // Show success message
                sap.m.MessageToast.show("Invoice PDF downloaded successfully");

            } catch (error) {
                console.error("Error generating PDF:", error);
                sap.m.MessageBox.error("Error generating PDF: " + error.message);
            }
        },

        /**
         * Format date for display
         * @param {Date|string} date - Date to format
         * @returns {string} Formatted date
         */
        formatDate: function(date) {
            if (!date) return '';
            
            try {
                const d = new Date(date);
                if (isNaN(d.getTime())) return '';
                
                return d.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            } catch (error) {
                console.warn('Error formatting date:', date, error);
                return '';
            }
        },

        /**
         * Format date and time for display
         * @param {Date|string} date - Date to format
         * @returns {string} Formatted date and time
         */
        formatDateTime: function(date) {
            if (!date) return '';
            
            try {
                const d = new Date(date);
                if (isNaN(d.getTime())) return '';
                
                return d.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (error) {
                console.warn('Error formatting date time:', date, error);
                return '';
            }
        }
    };
});