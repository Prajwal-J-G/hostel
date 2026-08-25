import { prisma } from '../prisma-client';

// Mock the prisma client
jest.mock('../prisma-client', () => ({
  prisma: {
    payment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
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
