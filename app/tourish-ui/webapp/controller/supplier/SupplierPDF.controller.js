sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("tourishui.controller.supplier.SupplierPDF", {
        
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("supplierPDF").attachPatternMatched(this._onPatternMatched, this);
        },
        
        _onPatternMatched: function (oEvent) {
            var sSupplierID = oEvent.getParameter("arguments").supplierID;
            if (sSupplierID) {
                this._loadAndGeneratePDF(sSupplierID);
            }
        },
        
        _loadAndGeneratePDF: function (sSupplierID) {
            var that = this;
            var oODataModel = this.getOwnerComponent().getModel("supplierService");
            
            this.getView().setBusy(true);

            // Gọi action generateSupplierPDF (giả sử backend có action này)
            var oContext = oODataModel.bindContext("/generateSupplierPDF(...)");
            oContext.setParameter("supplierID", sSupplierID);

            oContext.execute().then(function () {
                var oResult = oContext.getBoundContext().getObject();
                
                // Giả sử backend trả về base64 string hoặc URL
                var sPdfBase64 = oResult.pdfContent; // hoặc oResult.pdfUrl
                var sPdfUrl = "data:application/pdf;base64," + sPdfBase64;

                var oPDFModel = new JSONModel({
                    pdfUrl: sPdfUrl,
                    title: "Supplier Report - " + oResult.supplier.SupplierName,
                    height: "100vh",
                    generatedDate: new Date().toLocaleString()
                });

                that.getView().setModel(oPDFModel, "pdfModel");
                that.getView().setBusy(false);

            }).catch(function (oError) {
                that.getView().setBusy(false);
                var sMessage = "Không thể tạo PDF cho nhà cung cấp!";
                try {
                    var oResp = JSON.parse(oError.responseText);
                    sMessage = oResp.error.message || sMessage;
                } catch (e) {}
                MessageBox.error(sMessage);
            });
        },

        onDownloadPDF: function () {
            var sUrl = this.getView().getModel("pdfModel").getProperty("/pdfUrl");
            if (sUrl) {
                var link = document.createElement("a");
                link.href = sUrl;
                link.download = "Supplier_Report_" + new Date().getTime() + ".pdf";
                link.click();
            } else {
                MessageToast.show("PDF chưa sẵn sàng để tải xuống.");
            }
        },

        onPrint: function () {
            var oPDFViewer = this.byId("pdfViewer");
            if (oPDFViewer && oPDFViewer.getDomRef()) {
                oPDFViewer.getDomRef().contentWindow.print();
            } else {
                window.print();
            }
        },

        onEmail: function () {
            MessageToast.show("Gửi email - Chưa triển khai");
            // TODO: Gọi service gửi email với attachment PDF
        },

        onCloseWindow: function () {
            window.close();
        }
    });
});