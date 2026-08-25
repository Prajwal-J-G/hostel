import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../app';
import { prisma } from '../../prisma-client';

const prismaMock = prisma as any;

const getAuthHeader = (roles: string[] = ['student'], permissions: string[] = ['allocation:request']) => {
  const token = jwt.sign(
    {
      sub: 'student-user-id',
      name: 'Student Name',
      email: 'student@rnsit.edu',
      gender: 'male',
      roles,
      permissions
    },
    process.env.JWT_SECRET || 'testsecret'
  );
  return `Bearer ${token}`;
};

describe('Student Housing Request tests', () => {
  it('returns a 403 when a non-student role tries to submit a request', async () => {
    await request(app)
      .post('/api/allocations/requests')
      .set('Authorization', getAuthHeader(['warden'], ['allocation:approve']))
      .send({ hostelId: 'hostel-id', roomType: 'double' })
      .expect(403);
  });

  it('allows students to submit requests when eligible', async () => {
    prismaMock.roomAllocation.findUnique.mockResolvedValueOnce(null); // Not allocated
    prismaMock.studentRequest.findFirst.mockResolvedValueOnce(null); // No pending requests
    prismaMock.studentRequest.create.mockResolvedValueOnce({
      id: 'req-id',
      studentId: 'student-user-id',
      hostelId: 'hostel-id',
      roomType: 'double',
      status: 'pending'
    });

    const response = await request(app)
      .post('/api/allocations/requests')
      .set('Authorization', getAuthHeader())
      .send({ hostelId: 'hostel-id', roomType: 'double' })
      .expect(201);

    expect(response.body.id).toEqual('req-id');
    expect(response.body.status).toEqual('pending');
  });

  it('blocks request if student already has a pending application', async () => {
    prismaMock.roomAllocation.findUnique.mockResolvedValueOnce(null); // Not allocated
    prismaMock.studentRequest.findFirst.mockResolvedValueOnce({ id: 'pending-req' }); // Has pending!

    await request(app)
      .post('/api/allocations/requests')
      .set('Authorization', getAuthHeader())
      .send({ hostelId: 'hostel-id', roomType: 'double' })
      .expect(400);
  });
});

describe('Allocation Pipeline & Approvals tests', () => {
  it('allows admin to forward a pending request', async () => {
    prismaMock.studentRequest.findUnique.mockResolvedValueOnce({
      id: 'req-id',
      status: 'pending'
    });
    prismaMock.studentRequest.update.mockResolvedValueOnce({
      id: 'req-id',
      status: 'forwarded',
      forwardedByAdmin: true
    });

    const response = await request(app)
      .post('/api/allocations/requests/req-id/forward')
      .set('Authorization', getAuthHeader(['admin'], ['allocation:forward']))
      .expect(200);

    expect(response.body.status).toEqual('forwarded');
  });

  it('allows warden to approve a forwarded request and assigns a room', async () => {
    prismaMock.studentRequest.findUnique.mockResolvedValueOnce({
      id: 'req-id',
      studentId: 'student-user-id',
      hostelId: 'hostel-id',
      roomType: 'double',
      forwardedByAdmin: true,
      status: 'forwarded'
    });

    prismaMock.room.findFirst.mockResolvedValueOnce({
      id: 'room-101',
      roomNumber: '101',
      capacity: 2,
      filled: 0
    });

    prismaMock.roomAllocation.create.mockResolvedValueOnce({
      id: 'allocation-id',
      roomId: 'room-101',
      studentId: 'student-user-id'
    });

    prismaMock.studentRequest.update.mockResolvedValueOnce({
      id: 'req-id',
      status: 'approved'
    });

    const response = await request(app)
      .post('/api/allocations/requests/req-id/approve')
      .set('Authorization', getAuthHeader(['warden'], ['allocation:approve']))
      .expect(200);

    expect(response.body.roomNumber).toEqual('101');
    expect(response.body.request.status).toEqual('approved');
  });
});
