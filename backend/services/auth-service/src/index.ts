import { app } from './app';
import { prisma } from './prisma-client';

const start = async () => {
  console.log('Starting Auth Service...');

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be defined');
  }

  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL via Prisma');
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err);
    process.exit(1);
  }

  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`🔥 Auth Service listening on port ${PORT}`);
  });
};

start();
