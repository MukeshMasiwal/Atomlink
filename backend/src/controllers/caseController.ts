import { Request, Response } from 'express';
import { Case } from '../models/Case';
import { Session } from '../models/Session';
import { v4 as uuidv4 } from 'uuid';

export const createCase = async (req: Request, res: Response) => {
  try {
    console.log("Incoming case payload:", req.body);
    const { clientId, title, description } = req.body;
    if (!clientId || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newCase = new Case({ clientId, title, description });
    await newCase.save();
    res.status(201).json(newCase);
  } catch (error) {
    console.error('[API Error] createCase:', error);
    res.status(500).json({ error: 'Failed to create case' });
  }
};

export const getCases = async (req: Request, res: Response) => {
  try {
    const { role, clientId } = req.query;
    
    let query = {};
    if (role === 'Client') {
      if (!clientId) return res.status(400).json({ error: 'clientId required for Client role' });
      query = { clientId };
    }
    // Admin gets all cases by default

    const cases = await Case.find(query).sort({ createdAt: -1 });
    res.status(200).json(cases);
  } catch (error) {
    console.error('[API Error] getCases:', error);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
};

export const approveCase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;

    const targetCase = await Case.findById(id);
    if (!targetCase) return res.status(404).json({ error: 'Case not found' });
    if (targetCase.status === 'approved') return res.status(400).json({ error: 'Case already approved' });

    // Generate unique case number and token
    const caseNumber = `CASE-${Math.floor(1000 + Math.random() * 9000)}`;
    const roomToken = uuidv4().substring(0, 8); // Secure random room token e.g., 'a1b2c3d4'

    targetCase.status = 'approved';
    targetCase.caseNumber = caseNumber;
    targetCase.approvedAt = new Date();
    await targetCase.save();

    // Create associated session
    const newSession = new Session({
      caseId: targetCase._id,
      roomToken,
      agentId: agentId || 'unassigned',
      customerId: targetCase.clientId,
      status: 'created'
    });
    await newSession.save();

    res.status(200).json({ case: targetCase, session: newSession });
  } catch (error) {
    console.error('[API Error] approveCase:', error);
    res.status(500).json({ error: 'Failed to approve case' });
  }
};

export const rejectCase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const targetCase = await Case.findById(id);
    if (!targetCase) return res.status(404).json({ error: 'Case not found' });

    targetCase.status = 'rejected';
    await targetCase.save();
    
    res.status(200).json(targetCase);
  } catch (error) {
    console.error('[API Error] rejectCase:', error);
    res.status(500).json({ error: 'Failed to reject case' });
  }
};
