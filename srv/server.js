// srv/server.js
const cds = require('@sap/cds');
const authMiddleware = require('./auth-middleware');
const cloudinaryService = require('./cloudinary-service');
require('dotenv').config();

cds.on('bootstrap', app => {
  console.log('CDS server bootstrapped with custom authentication');
  
  // QUAN TRỌNG: Đăng ký Cloudinary service
  cloudinaryService(cds);
  console.log('Cloudinary service registered in bootstrap');
});

// THÊM LOGGING ĐỂ DEBUG
cds.on('served', () => {
  console.log('=== CDS SERVED EVENT ===');
  console.log('Server is ready');
  if (cds.app) {
    console.log('cds.app is available');
  } else {
    console.log('ERROR: cds.app is NOT available');
  }
});

module.exports = cds.server;