import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma-client';
import { BadRequestError } from 'hostel-shared';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  const { name, email, password, gender, role, usn } = req.body;

  // Basic validation
  if (!name || !email || !password || !gender || !role) {
    throw new BadRequestError('name, email, password, gender, and role are required');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedRole = role.toUpperCase().trim();

  if (!['STUDENT', 'WARDEN', 'CHEF', 'ADMIN'].includes(normalizedRole)) {
    throw new BadRequestError('Invalid role specified');
  }

  if (!['male', 'female', 'other'].includes(gender)) {
    throw new BadRequestError('Invalid gender specified');
  }

  if (normalizedRole === 'STUDENT' && !usn) {
    throw new BadRequestError('USN is required for student registration');
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });
  if (existingUser) {
    throw new BadRequestError('Email already in use');
  }

  // Check if USN already exists (for students)
  if (usn) {
    const existingUsn = await prisma.user.findUnique({
      where: { usn: usn.toUpperCase().trim() }
    });
    if (existingUsn) {
      throw new BadRequestError('USN already registered');
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Find or create the Role in database
  let targetRole = await prisma.role.findUnique({
    where: { name: normalizedRole }
  });

  if (!targetRole) {
    targetRole = await prisma.role.create({
      data: {
        name: normalizedRole,
        description: `Default system role for ${normalizedRole}`
      }
    });
  }

  // Create user and link role in a transaction
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      gender,
      usn: usn ? usn.toUpperCase().trim() : null,
      accountStatus: 'active',
      roles: {
        create: {
          roleId: targetRole.id
        }
      }
    },
    include: {
      roles: {
        include: {
          role: true
        }
      }
    }
  });

  res.status(201).send({
    id: user.id,
    name: user.name,
    email: user.email,
    gender: user.gender,
    usn: user.usn,
    roles: user.roles.map((ur: any) => ur.role.name)
  });
});

export { router as registerRouter };
