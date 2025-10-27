import { Router } from 'express';
import { deleteAllData, deleteDataByType } from '../controllers/data.controller';

const router = Router();

// Note: authMiddleware is already applied in index.ts when mounting these routes
// No need to apply it again here

// Delete all data
router.delete('/all', deleteAllData);

// Delete data by type (feeding, sleep, diapers, health, etc.)
router.delete('/:type', deleteDataByType);

export default router;
