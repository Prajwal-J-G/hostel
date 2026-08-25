import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma-client';
import { BadRequestError } from 'hostel-shared';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError('Email and password are required');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Find user and nested roles/permissions
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!user) {
    throw new BadRequestError('Invalid credentials');
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new BadRequestError('Invalid credentials');
  }

  if (user.accountStatus !== 'active') {
    throw new BadRequestError('Account is not active');
  }

  // Extract roles and permissions
  const roles = user.roles.map((ur: any) => ur.role.name);
  const permissions = user.roles.flatMap((ur: any) =>
    ur.role.permissions.map((rp: any) => rp.permission.name)
  );

  // Sign JWT
  const userJwt = jwt.sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
      usn: user.usn,
      gender: user.gender,
      roles,
      permissions
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '24h' }
  );

  res.status(200).send({
    token: userJwt,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      gender: user.gender,
      usn: user.usn,
      roles
    }
  });
});

export { router as loginRouter };
