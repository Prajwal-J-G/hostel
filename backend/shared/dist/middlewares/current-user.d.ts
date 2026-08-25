import { Request, Response, NextFunction } from 'express';
export interface UserPayload {
    sub: string;
    name: string;
    email: string;
    usn?: string;
    gender: 'male' | 'female' | 'other';
    roles: string[];
    permissions: string[];
}
declare global {
    namespace Express {
        interface Request {
            currentUser?: UserPayload;
        }
    }
}
export declare const currentUser: (req: Request, res: Response, next: NextFunction) => void;
