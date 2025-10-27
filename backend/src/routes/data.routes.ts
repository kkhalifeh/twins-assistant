import { Router } from 'express';
import { deleteAllData, deleteDataByType } from '../controllers/data.controller';
import { authMiddleware } from '../utils/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Delete all data
router.delete('/all', deleteAllData);

// Delete data by type (feeding, sleep, diapers, health, etc.)
router.delete('/:type', deleteDataByType);

export default router;
