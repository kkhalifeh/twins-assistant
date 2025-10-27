import { Router } from 'express';
import {
  getTeamMembers,
  inviteTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  getCurrentUser
} from '../controllers/user.controller';
import { authMiddleware } from '../utils/auth';
import { requireParent } from '../middleware/rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get current user
router.get('/me', getCurrentUser);

// Get team members (all roles can view)
router.get('/team', getTeamMembers);

// Invite new team member (only PARENT)
router.post('/team/invite', requireParent, inviteTeamMember);

// Update team member role (only PARENT)
router.put('/team/:memberId/role', requireParent, updateTeamMemberRole);

// Remove team member (only PARENT)
router.delete('/team/:memberId', requireParent, removeTeamMember);

export default router;
