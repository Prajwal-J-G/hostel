import express, { Request, Response } from 'express';
import { requireAuth, requirePermission, BadRequestError, NotFoundError } from 'hostel-shared';
import { prisma } from '../prisma-client';

const router = express.Router();

// 1. Submit Request (Student)
router.post('/requests', requireAuth, requirePermission('allocation:request'), async (req: Request, res: Response) => {
  const { hostelId, roomType, notes } = req.body;

  if (!hostelId || !roomType) {
    throw new BadRequestError('hostelId and roomType are required');
  }

  if (!['single', 'double', 'triple', 'dormitory'].includes(roomType)) {
    throw new BadRequestError('Invalid roomType specified');
  }

  // Verify student is not already allocated a room
  const existingAllocation = await prisma.roomAllocation.findUnique({
    where: { studentId: req.currentUser!.sub }
  });
  if (existingAllocation) {
    throw new BadRequestError('Student already allocated to a room');
  }

  // Check for any pending requests
  const pendingRequest = await prisma.studentRequest.findFirst({
    where: {
      studentId: req.currentUser!.sub,
      status: { in: ['pending', 'verified', 'forwarded'] }
    }
  });
  if (pendingRequest) {
    throw new BadRequestError('Student already has a pending room application');
  }

  const request = await prisma.studentRequest.create({
    data: {
      studentId: req.currentUser!.sub,
      hostelId,
      roomType,
      notes,
      status: 'pending'
    }
  });

  res.status(201).send(request);
});

// 2. Fetch Requests
router.get('/requests', requireAuth, async (req: Request, res: Response) => {
  const roles = req.currentUser!.roles;

  if (roles.includes('ADMIN') || roles.includes('WARDEN')) {
    // Admins and Wardens view all requests
    const requests = await prisma.studentRequest.findMany({
      include: {
        student: { select: { id: true, name: true, email: true, usn: true } },
        hostel: { select: { id: true, name: true } }
      }
    });
    return res.send(requests);
  }

  // Students can only view their own requests
  const requests = await prisma.studentRequest.findMany({
    where: { studentId: req.currentUser!.sub },
    include: { hostel: { select: { id: true, name: true } } }
  });
  res.send(requests);
});

// 3. Admin Forwards Request (Admin)
router.post('/requests/:id/forward', requireAuth, requirePermission('allocation:forward'), async (req: Request, res: Response) => {
  const request = await prisma.studentRequest.findUnique({
    where: { id: req.params.id }
  });

  if (!request) {
    throw new NotFoundError();
  }

  if (request.status !== 'pending') {
    throw new BadRequestError('Only pending requests can be forwarded');
  }

  const updatedRequest = await prisma.studentRequest.update({
    where: { id: req.params.id },
    data: {
      status: 'forwarded',
      forwardedByAdmin: true
    }
  });

  res.send(updatedRequest);
});

// 4. Warden Approves Request and Assigns Room (Warden)
router.post('/requests/:id/approve', requireAuth, requirePermission('allocation:approve'), async (req: Request, res: Response) => {
  const request = await prisma.studentRequest.findUnique({
    where: { id: req.params.id }
  });

  if (!request) {
    throw new NotFoundError();
  }

  if (request.status !== 'forwarded' && !request.forwardedByAdmin) {
    throw new BadRequestError('Request must be forwarded by admin before warden approval');
  }

  // Match room type to capacity
  const capacityMap: { [key: string]: number } = {
    single: 1,
    double: 2,
    triple: 3,
    dormitory: 4
  };
  const targetCapacity = capacityMap[request.roomType] || 2;

  // Find an available room matching targetCapacity in the requested hostel
  const availableRoom = await prisma.room.findFirst({
    where: {
      hostelId: request.hostelId,
      capacity: targetCapacity,
      filled: { lt: targetCapacity }
    }
  });

  if (!availableRoom) {
    throw new BadRequestError('No available rooms matching the criteria in this hostel');
  }

  // Create allocation & update request in transaction
  const [allocation, updatedRequest] = await prisma.$transaction([
    prisma.roomAllocation.create({
      data: {
        roomId: availableRoom.id,
        studentId: request.studentId
      }
    }),
    prisma.studentRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'approved'
      }
    })
  ]);

  res.send({
    message: 'Request approved and room allocated successfully',
    allocation,
    request: updatedRequest,
    roomNumber: availableRoom.roomNumber
  });
});

// 5. Warden Rejects Request (Warden)
router.post('/requests/:id/reject', requireAuth, requirePermission('allocation:approve'), async (req: Request, res: Response) => {
  const request = await prisma.studentRequest.findUnique({
    where: { id: req.params.id }
  });

  if (!request) {
    throw new NotFoundError();
  }

  const updatedRequest = await prisma.studentRequest.update({
    where: { id: req.params.id },
    data: {
      status: 'rejected'
    }
  });

  res.send(updatedRequest);
});

export { router as allocationsRouter };
