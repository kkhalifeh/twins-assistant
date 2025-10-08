import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { dashboardService } from '../services/dashboard.service';
import { parseISO } from 'date-fns';

const router = Router();

router.use(authMiddleware);

// Get dashboard data
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { date, viewMode = 'day' } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const targetDate = date ? parseISO(date as string) : new Date();
    const mode = viewMode as 'day' | 'week' | 'month';

    const dashboardData = await dashboardService.getDashboardData(targetDate, mode, userId);

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
