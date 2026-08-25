import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { app } from '../../app';
import { prisma } from '../../prisma-client';

// Cast prisma to any to access mock function features
const prismaMock = prisma as any;

describe('Auth Service registration tests', () => {
  it('returns a 400 if validation fails (e.g. missing role/gender)', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Arjun',
        email: 'arjun@rnsit.edu',
        password: 'password123'
      })
      .expect(400);
  });

  it('returns a 400 if a student is missing their USN', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Arjun',
        email: 'arjun@rnsit.edu',
        password: 'password123',
        gender: 'male',
        role: 'student'
      })
      .expect(400);
  });

  it('returns a 400 if email is already registered', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'existing-id' });

    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Arjun',
        email: 'arjun@rnsit.edu',
        password: 'password123',
        gender: 'male',
        role: 'student',
        usn: '1RN24CS021'
      })
      .expect(400);
  });

  it('creates a user and returns a 201 on success', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null); // No existing email
    prismaMock.user.findUnique.mockResolvedValueOnce(null); // No existing USN
    prismaMock.role.findUnique.mockResolvedValueOnce({ id: 'role-id', name: 'STUDENT' });

    prismaMock.user.create.mockResolvedValueOnce({
      id: 'new-user-id',
      name: 'Arjun',
      email: 'arjun@rnsit.edu',
      gender: 'male',
      usn: '1RN24CS021',
      roles: [{ role: { name: 'STUDENT' } }]
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Arjun',
        email: 'arjun@rnsit.edu',
        password: 'password123',
        gender: 'male',
        role: 'student',
        usn: '1RN24CS021'
      })
      .expect(201);

    expect(response.body.email).toEqual('arjun@rnsit.edu');
    expect(response.body.roles).toContain('STUDENT');
  });
});

describe('Auth Service login tests', () => {
  it('returns 400 on missing credentials', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({
        email: 'arjun@rnsit.edu'
      })
      .expect(400);
  });

  it('returns 400 on invalid password', async () => {
    const hashedPassword = await bcrypt.hash('correct_password', 10);
    
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-id',
      name: 'Arjun',
      email: 'arjun@rnsit.edu',
      passwordHash: hashedPassword,
      gender: 'male',
      usn: '1RN24CS021',
      accountStatus: 'active',
      roles: [{ role: { name: 'STUDENT', permissions: [] } }]
    });

    await request(app)
      .post('/api/auth/login')
      .send({
        email: 'arjun@rnsit.edu',
        password: 'wrong_password'
      })
      .expect(400);
  });

  it('returns 200 and a JWT token on success', async () => {
    const hashedPassword = await bcrypt.hash('correct_password', 10);
    
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-id',
      name: 'Arjun',
      email: 'arjun@rnsit.edu',
      passwordHash: hashedPassword,
      gender: 'male',
      usn: '1RN24CS021',
      accountStatus: 'active',
      roles: [{ role: { name: 'STUDENT', permissions: [{ permission: { name: 'hostel:read' } }] } }]
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'arjun@rnsit.edu',
        password: 'correct_password'
      })
      .expect(200);

    expect(response.body.token).toBeDefined();
    
    const payload = jwt.decode(response.body.token) as any;
    expect(payload.roles).toContain('STUDENT');
    expect(payload.permissions).toContain('hostel:read');
  });
});
