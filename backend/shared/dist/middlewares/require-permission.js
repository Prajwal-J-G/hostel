"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = void 0;
const forbidden_error_1 = require("../errors/forbidden-error");
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.currentUser) {
            throw new forbidden_error_1.ForbiddenError('Not authorized');
        }
        if (!req.currentUser.permissions.includes(permission)) {
            throw new forbidden_error_1.ForbiddenError(`Access denied: missing permission '${permission}'`);
        }
        next();
    };
};
exports.requirePermission = requirePermission;
