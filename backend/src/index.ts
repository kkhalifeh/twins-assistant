// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import childrenRoutes from './routes/children.routes';
import feedingRoutes from './routes/feeding.routes';
import sleepRoutes from './routes/sleep.routes';
import diaperRoutes from './routes/diaper.routes';
import healthRoutes from './routes/health.routes';
import analyticsRoutes from './routes/analytics.routes';
import dashboardRoutes from './routes/dashboard.routes';
import chatRoutes from './routes/chat.routes';
import journalRoutes from './routes/journal.routes';
import inventoryRoutes from './routes/inventory.routes';
import { checkResourceAccess } from './middleware/rbac.middleware';
import { authMiddleware } from './utils/auth';

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Create Express app
const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'twins-assistant-api'
  });
});

// API routes (public)
app.use('/api/auth', authRoutes);

// Protected routes with RBAC
app.use('/api/users', userRoutes); // User management routes already have auth middleware
app.use('/api/children', authMiddleware, checkResourceAccess, childrenRoutes);
app.use('/api/feeding', authMiddleware, checkResourceAccess, feedingRoutes);
app.use('/api/sleep', authMiddleware, checkResourceAccess, sleepRoutes);
app.use('/api/diapers', authMiddleware, checkResourceAccess, diaperRoutes);
app.use('/api/health', authMiddleware, checkResourceAccess, healthRoutes);
app.use('/api/analytics', authMiddleware, checkResourceAccess, analyticsRoutes);
app.use('/api/dashboard', authMiddleware, checkResourceAccess, dashboardRoutes);
app.use('/api/chat', authMiddleware, checkResourceAccess, chatRoutes);
app.use('/api/journal', authMiddleware, checkResourceAccess, journalRoutes);
app.use('/api/inventory', authMiddleware, checkResourceAccess, inventoryRoutes);

// Base API route
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'Twin Parenting Assistant API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      children: '/api/children',
      feeding: '/api/feeding',
      sleep: '/api/sleep',
      diapers: '/api/diapers',
      health: '/api/health',
      analytics: '/api/analytics',
      inventory: '/api/inventory'
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// Start server
async function startServer() {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📊 Database UI available at http://localhost:8080`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
startServer();
