import { Router } from 'express';
import { createTask, getTasks, verifyTask } from '../controllers/task.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authenticateToken); // Protect all routes

router.post('/', createTask);
router.get('/', getTasks);

// Only Admins or Delegated Verifiers can verify
router.patch('/:id/verify', requirePermission('TASK_VERIFIER'), verifyTask);

export default router;
