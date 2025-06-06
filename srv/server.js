const cds = require('@sap/cds');
const authMiddleware = require('./auth-middleware');
require('dotenv').config();

cds.on('bootstrap', app => {
  console.log('CDS server bootstrapped with custom authentication');
  
  // Apply custom auth middleware to all routes
  app.use('/user-service', authMiddleware);
  app.use('/customer-service', authMiddleware);
  app.use('/order-service', authMiddleware);
  app.use('/tour-service', authMiddleware);
  app.use('/supplier-service', authMiddleware);
});

module.exports = cds.server;