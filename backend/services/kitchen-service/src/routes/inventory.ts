import express, { Request, Response } from 'express';
import { requireAuth, requirePermission, BadRequestError } from 'hostel-shared';
import { prisma } from '../prisma-client';

const router = express.Router();

// GET /api/kitchen/inventory?hostelId=<id>
router.get('/', requireAuth, requirePermission('inventory:read'), async (req: Request, res: Response) => {
  const { hostelId } = req.query;
  if (!hostelId || typeof hostelId !== 'string') {
    throw new BadRequestError('hostelId query parameter is required');
  }

  const items = await prisma.inventoryItem.findMany({
    where: { hostelId }
  });

  res.send(items);
});

// POST /api/kitchen/inventory/items
router.post('/items', requireAuth, requirePermission('inventory:create'), async (req: Request, res: Response) => {
  const { hostelId, itemName, unit, minThreshold } = req.body;

  if (!hostelId || !itemName || !unit) {
    throw new BadRequestError('hostelId, itemName, and unit are required');
  }

  const existingItem = await prisma.inventoryItem.findUnique({
    where: {
      hostelId_itemName: {
        hostelId,
        itemName: itemName.trim()
      }
    }
  });

  if (existingItem) {
    throw new BadRequestError('Inventory item already registered');
  }

  const item = await prisma.inventoryItem.create({
    data: {
      hostelId,
      itemName: itemName.trim(),
      unit,
      minThreshold: minThreshold || 0.00,
      quantity: 0.00
    }
  });

  res.status(201).send(item);
});

// POST /api/kitchen/inventory/transactions
router.post('/transactions', requireAuth, requirePermission('inventory:update'), async (req: Request, res: Response) => {
  const { inventoryItemId, type, quantity, notes } = req.body;

  if (!inventoryItemId || !type || !quantity) {
    throw new BadRequestError('inventoryItemId, type, and quantity are required');
  }

  if (!['IN', 'OUT'].includes(type)) {
    throw new BadRequestError('Invalid transaction type');
  }

  const numericQty = parseFloat(quantity);
  if (isNaN(numericQty) || numericQty <= 0) {
    throw new BadRequestError('Quantity must be a positive number');
  }

  // Find item
  const item = await prisma.inventoryItem.findUnique({
    where: { id: inventoryItemId }
  });

  if (!item) {
    throw new BadRequestError('Inventory item not found');
  }

  const currentQty = Number(item.quantity);
  let newQty = currentQty;

  if (type === 'IN') {
    newQty += numericQty;
  } else {
    if (currentQty < numericQty) {
      throw new BadRequestError(`Insufficient stock. Current: ${currentQty} ${item.unit}, Requested: ${numericQty} ${item.unit}`);
    }
    newQty -= numericQty;
  }

  // Save transaction and update quantity
  const [transaction] = await prisma.$transaction([
    prisma.inventoryTransaction.create({
      data: {
        inventoryItemId,
        type,
        quantity: numericQty,
        updatedBy: req.currentUser!.sub,
        notes
      }
    }),
    prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { quantity: newQty }
    })
  ]);

  res.status(201).send({
    transaction,
    newQuantity: newQty
  });
});

export { router as inventoryRouter };
