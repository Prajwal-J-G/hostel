import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../app';
import { prisma } from '../../prisma-client';

const prismaMock = prisma as any;

const getAuthHeader = (roles: string[] = ['student'], permissions: string[] = ['hostel:read']) => {
  const token = jwt.sign(
    {
      sub: 'test-user-id',
      name: 'User Name',
      email: 'user@rnsit.edu',
      gender: 'male',
      roles,
      permissions
    },
    process.env.JWT_SECRET || 'testsecret'
  );
  return `Bearer ${token}`;
};

describe('Hostel CRUD tests', () => {
  it('returns a 403 when a student tries to create a hostel', async () => {
    await request(app)
      .post('/api/hostels')
      .set('Authorization', getAuthHeader(['student'], ['hostel:read']))
      .send({ name: 'Boys Hostel A', address: 'Bangalore' })
      .expect(403);
  });

  it('allows admins to create hostels and returns a 201 on success', async () => {
    prismaMock.hostel.findUnique.mockResolvedValueOnce(null); // No duplicates
    prismaMock.hostel.create.mockResolvedValueOnce({
      id: 'hostel-id',
      name: 'Boys Hostel A',
      address: 'Bangalore',
      wardenId: null
    });

    const response = await request(app)
      .post('/api/hostels')
      .set('Authorization', getAuthHeader(['admin'], ['hostel:create']))
      .send({ name: 'Boys Hostel A', address: 'Bangalore' })
      .expect(201);

    expect(response.body.id).toEqual('hostel-id');
  });

  it('allows listing hostels for authenticated users', async () => {
    prismaMock.hostel.findMany.mockResolvedValueOnce([
      { id: 'h1', name: 'Boys A', address: 'BLR' }
    ]);

    const response = await request(app)
      .get('/api/hostels')
      .set('Authorization', getAuthHeader())
      .expect(200);

    expect(response.body.length).toBe(1);
    expect(response.body[0].name).toEqual('Boys A');
  });
});

describe('Room CRUD tests', () => {
  it('allows warden to create a room inside their hostel', async () => {
    prismaMock.hostel.findUnique.mockResolvedValueOnce({ id: 'hostel-id' }); // Hostel exists
    prismaMock.room.findUnique.mockResolvedValueOnce(null); // Room is unique
    prismaMock.room.create.mockResolvedValueOnce({
      id: 'room-id',
      hostelId: 'hostel-id',
      roomNumber: '101',
      capacity: 3,
      filled: 0
    });

    const response = await request(app)
      .post('/api/rooms')
      .set('Authorization', getAuthHeader(['warden'], ['room:create']))
      .send({ hostelId: 'hostel-id', roomNumber: '101', capacity: 3 })
      .expect(201);

    expect(response.body.id).toEqual('room-id');
    expect(response.body.roomNumber).toEqual('101');
  });

  it('blocks room deletion if it has student allocations (filled > 0)', async () => {
    prismaMock.room.findUnique.mockResolvedValueOnce({
      id: 'room-id',
      hostelId: 'hostel-id',
      roomNumber: '101',
      capacity: 3,
      filled: 1 // Occupied!
    });

    await request(app)
      .delete('/api/rooms/room-id')
      .set('Authorization', getAuthHeader(['warden'], ['room:delete']))
      .expect(400);
  });
});
