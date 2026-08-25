import express, { Request, Response } from 'express';
import { requireAuth, requirePermission, BadRequestError, NotFoundError } from 'hostel-shared';
import { prisma } from '../prisma-client';

const router = express.Router();

// GET /api/rooms
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { hostelId } = req.query;
  const filter = hostelId ? { hostelId: hostelId as string } : {};

  const rooms = await prisma.room.findMany({
    where: filter,
    include: { hostel: { select: { id: true, name: true } } }
  });
  res.send(rooms);
});

// GET /api/rooms/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const room = await prisma.room.findUnique({
    where: { id: req.params.id },
    include: { hostel: true, allocations: { include: { student: { select: { id: true, name: true, usn: true } } } } }
  });

  if (!room) {
    throw new NotFoundError();
  }
  res.send(room);
});

// POST /api/rooms
router.post('/', requireAuth, requirePermission('room:create'), async (req: Request, res: Response) => {
  const { hostelId, roomNumber, capacity } = req.body;

  if (!hostelId || !roomNumber || !capacity) {
    throw new BadRequestError('hostelId, roomNumber, and capacity are required');
  }

  const numericCapacity = parseInt(capacity);
  if (isNaN(numericCapacity) || numericCapacity <= 0) {
    throw new BadRequestError('Capacity must be a positive integer');
  }

  // Verify hostel exists
  const hostel = await prisma.hostel.findUnique({ where: { id: hostelId } });
  if (!hostel) {
    throw new BadRequestError('Hostel not found');
  }

  const existingRoom = await prisma.room.findUnique({
    where: {
      hostelId_roomNumber: {
        hostelId,
        roomNumber: roomNumber.trim()
      }
    }
  });

  if (existingRoom) {
    throw new BadRequestError('Room with this number already exists in this hostel');
  }

  const room = await prisma.room.create({
    data: {
      hostelId,
      roomNumber: roomNumber.trim(),
      capacity: numericCapacity,
      filled: 0
    }
  });

  res.status(201).send(room);
});

// PUT /api/rooms/:id
router.put('/:id', requireAuth, requirePermission('room:update'), async (req: Request, res: Response) => {
  const { roomNumber, capacity } = req.body;

  const room = await prisma.room.findUnique({
    where: { id: req.params.id }
  });

  if (!room) {
    throw new NotFoundError();
  }

  let numericCapacity = room.capacity;
  if (capacity !== undefined) {
    numericCapacity = parseInt(capacity);
    if (isNaN(numericCapacity) || numericCapacity <= 0) {
      throw new BadRequestError('Capacity must be a positive integer');
    }
    if (numericCapacity < room.filled) {
      throw new BadRequestError('Capacity cannot be less than currently occupied beds');
    }
  }

  if (roomNumber) {
    const existing = await prisma.room.findUnique({
      where: {
        hostelId_roomNumber: {
          hostelId: room.hostelId,
          roomNumber: roomNumber.trim()
        }
      }
    });
    if (existing && existing.id !== room.id) {
      throw new BadRequestError('Another room with this number already exists in this hostel');
    }
  }

  const updatedRoom = await prisma.room.update({
    where: { id: req.params.id },
    data: {
      roomNumber: roomNumber ? roomNumber.trim() : undefined,
      capacity: numericCapacity
    }
  });

  res.send(updatedRoom);
});

// DELETE /api/rooms/:id
router.delete('/:id', requireAuth, requirePermission('room:delete'), async (req: Request, res: Response) => {
  const room = await prisma.room.findUnique({
    where: { id: req.params.id }
  });

  if (!room) {
    throw new NotFoundError();
  }

  if (room.filled > 0) {
    throw new BadRequestError('Cannot delete room because it is currently occupied');
  }

  await prisma.room.delete({
    where: { id: req.params.id }
  });

  res.send({ message: 'Room deleted successfully' });
});

export { router as roomsRouter };
