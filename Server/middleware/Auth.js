// middleware/auth.js  — renamed from Auth.js to auth.js (fixes Linux MODULE_NOT_FOUND crash)
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User no longer exists or is inactive.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    // ✅ case-insensitive role check (server stores 'Faculty', client sends 'faculty')
    const userRoleLower = req.user.role.toLowerCase();
    if (!roles.map(r => r.toLowerCase()).includes(userRoleLower)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden. Restricted to: ${roles.join(', ')}`,
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };