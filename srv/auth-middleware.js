const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-secret-key-12345'; // Same as in user-service.js
const cds = require('@sap/cds')

module.exports = (req, res, next) => {
  // Skip auth for public endpoints
  const publicEndpoints = ['/authenticate', '/createUser', '/$metadata'];
  const isPublicEndpoint = publicEndpoints.some(endpoint => 
    req.path.includes(endpoint)
  );
  
  if (isPublicEndpoint) {
    return next();
  }

  // Extract token from Authorization header
  const authHeader = req.headers.customauthorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    return res.status(401).json({
      error: 'Access denied. No token provided.'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Set user info for CDS
    req.user = new cds.User({
      id: decoded.username,      // CDS expects 'id'
      username: decoded.username, // Keep username for reference
      role: decoded.role,
      roles: Array.isArray(decoded.role) ? decoded.role : [decoded.role],
      userId: decoded.id,        // Original user ID
      attr: {                    // Additional attributes
          username: decoded.username,
          role: decoded.role
      }
  });

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({
      error: 'Invalid token.'
    });
  }
};