import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { dashboardService } from '../services/dashboard.service';
import { parseISO } from 'date-fns';

const router = Router();

router.use(authMiddleware);

// Get dashboard data
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { date, viewMode = 'day', timezoneOffset } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Parse date string (YYYY-MM-DD format) or use current date
    // Date string represents a date in user's timezone, pass components directly
    let targetDate: { year: number; month: number; day: number } | Date;
    if (date && typeof date === 'string') {
      const [year, month, day] = date.split('-').map(Number);
      targetDate = { year, month, day };
    } else {
      targetDate = new Date();
    }

    const mode = viewMode as 'day' | 'week' | 'month';
    const tzOffset = timezoneOffset ? parseInt(timezoneOffset as string) : 0;

    const dashboardData = await dashboardService.getDashboardData(targetDate, mode, userId, tzOffset);

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
