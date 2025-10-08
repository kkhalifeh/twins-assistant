import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { analyticsService } from '../services/analytics.service';

const router = Router();

router.use(authMiddleware);

// Get real-time insights
router.get('/insights', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const insights = await analyticsService.generateInsights(userId);
    res.json(insights);
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// Get predictions
router.get('/predictions', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const predictions = await analyticsService.generatePredictions(userId);
    res.json(predictions);
  } catch (error) {
    console.error('Error generating predictions:', error);
    res.status(500).json({ error: 'Failed to generate predictions' });
  }
});

// Get feeding patterns for a child
router.get('/patterns/feeding/:childId', async (req: AuthRequest, res) => {
  try {
    const { childId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const days = parseInt(req.query.days as string) || 7;
    const patterns = await analyticsService.analyzeFeedingPatterns(childId, days, userId);
    res.json(patterns);
  } catch (error) {
    console.error('Error analyzing feeding patterns:', error);
    res.status(500).json({ error: 'Failed to analyze feeding patterns' });
  }
});

// Get sleep patterns for a child
router.get('/patterns/sleep/:childId', async (req: AuthRequest, res) => {
  try {
    const { childId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const days = parseInt(req.query.days as string) || 7;
    const patterns = await analyticsService.analyzeSleepPatterns(childId, days, userId);
    res.json(patterns);
  } catch (error) {
    console.error('Error analyzing sleep patterns:', error);
    res.status(500).json({ error: 'Failed to analyze sleep patterns' });
  }
});

// Get correlations
router.get('/correlations/:childId', async (req: AuthRequest, res) => {
  try {
    const { childId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const days = parseInt(req.query.days as string) || 14;
    const correlations = await analyticsService.detectCorrelations(childId, days, userId);
    res.json(correlations);
  } catch (error) {
    console.error('Error detecting correlations:', error);
    res.status(500).json({ error: 'Failed to detect correlations' });
  }
});

// Compare twins
router.get('/compare', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const days = parseInt(req.query.days as string) || 7;
    const comparison = await analyticsService.compareTwins(days, userId);
    res.json(comparison);
  } catch (error) {
    console.error('Error comparing twins:', error);
    res.status(500).json({ error: 'Failed to compare twins' });
  }
});

export default router;
