import mongoose from 'mongoose';

const CaseSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  caseNumber: { type: String, sparse: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  approvedAt: { type: Date }
});

export const Case = mongoose.model('Case', CaseSchema);
