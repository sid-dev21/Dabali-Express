"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
// Require role middleware
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        // 1. Check if the user is authenticated (should be via authMiddleware)
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Non authentifié.',
            });
            return;
        }
        // 2. Check the role
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: 'Accès refusé. Permissions insuffisantes.',
            });
            return;
        }
        // 3. Role authorized, continue    
        next();
    };
};
exports.requireRole = requireRole;
