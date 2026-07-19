const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Get token from header
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization token, access denied' });
  }

  // Token is usually in format "Bearer <token>"
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7, authHeader.length).trim()
    : authHeader;

  if (!token) {
    return res.status(401).json({ message: 'No authorization token, access denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Token is invalid or expired' });
  }
};
