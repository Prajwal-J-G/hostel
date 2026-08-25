import express, { Request, Response } from 'express';
import { requireAuth, requirePermission, BadRequestError, NotFoundError } from 'hostel-shared';
import { prisma } from '../prisma-client';

const router = express.Router();

// 1. Get notifications targeting user block or gender
router.get('/notifications', requireAuth, async (req: Request, res: Response) => {
  const gender = req.currentUser!.gender;

  const notifications = await prisma.notification.findMany({
    where: {
      OR: [
        { genderTarget: 'all' },
        { genderTarget: gender }
      ]
    },
    include: { author: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  });

  res.send(notifications);
});

// 2. Broadcast announcement (Admin/Warden)
router.post('/notifications', requireAuth, requirePermission('broadcast:create'), async (req: Request, res: Response) => {
  const { title, content, genderTarget, targetHostelId } = req.body;

  if (!title || !content) {
    throw new BadRequestError('title and content are required');
  }

  const notification = await prisma.notification.create({
    data: {
      authorId: req.currentUser!.sub,
      title: title.trim(),
      content: content.trim(),
      genderTarget: genderTarget || 'all',
      targetHostelId: targetHostelId || null
    }
  });

  res.status(201).send(notification);
});

// 3. Send private peer-to-peer message
router.post('/send', requireAuth, requirePermission('message:send'), async (req: Request, res: Response) => {
  const { recipientId, subject, body } = req.body;

  if (!recipientId || !body) {
    throw new BadRequestError('recipientId and body are required');
  }

  // Verify recipient exists
  const recipient = await prisma.user.findUnique({
    where: { id: recipientId }
  });
  if (!recipient) {
    throw new BadRequestError('Recipient user not found');
  }

  const message = await prisma.privateMessage.create({
    data: {
      senderId: req.currentUser!.sub,
      recipientId,
      subject: subject || 'General Notice',
      body,
      status: 'sent'
    }
  });

  res.status(201).send(message);
});

// 4. Retrieve conversation thread
router.get('/chat/:userId', requireAuth, requirePermission('message:read'), async (req: Request, res: Response) => {
  const currentUserId = req.currentUser!.sub;
  const otherUserId = req.params.userId;

  const chat = await prisma.privateMessage.findMany({
    where: {
      OR: [
        { senderId: currentUserId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: currentUserId }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });

  res.send(chat);
});

export { router as communicationsRouter };
