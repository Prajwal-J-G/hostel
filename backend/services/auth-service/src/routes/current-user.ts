import express, { Request, Response } from 'express';
import { requireAuth } from 'hostel-shared';

const router = express.Router();

router.get('/', requireAuth, (req: Request, res: Response) => {
  res.send({ currentUser: req.currentUser || null });
});

export { router as currentUserRouter };
