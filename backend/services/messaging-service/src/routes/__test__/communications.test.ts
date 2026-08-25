import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../app';
import { prisma } from '../../prisma-client';

const prismaMock = prisma as any;

const getAuthHeader = (
  userId: string = 'user-1',
  roles: string[] = ['student'],
  permissions: string[] = ['message:send', 'message:read']
) => {
  const token = jwt.sign(
    {
      sub: userId,
      name: 'Test User',
      email: 'test@rnsit.edu',
      gender: 'male',
      roles,
      permissions
    },
    process.env.JWT_SECRET || 'testsecret'
  );
  return `Bearer ${token}`;
};

describe('Broadcast Notification tests', () => {
  it('allows students to query notifications targeting their gender or all', async () => {
    prismaMock.notification.findMany.mockResolvedValueOnce([
      { id: 'notif-1', title: 'Mess Announcement', content: 'Holiday meal timings' }
    ]);

    const response = await request(app)
      .get('/api/messages/notifications')
      .set('Authorization', getAuthHeader())
      .expect(200);

    expect(response.body.length).toBe(1);
    expect(response.body[0].title).toEqual('Mess Announcement');
  });

  it('blocks students from creating notifications', async () => {
    await request(app)
      .post('/api/messages/notifications')
      .set('Authorization', getAuthHeader())
      .send({ title: 'Alert', content: 'Info' })
      .expect(403);
  });

  it('allows warden or admin to broadcast notifications', async () => {
    prismaMock.notification.create.mockResolvedValueOnce({
      id: 'notif-2',
      title: 'Alert',
      content: 'Info'
    });

    const response = await request(app)
      .post('/api/messages/notifications')
      .set('Authorization', getAuthHeader('warden-id', ['warden'], ['broadcast:create']))
      .send({ title: 'Alert', content: 'Info' })
      .expect(201);

    expect(response.body.id).toEqual('notif-2');
  });
});

describe('Private Messaging tests', () => {
  it('allows sending a private message if recipient exists', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'recipient-id' }); // Recipient exists
    prismaMock.privateMessage.create.mockResolvedValueOnce({
      id: 'msg-id',
      senderId: 'user-1',
      recipientId: 'recipient-id',
      body: 'Hello!'
    });

    const response = await request(app)
      .post('/api/messages/send')
      .set('Authorization', getAuthHeader())
      .send({ recipientId: 'recipient-id', body: 'Hello!' })
      .expect(201);

    expect(response.body.id).toEqual('msg-id');
  });

  it('allows reading chat logs with another user', async () => {
    prismaMock.privateMessage.findMany.mockResolvedValueOnce([
      { id: 'msg-1', senderId: 'user-1', recipientId: 'user-2', body: 'Hello!' }
    ]);

    const response = await request(app)
      .get('/api/messages/chat/user-2')
      .set('Authorization', getAuthHeader('user-1'))
      .expect(200);

    expect(response.body.length).toBe(1);
    expect(response.body[0].body).toEqual('Hello!');
  });
});
