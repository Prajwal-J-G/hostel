import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/forbidden-error';

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      throw new ForbiddenError('Not authorized');
    }

    if (!req.currentUser.permissions.includes(permission)) {
      throw new ForbiddenError(`Access denied: missing permission '${permission}'`);
    }

    next();
  };
};
