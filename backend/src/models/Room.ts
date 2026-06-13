import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

export const Room = mongoose.model('Room', RoomSchema);
