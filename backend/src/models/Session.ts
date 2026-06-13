import mongoose from 'mongoose';

const ParticipantLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  action: { type: String, enum: ['joined', 'left'], required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const SessionSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  roomToken: { type: String, required: true, unique: true },
  agentId: { type: String }, // Can be assigned later or at creation
  customerId: { type: String, required: true },
  status: { type: String, enum: ['created', 'active', 'ended'], default: 'created' },
  startTime: { type: Date },
  endTime: { type: Date },
  duration: { type: Number }, // Duration in seconds
  participants: [{ type: String }], // Array of current active userIds
  logs: [ParticipantLogSchema]
}, { timestamps: true });

export const Session = mongoose.model('Session', SessionSchema);
