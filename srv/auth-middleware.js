// srv/auth-middleware.js (Enhanced version)
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-secret-key-12345'; // Same as in user-service.js
const cds = require('@sap/cds');

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
    console.log('Access denied: No token provided');
    return res.status(401).json({
      error: 'Access denied. No token provided.',
      code: 'NO_TOKEN'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token decoded successfully for user:', decoded.username);
    
    // Enhanced user object with more information for CDS
    req.user = new cds.User({
      id: decoded.username,      // CDS expects 'id'
      username: decoded.username, // Keep username for reference
      role: decoded.role,
      roles: Array.isArray(decoded.role) ? decoded.role : [decoded.role],
      userId: decoded.id,        // Original user ID
      attr: {                    // Additional attributes
          username: decoded.username,
          role: decoded.role,
          userId: decoded.id,
          workspaceID: decoded.workspaceID, 
          fullName: decoded.fullName,
          email: decoded.email
      }
    });

    // Log user info for debugging
    console.log('User authenticated:', {
      username: decoded.username,
      role: decoded.role,
      workspaceID: decoded.workspaceID
    });

    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    
    // Provide specific error messages
    let errorMessage = 'Invalid token.';
    let errorCode = 'INVALID_TOKEN';
    
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token has expired.';
      errorCode = 'TOKEN_EXPIRED';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token format.';
      errorCode = 'TOKEN_MALFORMED';
    }
    
    return res.status(403).json({
      error: errorMessage,
      code: errorCode
    });
  }
};