import { Router } from 'express';
import { inputBoardingRecord, getBoardingRecords } from '../controllers/boarding.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

// Role check logic is inside controller for granular permissions
router.post('/', inputBoardingRecord);
router.get('/', getBoardingRecords);

export default router;
