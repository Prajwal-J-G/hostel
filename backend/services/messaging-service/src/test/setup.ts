import { prisma } from '../prisma-client';

// Mock the prisma client
jest.mock('../prisma-client', () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      create: jest.fn()
    },
    privateMessage: {
      findMany: jest.fn(),
      create: jest.fn()
    },
    user: {
      findUnique: jest.fn()
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
