import { Router } from 'express';
import { createCase, getCases, approveCase, rejectCase } from '../controllers/caseController';

const router = Router();

router.post('/', createCase);
router.get('/', getCases);
router.put('/:id/approve', approveCase);
router.put('/:id/reject', rejectCase);

export default router;
