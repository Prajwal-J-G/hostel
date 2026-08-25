import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../app';
import { prisma } from '../../prisma-client';

const prismaMock = prisma as any;

const getAuthHeader = (
  userId: string = 'student-user-id',
  roles: string[] = ['student'],
  permissions: string[] = ['payment:pay']
) => {
  const token = jwt.sign(
    {
      sub: userId,
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

describe('Billing / Dues queries tests', () => {
  it('allows students to query their own dues', async () => {
    prismaMock.payment.findMany.mockResolvedValueOnce([
      { id: 'p1', studentId: 'student-user-id', amount: 5000, type: 'mess_fee', status: 'due' }
    ]);

    const response = await request(app)
      .get('/api/billing/payments/my-dues')
      .set('Authorization', getAuthHeader())
      .expect(200);

    expect(response.body.length).toBe(1);
    expect(response.body[0].type).toEqual('mess_fee');
  });

  it('blocks students from fetching all invoices in the system', async () => {
    await request(app)
      .get('/api/billing/payments/invoices')
      .set('Authorization', getAuthHeader())
      .expect(403);
  });
});

describe('Fee Payment and Ledger Verification tests', () => {
  it('allows student to submit a transaction ID for payment', async () => {
    prismaMock.payment.findUnique.mockResolvedValueOnce({
      id: 'p1',
      studentId: 'student-user-id',
      amount: 5000,
      status: 'due'
    });
    prismaMock.payment.findUnique.mockResolvedValueOnce(null); // Tx ID unique check
    prismaMock.payment.update.mockResolvedValueOnce({
      id: 'p1',
      transactionId: 'TX12345',
      status: 'due'
    });

    const response = await request(app)
      .post('/api/billing/payments/p1/pay')
      .set('Authorization', getAuthHeader('student-user-id'))
      .send({ transactionId: 'TX12345' })
      .expect(200);

    expect(response.body.transactionId).toEqual('TX12345');
  });

  it('allows admin to verify the transaction ID and mark it as paid', async () => {
    prismaMock.payment.findUnique.mockResolvedValueOnce({
      id: 'p1',
      transactionId: 'TX12345',
      status: 'due'
    });
    prismaMock.payment.update.mockResolvedValueOnce({
      id: 'p1',
      transactionId: 'TX12345',
      status: 'paid'
    });

    const response = await request(app)
      .post('/api/billing/payments/p1/verify')
      .set('Authorization', getAuthHeader('admin-id', ['admin'], ['payment:verify']))
      .expect(200);

    expect(response.body.status).toEqual('paid');
  });
});
