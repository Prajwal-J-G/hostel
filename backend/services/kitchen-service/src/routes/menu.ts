import express, { Request, Response } from 'express';
import { requireAuth, requirePermission, BadRequestError } from 'hostel-shared';
import { prisma } from '../prisma-client';

const router = express.Router();

// GET /api/kitchen/menu?hostelId=<id>
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { hostelId } = req.query;
  if (!hostelId || typeof hostelId !== 'string') {
    throw new BadRequestError('hostelId query parameter is required');
  }

  const menu = await prisma.weeklyMenu.findUnique({
    where: { hostelId },
    include: { dailyMenus: true }
  });

  res.send(menu || null);
});

// PUT /api/kitchen/menu
router.put('/', requireAuth, requirePermission('menu:update'), async (req: Request, res: Response) => {
  const { hostelId, monday, tuesday, wednesday, thursday, friday, saturday, sunday } = req.body;
  
  if (!hostelId) {
    throw new BadRequestError('hostelId is required');
  }

  // Find or create WeeklyMenu
  let menu = await prisma.weeklyMenu.findUnique({
    where: { hostelId }
  });

  if (!menu) {
    menu = await prisma.weeklyMenu.create({
      data: { hostelId }
    });
  }

  const days = { monday, tuesday, wednesday, thursday, friday, saturday, sunday };

  for (const [day, meals] of Object.entries(days)) {
    if (meals) {
      const { breakfast, lunch, dinner } = meals as any;
      await prisma.dailyMenu.upsert({
        where: {
          weeklyMenuId_dayOfWeek: {
            weeklyMenuId: menu.id,
            dayOfWeek: day
          }
        },
        update: {
          breakfast: breakfast || 'Not Set',
          lunch: lunch || 'Not Set',
          dinner: dinner || 'Not Set'
        },
        create: {
          weeklyMenuId: menu.id,
          dayOfWeek: day,
          breakfast: breakfast || 'Not Set',
          lunch: lunch || 'Not Set',
          dinner: dinner || 'Not Set'
        }
      });
    }
  }

  const updatedMenu = await prisma.weeklyMenu.findUnique({
    where: { hostelId },
    include: { dailyMenus: true }
  });

  res.send(updatedMenu);
});

export { router as menuRouter };
