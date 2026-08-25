import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../app';
import { prisma } from '../../prisma-client';

const prismaMock = prisma as any;

const getAuthHeader = (roles: string[] = ['student'], permissions: string[] = ['menu:read']) => {
  const token = jwt.sign(
    {
      sub: 'test-user-id',
      name: 'Chef Arjun',
      email: 'arjun@rnsit.edu',
      gender: 'male',
      roles,
      permissions
    },
    process.env.JWT_SECRET || 'testsecret'
  );
  return `Bearer ${token}`;
};

describe('Kitchen & Menu endpoints tests', () => {
  it('returns a 401 if request is unauthenticated', async () => {
    await request(app)
      .get('/api/kitchen/menu?hostelId=hostel-id')
      .expect(401);
  });

  it('allows anyone authenticated to get the weekly menu', async () => {
    prismaMock.weeklyMenu.findUnique.mockResolvedValueOnce({
      id: 'menu-id',
      hostelId: 'hostel-id',
      dailyMenus: [{ dayOfWeek: 'monday', breakfast: 'Idli', lunch: 'Rice', dinner: 'Roti' }]
    });

    const response = await request(app)
      .get('/api/kitchen/menu?hostelId=hostel-id')
      .set('Authorization', getAuthHeader())
      .expect(200);

    expect(response.body.id).toEqual('menu-id');
  });

  it('returns a 403 if student tries to update the weekly menu', async () => {
    await request(app)
      .put('/api/kitchen/menu')
      .set('Authorization', getAuthHeader(['student'], ['menu:read']))
      .send({ hostelId: 'hostel-id', monday: { breakfast: 'Dosa' } })
      .expect(403);
  });

  it('allows warden or chef to update the weekly menu', async () => {
    prismaMock.weeklyMenu.findUnique.mockResolvedValueOnce({ id: 'menu-id', hostelId: 'hostel-id' });
    prismaMock.dailyMenu.upsert.mockResolvedValue({});
    
    prismaMock.weeklyMenu.findUnique.mockResolvedValueOnce({
      id: 'menu-id',
      hostelId: 'hostel-id',
      dailyMenus: [{ dayOfWeek: 'monday', breakfast: 'Dosa' }]
    });

    const response = await request(app)
      .put('/api/kitchen/menu')
      .set('Authorization', getAuthHeader(['chef'], ['menu:update']))
      .send({
        hostelId: 'hostel-id',
        monday: { breakfast: 'Dosa', lunch: 'Rice', dinner: 'Roti' }
      })
      .expect(200);

    expect(response.body.dailyMenus[0].breakfast).toEqual('Dosa');
  });
});

describe('Kitchen Inventory endpoints tests', () => {
  it('returns a 403 if student tries to get inventory', async () => {
    await request(app)
      .get('/api/kitchen/inventory?hostelId=hostel-id')
      .set('Authorization', getAuthHeader(['student'], ['menu:read']))
      .expect(403);
  });

  it('allows chefs to get inventory lists', async () => {
    prismaMock.inventoryItem.findMany.mockResolvedValueOnce([
      { id: 'item-1', itemName: 'Rice', quantity: 100 }
    ]);

    const response = await request(app)
      .get('/api/kitchen/inventory?hostelId=hostel-id')
      .set('Authorization', getAuthHeader(['chef'], ['inventory:read']))
      .expect(200);

    expect(response.body[0].itemName).toEqual('Rice');
  });

  it('allows chefs to add inventory transactions', async () => {
    // Current quantity = 100
    prismaMock.inventoryItem.findUnique.mockResolvedValueOnce({
      id: 'item-1',
      itemName: 'Rice',
      quantity: 100,
      unit: 'kg'
    });

    // Mock Prisma transaction creates transaction record and updates inventory item
    prismaMock.inventoryTransaction.create.mockResolvedValueOnce({
      id: 'tx-1',
      type: 'IN',
      quantity: 50
    });
    prismaMock.inventoryItem.update.mockResolvedValueOnce({
      id: 'item-1',
      quantity: 150
    });

    const response = await request(app)
      .post('/api/kitchen/inventory/transactions')
      .set('Authorization', getAuthHeader(['chef'], ['inventory:update']))
      .send({
        inventoryItemId: 'item-1',
        type: 'IN',
        quantity: 50
      })
      .expect(201);

    expect(response.body.newQuantity).toEqual(150);
  });

  it('rejects OUT transactions if stock is insufficient', async () => {
    prismaMock.inventoryItem.findUnique.mockResolvedValueOnce({
      id: 'item-1',
      itemName: 'Rice',
      quantity: 10, // Only 10kg
      unit: 'kg'
    });

    await request(app)
      .post('/api/kitchen/inventory/transactions')
      .set('Authorization', getAuthHeader(['chef'], ['inventory:update']))
      .send({
        inventoryItemId: 'item-1',
        type: 'OUT',
        quantity: 20 // Trying to consume 20kg
      })
      .expect(400);
  });
});
