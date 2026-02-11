import { Router } from 'express';
import { grantPermission } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

// Only Super Admin can grant permissions
// We use a custom inline middleware or check role in controller. 
// For strict RBAC, let's allow only role='ADMIN' via a check.

const requireSuperAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Super Admin Access Required' });
    next();
};

router.post('/grant-permission', authenticateToken, requireSuperAdmin, grantPermission);

export default router;
