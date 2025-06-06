const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-secret-key-12345'; // Same as in user-service.js

module.exports = (req, res, next) => {
  // Skip auth for public endpoints
  const publicEndpoints = ['/authenticate', '/createUser'];
  const isPublicEndpoint = publicEndpoints.some(endpoint => 
    req.path.includes(endpoint)
  );
  
  if (isPublicEndpoint) {
    return next();
  }

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
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
    req.user = {
      id: decoded.username, // Use username as id for CDS compatibility
      username: decoded.username,
      role: decoded.role,
      userId: decoded.id
    };

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({
      error: 'Invalid token.'
    });
  }
};