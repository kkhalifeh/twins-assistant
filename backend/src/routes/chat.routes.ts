import { Router, Request, Response } from 'express';
import { authMiddleware } from '../utils/auth';
import { openAIChatService } from '../services/ai-chat-openai.service';

const router = Router();

// Apply auth middleware
router.use(authMiddleware);

// Process chat message
router.post('/message', async (req: Request, res: Response) => {
  try {
    // Get userId from the authenticated request
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { message } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`Processing message from user ${userId}: ${message}`);
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ 
        error: 'AI service not configured. Please set OPENAI_API_KEY in environment variables.' 
      });
    }
    
    const response = await openAIChatService.processMessage(message, userId);
    
    res.json({ 
      message: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get chat suggestions
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const suggestions = [
      "Fed baby 120ml",
      "Child is sleeping",
      "Changed diaper - wet",
      "When was last feeding?",
      "Show today's summary",
      "How many times did child eat this week?",
      "Temperature 37.2",
      "Child woke up",
      "Is anyone sleeping?",
      "How many diapers today?",
      "Compare twins feeding patterns",
      "What's the average sleep duration?"
    ];
    
    res.json(suggestions);
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

export default router;
