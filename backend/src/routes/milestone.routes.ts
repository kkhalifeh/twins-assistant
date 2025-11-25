import { Router } from 'express';
import {
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone
} from '../controllers/milestone.controller';
import { authMiddleware } from '../utils/auth';
import { checkResourceAccess } from '../middleware/rbac.middleware';

const router = Router();

router.use(authMiddleware);
router.use(checkResourceAccess);

router.get('/', getMilestones);
router.post('/', createMilestone);
router.put('/:id', updateMilestone);
router.delete('/:id', deleteMilestone);

export default router;
