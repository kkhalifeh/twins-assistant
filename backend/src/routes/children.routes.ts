import { Router } from 'express';
import { 
  getChildren, 
  getChild, 
  createChild, 
  updateChild 
} from '../controllers/children.controller';
import { authMiddleware } from '../utils/auth';

const router = Router();

router.use(authMiddleware); // All routes require authentication

router.get('/', getChildren);
router.get('/:id', getChild);
router.post('/', createChild);
router.put('/:id', updateChild);

export default router;
