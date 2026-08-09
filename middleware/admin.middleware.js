/**
 * middleware/admin.middleware.js
 * Enforces admin access restriction based on hardcoded admin email
 */

const ADMIN_EMAIL = 'akashkumar60907@gmail.com';

function requireAdmin(req, res, next) {
  const userEmail = req.session?.user?.email;

  if (!userEmail || userEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({
      error: 'Access denied. Admin privileges required.',
      code: 'ADMIN_ACCESS_DENIED',
    });
  }

  next();
}

module.exports = { requireAdmin, ADMIN_EMAIL };
