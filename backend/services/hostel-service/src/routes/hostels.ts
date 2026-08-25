import express, { Request, Response } from 'express';
import { requireAuth, requirePermission, BadRequestError, NotFoundError } from 'hostel-shared';
import { prisma } from '../prisma-client';

const router = express.Router();

// GET /api/hostels
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const hostels = await prisma.hostel.findMany({
    include: { rooms: true, warden: { select: { id: true, name: true, email: true } } }
  });
  res.send(hostels);
});

// GET /api/hostels/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const hostel = await prisma.hostel.findUnique({
    where: { id: req.params.id },
    include: { rooms: true, warden: { select: { id: true, name: true, email: true } } }
  });

  if (!hostel) {
    throw new NotFoundError();
  }
  res.send(hostel);
});

// POST /api/hostels
router.post('/', requireAuth, requirePermission('hostel:create'), async (req: Request, res: Response) => {
  const { name, address, wardenId } = req.body;

  if (!name || !address) {
    throw new BadRequestError('name and address are required');
  }

  const existingHostel = await prisma.hostel.findUnique({
    where: { name: name.trim() }
  });
  if (existingHostel) {
    throw new BadRequestError('Hostel with this name already exists');
  }

  // Verify warden exists if provided
  if (wardenId) {
    const warden = await prisma.user.findUnique({ where: { id: wardenId } });
    if (!warden) {
      throw new BadRequestError('Warden user not found');
    }
  }

  const hostel = await prisma.hostel.create({
    data: {
      name: name.trim(),
      address: address.trim(),
      wardenId: wardenId || null
    }
  });

  res.status(201).send(hostel);
});

// PUT /api/hostels/:id
router.put('/:id', requireAuth, requirePermission('hostel:update'), async (req: Request, res: Response) => {
  const { name, address, wardenId } = req.body;

  const hostel = await prisma.hostel.findUnique({
    where: { id: req.params.id }
  });
  if (!hostel) {
    throw new NotFoundError();
  }

  if (name) {
    const existing = await prisma.hostel.findUnique({ where: { name: name.trim() } });
    if (existing && existing.id !== hostel.id) {
      throw new BadRequestError('Hostel with this name already exists');
    }
  }

  if (wardenId) {
    const warden = await prisma.user.findUnique({ where: { id: wardenId } });
    if (!warden) {
      throw new BadRequestError('Warden user not found');
    }
  }

  const updatedHostel = await prisma.hostel.update({
    where: { id: req.params.id },
    data: {
      name: name ? name.trim() : undefined,
      address: address ? address.trim() : undefined,
      wardenId: wardenId !== undefined ? wardenId : undefined
    }
  });

  res.send(updatedHostel);
});

// DELETE /api/hostels/:id
router.delete('/:id', requireAuth, requirePermission('hostel:delete'), async (req: Request, res: Response) => {
  const hostel = await prisma.hostel.findUnique({
    where: { id: req.params.id }
  });
  if (!hostel) {
    throw new NotFoundError();
  }

  await prisma.hostel.delete({
    where: { id: req.params.id }
  });

  res.send({ message: 'Hostel deleted successfully' });
});

export { router as hostelsRouter };
