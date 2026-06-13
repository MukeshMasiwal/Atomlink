import { Request, Response } from 'express';
import { Session } from '../models/Session';
import { Message } from '../models/Message';

export const getSessionByToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const session = await Session.findOne({ roomToken: token }).populate('caseId');
    if (!session) return res.status(404).json({ error: 'Session not found or invalid token' });
    
    res.status(200).json(session);
  } catch (error) {
    console.error('[API Error] getSessionByToken:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
};

export const getSessionHistory = async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.query;
    
    let query = {};
    if (role === 'Client') {
      if (!userId) return res.status(400).json({ error: 'userId required for Client role' });
      query = { customerId: userId };
    } else if (role === 'Admin') {
      // Admin might see all, or only ones they are assigned to. For now, all.
    }

    const sessions = await Session.find(query).populate('caseId').sort({ startTime: -1, createdAt: -1 });
    res.status(200).json(sessions);
  } catch (error) {
    console.error('[API Error] getSessionHistory:', error);
    res.status(500).json({ error: 'Failed to fetch session history' });
  }
};

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const messages = await Message.find({ sessionId: id }).sort({ timestamp: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error('[API Error] getChatHistory:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};

export const endSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.status = 'ended';
    session.endTime = new Date();
    await session.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('sessionUpdated', session);
    }

    res.status(200).json(session);
  } catch (error) {
    console.error('[API Error] endSession:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
};

export const resolveSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.status = 'resolved';
    session.resolvedAt = new Date();
    session.endTime = new Date();
    await session.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('sessionUpdated', session);
    }

    res.status(200).json(session);
  } catch (error) {
    console.error('[API Error] resolveSession:', error);
    res.status(500).json({ error: 'Failed to resolve session' });
  }
};
