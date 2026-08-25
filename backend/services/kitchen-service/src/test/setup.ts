import { prisma } from '../prisma-client';

// Mock the prisma client
jest.mock('../prisma-client', () => ({
  prisma: {
    weeklyMenu: {
      findUnique: jest.fn(),
      create: jest.fn()
    },
    dailyMenu: {
      upsert: jest.fn()
    },
    inventoryItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    inventoryTransaction: {
      create: jest.fn()
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
    $connect: jest.fn(),
    $disconnect: jest.fn()
  }
}));

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});
