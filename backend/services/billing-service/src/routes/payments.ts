import express, { Request, Response } from 'express';
import { requireAuth, requirePermission, BadRequestError, NotFoundError } from 'hostel-shared';
import { prisma } from '../prisma-client';

const router = express.Router();

// 1. Get student's own dues
router.get('/my-dues', requireAuth, async (req: Request, res: Response) => {
  const payments = await prisma.payment.findMany({
    where: { studentId: req.currentUser!.sub }
  });
  res.send(payments);
});

// 2. Get all invoices (Admin/Staff)
router.get('/invoices', requireAuth, requirePermission('payment:read'), async (req: Request, res: Response) => {
  const payments = await prisma.payment.findMany({
    include: { student: { select: { id: true, name: true, email: true, usn: true } } }
  });
  res.send(payments);
});

// 3. Admin manually creates a fee invoice
router.post('/invoice', requireAuth, requirePermission('payment:create'), async (req: Request, res: Response) => {
  const { studentId, amount, type, dueDate } = req.body;

  if (!studentId || !amount || !type || !dueDate) {
    throw new BadRequestError('studentId, amount, type, and dueDate are required');
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new BadRequestError('Amount must be a positive number');
  }

  if (!['hostel_fee', 'mess_fee', 'security_deposit', 'other'].includes(type)) {
    throw new BadRequestError('Invalid payment type');
  }

  const payment = await prisma.payment.create({
    data: {
      studentId,
      amount: numericAmount,
      type,
      status: 'due',
      dueDate: new Date(dueDate)
    }
  });

  res.status(201).send(payment);
});

// 4. Student records payment (Submits transaction ID)
router.post('/:id/pay', requireAuth, requirePermission('payment:pay'), async (req: Request, res: Response) => {
  const { transactionId } = req.body;

  if (!transactionId) {
    throw new BadRequestError('transactionId is required');
  }

  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id }
  });

  if (!payment) {
    throw new NotFoundError();
  }

  if (payment.studentId !== req.currentUser!.sub) {
    throw new BadRequestError('You can only pay for your own invoices');
  }

  if (payment.status === 'paid') {
    throw new BadRequestError('Invoice already marked as paid');
  }

  // Check if transaction ID is already used
  const existingTx = await prisma.payment.findUnique({
    where: { transactionId: transactionId.trim() }
  });
  if (existingTx && existingTx.id !== payment.id) {
    throw new BadRequestError('Transaction ID already registered');
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: req.params.id },
    data: {
      transactionId: transactionId.trim(),
      paymentDate: new Date()
    }
  });

  res.send(updatedPayment);
});

// 5. Admin verifies transaction (Mark as paid)
router.post('/:id/verify', requireAuth, requirePermission('payment:verify'), async (req: Request, res: Response) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id }
  });

  if (!payment) {
    throw new NotFoundError();
  }

  if (!payment.transactionId) {
    throw new BadRequestError('Payment cannot be verified without a transaction ID');
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: req.params.id },
    data: {
      status: 'paid'
    }
  });

  res.send(updatedPayment);
});

export { router as paymentsRouter };
