// srv/test-service.js - TẠO FILE MỚI
const cds = require('@sap/cds');

module.exports = (srv) => {
  console.log('Test service being registered...');
  
  // Đợi CDS sẵn sàng
  cds.on('served', () => {
    if (cds.app) {
      console.log('Registering test endpoint...');
      
      // Test endpoint đơn giản
      cds.app.get('/api/test', (req, res) => {
        console.log('Test endpoint hit!');
        res.json({ message: 'Server is working!', timestamp: new Date() });
      });
      
      // Test POST endpoint
      cds.app.post('/api/test-upload', (req, res) => {
        console.log('Test upload endpoint hit!');
        console.log('Headers:', req.headers);
        console.log('Body type:', typeof req.body);
        res.json({ message: 'Upload endpoint accessible!' });
      });
      
      console.log('Test endpoints registered');
    } else {
      console.log('cds.app not available in test service');
    }
  });
};