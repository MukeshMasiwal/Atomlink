import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import caseRoutes from './routes/caseRoutes';
import sessionRoutes from './routes/sessionRoutes';
import { createWorkers } from './services/mediasoupService';
import { handleSocketConnection } from './sockets/socketHandler';
import { handleTestSocketConnection } from './sockets/testSocketHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
].filter(Boolean) as string[];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Routes will be added here
app.use('/api/cases', caseRoutes);
app.use('/api/sessions', sessionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Socket.io for WebRTC signaling and Chat
handleSocketConnection(io);
handleTestSocketConnection(io);

const PORT = Number(process.env.PORT || 5000);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/atomlink';

const startServer = async (port: number) => {
  await createWorkers();

  server.once('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is in use, retrying on ${port + 1}`);
      startServer(port + 1);
      return;
    }

    throw error;
  });

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

startServer(PORT);

// Connect to MongoDB when available, but do not block local development startup.
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.warn('MongoDB connection unavailable, running API in offline mode:', error.message);
  });
