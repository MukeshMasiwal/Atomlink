import { Router } from 'express';
import { getSessionByToken, getSessionHistory, getChatHistory, endSession, resolveSession } from '../controllers/sessionController';

const router = Router();

router.get('/token/:token', getSessionByToken);
router.get('/history', getSessionHistory);
router.get('/:id/chat', getChatHistory);
router.patch('/:id/end', endSession);
router.patch('/:id/resolve', resolveSession);

export default router;
