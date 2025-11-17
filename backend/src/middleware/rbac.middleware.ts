import { Response, NextFunction } from 'express';
import { AuthRequest } from '../utils/auth';

export enum UserRole {
  PARENT = 'PARENT',
  NANNY = 'NANNY',
  VIEWER = 'VIEWER'
}

type RolePermissions = {
  canAccess: string[];
  canWrite: string[];
};

// Define resource access for each role
const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  [UserRole.PARENT]: {
    canAccess: ['*'], // Full access to all resources
    canWrite: ['*']   // Can create, update, delete
  },
  [UserRole.NANNY]: {
    canAccess: ['feeding', 'sleep', 'diapers', 'health', 'hygiene', 'children'], // Only logging modules + children to see who to log for
    canWrite: ['feeding', 'sleep', 'diapers', 'health', 'hygiene'] // Can only write to logging endpoints
  },
  [UserRole.VIEWER]: {
    canAccess: ['*'], // Can view all resources
    canWrite: []      // Cannot write anything
  }
};

// Extract resource name from request path
// e.g., /api/feeding -> feeding, /api/inventory -> inventory
function getResourceFromPath(path: string): string {
  const match = path.match(/^\/api\/([^\/]+)/);
  return match ? match[1] : '';
}

// Check if user has access to a resource
export function hasAccessToResource(role: UserRole, resource: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  // Parent has access to everything
  if (permissions.canAccess.includes('*')) return true;

  // Check specific resource access
  return permissions.canAccess.includes(resource);
}

// Check if user can write to a resource
export function canWriteToResource(role: UserRole, resource: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  // Parent can write to everything
  if (permissions.canWrite.includes('*')) return true;

  // Check specific resource write access
  return permissions.canWrite.includes(resource);
}

// Middleware to check if user has access to the requested resource
export const checkResourceAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  const userRole = req.user?.role as UserRole;

  if (!userRole) {
    return res.status(401).json({ error: 'User role not found' });
  }

  // Use baseUrl to get the full mounted path
  const fullPath = req.baseUrl + req.path;
  const resource = getResourceFromPath(fullPath);
  const method = req.method;

  console.log('[RBAC] Checking access:', {
    userRole,
    method,
    baseUrl: req.baseUrl,
    path: req.path,
    fullPath,
    resource
  });

  // Allow access to auth endpoints
  if (resource === 'auth' || resource === 'health') {
    console.log('[RBAC] Allowing access to public endpoint:', resource);
    return next();
  }

  // Check read access
  if (!hasAccessToResource(userRole, resource)) {
    console.log('[RBAC] Access denied - no read access to resource:', resource);
    return res.status(403).json({
      error: 'Access denied',
      message: `Your role (${userRole}) does not have access to this resource`
    });
  }

  // Check write access for non-GET methods
  if (method !== 'GET' && !canWriteToResource(userRole, resource)) {
    console.log('[RBAC] Access denied - no write access to resource:', resource);
    return res.status(403).json({
      error: 'Access denied',
      message: `Your role (${userRole}) does not have write access to this resource`
    });
  }

  console.log('[RBAC] Access granted');
  next();
};

// Middleware to require specific role(s)
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role as UserRole;

    if (!userRole) {
      return res.status(401).json({ error: 'User role not found' });
    }

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `This endpoint requires one of the following roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

// Middleware to allow only PARENT role
export const requireParent = requireRole(UserRole.PARENT);

// Middleware to allow PARENT and NANNY roles
export const requireParentOrNanny = requireRole(UserRole.PARENT, UserRole.NANNY);
