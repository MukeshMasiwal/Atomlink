import { Router } from 'express';
import { getSessionByToken, getSessionHistory, getChatHistory } from '../controllers/sessionController';

const router = Router();

router.get('/token/:token', getSessionByToken);
router.get('/history', getSessionHistory);
router.get('/:id/chat', getChatHistory);

export default router;
