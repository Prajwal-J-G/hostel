import { prisma } from '../prisma-client';

// Mock the prisma client
jest.mock('../prisma-client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn()
    },
    role: {
      findUnique: jest.fn(),
      create: jest.fn()
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
