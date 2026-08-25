import { prisma } from '../prisma-client';

// Mock the prisma client
jest.mock('../prisma-client', () => ({
  prisma: {
    studentRequest: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    roomAllocation: {
      findUnique: jest.fn(),
      create: jest.fn()
    },
    room: {
      findFirst: jest.fn()
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
