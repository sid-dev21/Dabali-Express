"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    // if headers already sent, return the error to the user
    if (res.headersSent) {
        return next(err);
    }
    // Determine the status code
    const statusCode = err.statusCode || 500;
    // Send the error response
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Erreur serveur interne.',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
/**
 * Middleware pour gérer les routes non trouvées (404)
 */
const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route non trouvée : ${req.method} ${req.originalUrl}`,
    });
};
exports.notFound = notFound;
