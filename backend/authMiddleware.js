/* ═══════════════════════════════════════════════════════════════
   Auth Middleware — Token Verification & Role Checks
   ═══════════════════════════════════════════════════════════════ */
const auth = require('./auth');

// ─── Require Authentication ─────────────────────────────────
// Checks JWT from cookie (preferred) or Authorization header.
// Attaches decoded user to req.user on success.
function requireAuth(req, res, next) {
    // Try cookie first, then Authorization header
    let token = req.cookies && req.cookies.z1cis_token;

    if (!token && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            token = parts[1];
        }
    }

    if (!token) {
        // For HTML page requests, redirect to login
        if (req.accepts('html') && !req.path.startsWith('/api/')) {
            return res.redirect('/login.html');
        }
        return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = auth.verifyToken(token);
    if (!decoded) {
        // Token is invalid or expired
        if (req.accepts('html') && !req.path.startsWith('/api/')) {
            res.clearCookie('z1cis_token');
            return res.redirect('/login.html');
        }
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
}

// ─── Require Specific Role ──────────────────────────────────
// Must be used AFTER requireAuth
function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (req.user.role !== role) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: role,
                current: req.user.role
            });
        }
        next();
    };
}

// ─── Require Admin Role ─────────────────────────────────────
// Must be used AFTER requireAuth
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

module.exports = { requireAuth, requireRole, requireAdmin };
