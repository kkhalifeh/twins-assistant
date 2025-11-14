import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { dashboardService } from '../services/dashboard.service';
import { format } from 'date-fns';

const router = Router();

router.use(authMiddleware);

// Get dashboard data
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { date, viewMode = 'day', timezone } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Pass date string directly - service will handle timezone conversion
    const dateStr = (date && typeof date === 'string') ? date : format(new Date(), 'yyyy-MM-dd');
    const mode = viewMode as 'day' | 'week' | 'month';
    const viewTimezone = timezone as string | undefined;

    const dashboardData = await dashboardService.getDashboardData(dateStr, mode, userId, viewTimezone);

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
