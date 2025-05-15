// srv/server.js
const cds = require('@sap/cds');
require('dotenv').config(); // Nạp biến môi trường từ file .env

// Middleware để phục vụ nội dung tĩnh
cds.on('bootstrap', app => {
  // Log để xác nhận server đã khởi động
  console.log('CDS server bootstrapped with Cloudinary integration');
});

// Khởi động server
module.exports = cds.server;