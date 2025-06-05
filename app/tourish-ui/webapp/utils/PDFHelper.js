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
                if (window.jspdf.jsPDF) {
                    jsPDFConstructor = window.jspdf.jsPDF;
                } else if (typeof window.jspdf === 'function') {
                    jsPDFConstructor = window.jspdf;
                } else {
                    for (var key in window.jspdf) {
                        if (typeof window.jspdf[key] === 'function' && key.toLowerCase().includes('jspdf')) {
                            jsPDFConstructor = window.jspdf[key];
                            break;
                        }
                    }
                }
            }
            
            if (!jsPDFConstructor) {
                console.error("jsPDF constructor not found");
                sap.m.MessageBox.error("PDF library not loaded properly. Please refresh the page and try again.");
                return;
            }
        
            try {
                var doc;
                try {
                    doc = new jsPDFConstructor();
                } catch (e1) {
                    try {
                        doc = jsPDFConstructor();
                    } catch (e2) {
                        try {
                            doc = new jsPDFConstructor.jsPDF();
                        } catch (e3) {
                            throw new Error("Could not create jsPDF instance with any method");
                        }
                    }
                }
                
                // Local helper functions to avoid 'this' context issues
                const formatCurrency = function(value) {
                    if (!value && value !== 0) return "0.00";
                    return parseFloat(value).toFixed(2);
                };
        
                const formatDate = function(date) {
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
                };
        
                const formatDateTime = function(date) {
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
                };
                
                // Set up variables for A4 page
                let yPosition = 20;
                const leftMargin = 15;
                const rightMargin = 195;
                const pageWidth = 210;
                const pageHeight = 297;
                const lineHeight = 6;
                const sectionSpacing = 8;
        
                // Helper function to check page break and add new page if needed
                const checkPageBreak = function(nextSectionHeight) {
                    if (yPosition + nextSectionHeight > pageHeight - 20) {
                        doc.addPage();
                        yPosition = 20;
                        return true;
                    }
                    return false;
                };
        
                // Helper function to add section divider
                const addSectionDivider = function() {
                    doc.setLineWidth(0.3);
                    doc.setDrawColor(200, 200, 200);
                    doc.line(leftMargin, yPosition, rightMargin, yPosition);
                    yPosition += 5;
                };
        
                // Helper function to add text with proper styling
                const addText = function(text, x, y, options = {}) {
                    const fontSize = options.fontSize || 10;
                    const fontStyle = options.fontStyle || 'normal';
                    const maxWidth = options.maxWidth;
                    const align = options.align || 'left';
                    
                    doc.setFontSize(fontSize);
                    doc.setFont('helvetica', fontStyle);
                    
                    if (maxWidth) {
                        const lines = doc.splitTextToSize(text, maxWidth);
                        if (align === 'center') {
                            lines.forEach((line, index) => {
                                const lineWidth = doc.getTextWidth(line);
                                doc.text(line, x - lineWidth / 2, y + (index * lineHeight));
                            });
                        } else if (align === 'right') {
                            lines.forEach((line, index) => {
                                const lineWidth = doc.getTextWidth(line);
                                doc.text(line, x - lineWidth, y + (index * lineHeight));
                            });
                        } else {
                            doc.text(lines, x, y);
                        }
                        return y + (lines.length * lineHeight);
                    } else {
                        if (align === 'center') {
                            const textWidth = doc.getTextWidth(text);
                            doc.text(text, x - textWidth / 2, y);
                        } else if (align === 'right') {
                            const textWidth = doc.getTextWidth(text);
                            doc.text(text, x - textWidth, y);
                        } else {
                            doc.text(text, x, y);
                        }
                        return y + lineHeight;
                    }
                };
        
                // 1. COMPANY HEADER (centered)
                yPosition = addText(oInvoiceData.company.Name, pageWidth / 2, yPosition, {
                    fontSize: 18,
                    fontStyle: 'bold',
                    align: 'center'
                });
                yPosition += 2;
                
                yPosition = addText(oInvoiceData.company.Address, pageWidth / 2, yPosition, {
                    fontSize: 10,
                    align: 'center'
                });
                
                yPosition = addText(`Phone: ${oInvoiceData.company.Phone} | Email: ${oInvoiceData.company.Email}`, 
                    pageWidth / 2, yPosition, {
                    fontSize: 10,
                    align: 'center'
                });
                yPosition += sectionSpacing;
        
                addSectionDivider();
        
                // 2. INVOICE HEADER
                const invoiceHeaderY = yPosition;
                
                // Left side - Invoice title and basic info
                yPosition = addText('INVOICE', leftMargin, yPosition, {
                    fontSize: 16,
                    fontStyle: 'bold'
                });
                yPosition += 2;
                
                yPosition = addText(`Invoice Number: ${oInvoiceData.invoiceNumber}`, leftMargin, yPosition, {
                    fontSize: 10,
                    fontStyle: 'bold'
                });
                
                yPosition = addText(`Invoice Date: ${formatDate(oInvoiceData.invoiceDate)}`, leftMargin, yPosition);
        
                // Right side - Order info
                let rightY = invoiceHeaderY + 15;
                addText(`Order ID: ${oInvoiceData.order.ID.substring(0, 8)}`, rightMargin, rightY, {
                    fontSize: 10,
                    fontStyle: 'bold',
                    align: 'right'
                });
                rightY += lineHeight;
                
                addText(`Order Date: ${formatDate(oInvoiceData.order.OrderDate)}`, rightMargin, rightY, {
                    align: 'right'
                });
        
                yPosition = Math.max(yPosition, rightY) + sectionSpacing;
                addSectionDivider();
        
                // 3. BILL TO SECTION
                yPosition = addText('Bill To:', leftMargin, yPosition, {
                    fontSize: 12,
                    fontStyle: 'bold'
                });
                yPosition += 2;
                
                yPosition = addText(oInvoiceData.customer.Name, leftMargin, yPosition, {
                    fontStyle: 'bold',
                    maxWidth: rightMargin - leftMargin
                });
                
                yPosition = addText(oInvoiceData.customer.Address, leftMargin, yPosition, {
                    maxWidth: rightMargin - leftMargin
                });
                
                yPosition = addText(`Phone: ${oInvoiceData.customer.Phone}`, leftMargin, yPosition);
                yPosition = addText(`Email: ${oInvoiceData.customer.Email}`, leftMargin, yPosition);
                yPosition += sectionSpacing;
        
                addSectionDivider();
        
                // 4. TOUR DETAILS SECTION
                yPosition = addText('Tour Details:', leftMargin, yPosition, {
                    fontSize: 12,
                    fontStyle: 'bold'
                });
                yPosition += 2;
                
                yPosition = addText(`Tour Name: ${oInvoiceData.tour.TourName}`, leftMargin, yPosition, {
                    fontStyle: 'bold',
                    maxWidth: rightMargin - leftMargin
                });
                
                yPosition = addText(`Departure Date: ${formatDate(oInvoiceData.tour.DepartureDate)}`, leftMargin, yPosition);
                yPosition = addText(`Return Date: ${formatDate(oInvoiceData.tour.ReturnDate)}`, leftMargin, yPosition);
                yPosition = addText(`Duration: ${oInvoiceData.tour.Duration}`, leftMargin, yPosition);
                yPosition += sectionSpacing;
        
                // 5. TOUR ITINERARY (if has schedules and space allows)
                if (oInvoiceData.schedules && oInvoiceData.schedules.length > 0) {
                    checkPageBreak(50);
                    addSectionDivider();
                    
                    yPosition = addText('Tour Itinerary:', leftMargin, yPosition, {
                        fontSize: 12,
                        fontStyle: 'bold'
                    });
                    yPosition += 2;
        
                    // Show abbreviated itinerary to save space
                    oInvoiceData.schedules.slice(0, 3).forEach((schedule, index) => {
                        if (checkPageBreak(15)) return;
                        
                        yPosition = addText(`Day ${schedule.DayNumber}: ${schedule.DayTitle}`, leftMargin, yPosition, {
                            fontStyle: 'bold',
                            maxWidth: rightMargin - leftMargin
                        });
                        
                        // Show meals info
                        const meals = [];
                        if (schedule.BreakfastIncluded) meals.push('Breakfast');
                        if (schedule.LunchIncluded) meals.push('Lunch');
                        if (schedule.DinnerIncluded) meals.push('Dinner');
                        
                        if (meals.length > 0) {
                            yPosition = addText(`Meals included: ${meals.join(', ')}`, leftMargin + 5, yPosition, {
                                fontSize: 9
                            });
                        }
                        
                        yPosition = addText(schedule.Overview, leftMargin + 5, yPosition, {
                            fontSize: 9,
                            maxWidth: rightMargin - leftMargin - 10
                        });
                        yPosition += 2;
                    });
                    
                    if (oInvoiceData.schedules.length > 3) {
                        yPosition = addText(`... and ${oInvoiceData.schedules.length - 3} more days`, leftMargin + 5, yPosition, {
                            fontSize: 9,
                            fontStyle: 'italic'
                        });
                    }
                    yPosition += sectionSpacing;
                }
        
                // 6. PASSENGERS SECTION
                checkPageBreak(60);
                addSectionDivider();
                
                yPosition = addText('Passengers:', leftMargin, yPosition, {
                    fontSize: 12,
                    fontStyle: 'bold'
                });
                yPosition += 5;
        
                // Passenger table headers
                const passengerCols = [
                    { title: 'Type', x: leftMargin, width: 25 },
                    { title: 'Full Name', x: leftMargin + 25, width: 50 },
                    { title: 'Gender', x: leftMargin + 75, width: 20 },
                    { title: 'Birth Date', x: leftMargin + 95, width: 30 },
                    { title: 'ID Number', x: leftMargin + 125, width: 35 }
                ];
        
                // Table headers
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                passengerCols.forEach(col => {
                    doc.text(col.title, col.x, yPosition);
                });
                yPosition += 3;
        
                // Header line
                doc.setLineWidth(0.3);
                doc.line(leftMargin, yPosition, leftMargin + 155, yPosition);
                yPosition += 3;
        
                // Passenger data
                doc.setFont('helvetica', 'normal');
                oInvoiceData.passengers.forEach(passenger => {
                    if (checkPageBreak(8)) {
                        // Redraw headers on new page
                        doc.setFont('helvetica', 'bold');
                        passengerCols.forEach(col => {
                            doc.text(col.title, col.x, yPosition);
                        });
                        yPosition += 3;
                        doc.line(leftMargin, yPosition, leftMargin + 155, yPosition);
                        yPosition += 3;
                        doc.setFont('helvetica', 'normal');
                    }
                    
                    const passengerData = [
                        passenger.IsAdult ? 'Adult' : 'Child',
                        passenger.FullName || 'N/A',
                        passenger.Gender || 'N/A',
                        formatDate(passenger.BirthDate) || 'N/A',
                        passenger.IDNumber || 'N/A'
                    ];
        
                    passengerCols.forEach((col, index) => {
                        const text = passengerData[index];
                        if (text.length > 15 && col.width < 40) {
                            doc.text(text.substring(0, 12) + '...', col.x, yPosition);
                        } else {
                            doc.text(text, col.x, yPosition);
                        }
                    });
                    yPosition += 6;
                });
                yPosition += sectionSpacing;
        
                // 7. SERVICE BREAKDOWN
                checkPageBreak(40);
                addSectionDivider();
                
                yPosition = addText('Service Breakdown:', leftMargin, yPosition, {
                    fontSize: 12,
                    fontStyle: 'bold'
                });
                yPosition += 5;
        
                // Service table
                const serviceCols = [
                    { title: 'Description', x: leftMargin, width: 80 },
                    { title: 'Qty', x: leftMargin + 80, width: 20 },
                    { title: 'Unit Price', x: leftMargin + 100, width: 30 },
                    { title: 'Total', x: leftMargin + 130, width: 30 }
                ];
        
                // Service headers
                doc.setFont('helvetica', 'bold');
                serviceCols.forEach(col => {
                    if (col.title === 'Qty' || col.title === 'Unit Price' || col.title === 'Total') {
                        addText(col.title, col.x + col.width, yPosition, { align: 'right' });
                    } else {
                        doc.text(col.title, col.x, yPosition);
                    }
                });
                yPosition += 3;
        
                doc.line(leftMargin, yPosition, leftMargin + 160, yPosition);
                yPosition += 3;
        
                // Service data
                doc.setFont('helvetica', 'normal');
                oInvoiceData.services.forEach(service => {
                    if (checkPageBreak(8)) {
                        // Redraw headers
                        doc.setFont('helvetica', 'bold');
                        serviceCols.forEach(col => {
                            if (col.title === 'Qty' || col.title === 'Unit Price' || col.title === 'Total') {
                                addText(col.title, col.x + col.width, yPosition, { align: 'right' });
                            } else {
                                doc.text(col.title, col.x, yPosition);
                            }
                        });
                        yPosition += 3;
                        doc.line(leftMargin, yPosition, leftMargin + 160, yPosition);
                        yPosition += 3;
                        doc.setFont('helvetica', 'normal');
                    }
        
                    // Description
                    doc.text(service.Description, serviceCols[0].x, yPosition);
                    
                    // Quantity (right aligned)
                    addText(service.Quantity.toString(), serviceCols[1].x + serviceCols[1].width, yPosition, { align: 'right' });
                    
                    // Unit Price (right aligned)
                    addText(formatCurrency(service.UnitPrice), serviceCols[2].x + serviceCols[2].width, yPosition, { align: 'right' });
                    
                    // Total (right aligned)
                    addText(formatCurrency(service.Total), serviceCols[3].x + serviceCols[3].width, yPosition, { align: 'right' });
                    
                    yPosition += 6;
                });
                yPosition += sectionSpacing;
        
                // 8. INCLUSIONS AND EXCLUSIONS (condensed)
                if (oInvoiceData.inclusions || oInvoiceData.exclusions) {
                    checkPageBreak(30);
                    addSectionDivider();
                    
                    if (oInvoiceData.inclusions) {
                        yPosition = addText('Inclusions:', leftMargin, yPosition, {
                            fontSize: 11,
                            fontStyle: 'bold'
                        });
                        yPosition = addText(oInvoiceData.inclusions, leftMargin, yPosition, {
                            fontSize: 9,
                            maxWidth: rightMargin - leftMargin
                        });
                        yPosition += 3;
                    }
                    
                    if (oInvoiceData.exclusions) {
                        yPosition = addText('Exclusions:', leftMargin, yPosition, {
                            fontSize: 11,
                            fontStyle: 'bold'
                        });
                        yPosition = addText(oInvoiceData.exclusions, leftMargin, yPosition, {
                            fontSize: 9,
                            maxWidth: rightMargin - leftMargin
                        });
                        yPosition += sectionSpacing;
                    }
                }
        
                // 9. PAYMENT SUMMARY
                checkPageBreak(50);
                addSectionDivider();
                
                yPosition = addText('Payment Summary:', leftMargin, yPosition, {
                    fontSize: 12,
                    fontStyle: 'bold'
                });
                yPosition += 5;
        
                // Payment history table (if any payments exist)
                if (oInvoiceData.payments && oInvoiceData.payments.length > 0) {
                    yPosition = addText('Payment History:', leftMargin, yPosition, {
                        fontSize: 11,
                        fontStyle: 'bold'
                    });
                    yPosition += 3;
        
                    // Payment table headers
                    doc.setFont('helvetica', 'bold');
                    doc.text('Date', leftMargin, yPosition);
                    doc.text('Method', leftMargin + 30, yPosition);
                    addText('Amount', leftMargin + 80, yPosition, { align: 'right' });
                    yPosition += 3;
        
                    doc.line(leftMargin, yPosition, leftMargin + 80, yPosition);
                    yPosition += 3;
        
                    // Payment data
                    doc.setFont('helvetica', 'normal');
                    oInvoiceData.payments.forEach(payment => {
                        doc.text(formatDate(payment.PaymentDate), leftMargin, yPosition);
                        doc.text(payment.PaymentMethod, leftMargin + 30, yPosition);
                        addText(formatCurrency(payment.Amount), leftMargin + 80, yPosition, { align: 'right' });
                        yPosition += 5;
                    });
                    yPosition += 5;
                }
        
                // Totals section (right aligned)
                const totalsX = 130;
                const amountX = 180;
        
                // Subtotal
                doc.setFont('helvetica', 'normal');
                doc.text('Subtotal:', totalsX, yPosition);
                addText(formatCurrency(oInvoiceData.totals.Subtotal), amountX, yPosition, { align: 'right' });
                yPosition += lineHeight;
        
                // Discount (if any)
                if (parseFloat(oInvoiceData.totals.Discount) > 0) {
                    doc.text('Discount:', totalsX, yPosition);
                    addText(`-${formatCurrency(oInvoiceData.totals.Discount)}`, amountX, yPosition, { align: 'right' });
                    yPosition += lineHeight;
                }
        
                // Total Amount
                doc.setFont('helvetica', 'bold');
                doc.text('Total Amount:', totalsX, yPosition);
                addText(formatCurrency(oInvoiceData.totals.Total), amountX, yPosition, { 
                    align: 'right',
                    fontStyle: 'bold'
                });
                yPosition += lineHeight;
        
                // Paid Amount
                doc.setFont('helvetica', 'normal');
                doc.text('Paid Amount:', totalsX, yPosition);
                addText(formatCurrency(oInvoiceData.totals.Paid), amountX, yPosition, { align: 'right' });
                yPosition += lineHeight;
        
                // Remaining Amount
                doc.setFont('helvetica', 'bold');
                doc.text('Remaining:', totalsX, yPosition);
                addText(formatCurrency(oInvoiceData.totals.Remaining), amountX, yPosition, { 
                    align: 'right',
                    fontStyle: 'bold'
                });
                yPosition += sectionSpacing * 2;
        
                // 10. FOOTER
                checkPageBreak(20);
                addSectionDivider();
                
                yPosition = addText('Thank you for choosing our tour services!', pageWidth / 2, yPosition, {
                    fontSize: 12,
                    fontStyle: 'bold',
                    align: 'center'
                });
                
                yPosition = addText('Have a wonderful journey!', pageWidth / 2, yPosition, {
                    fontSize: 10,
                    align: 'center'
                });
                yPosition += 5;
                
                addText(`Generated on ${formatDateTime(new Date())}`, pageWidth / 2, yPosition, {
                    fontSize: 8,
                    align: 'center'
                });
        
                // Save the PDF
                const fileName = `Invoice-${oInvoiceData.invoiceNumber}.pdf`;
                doc.save(fileName);
        
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