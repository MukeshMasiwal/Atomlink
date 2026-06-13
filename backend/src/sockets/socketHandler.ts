import { Server, Socket } from 'socket.io';
import { Router, Transport, Producer, Consumer } from 'mediasoup/node/lib/types';
import { createRouter } from '../services/mediasoupService';
import { Session } from '../models/Session';
import { Message } from '../models/Message';

// State mapping: roomToken -> Router
const routers = new Map<string, Router>();

// State mapping: roomToken -> socketId -> Transport/Producer/Consumer
const transports = new Map<string, Transport>();
const producers = new Map<string, Producer>();
const consumers = new Map<string, Consumer>();

export const handleSocketConnection = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('joinSession', async ({ roomToken, userId }, callback) => {
      try {
        const session = await Session.findOne({ roomToken });
        if (!session) return callback({ error: 'Invalid room token' });

        socket.join(roomToken);
        
        let router = routers.get(roomToken);
        if (!router) {
          router = await createRouter();
          routers.set(roomToken, router);
        }

        // Add participant to DB (Simplified logic for now)
        if (!session.participants.includes(userId)) {
          session.participants.push(userId);
          session.logs.push({ userId, action: 'joined' });
          if (session.status === 'created') {
            session.status = 'active';
            session.startTime = new Date();
          }
          await session.save();
        }

        socket.to(roomToken).emit('userJoined', { userId });
        callback({ rtpCapabilities: router.rtpCapabilities });

      } catch (error) {
        callback({ error: 'Failed to join session' });
      }
    });

    socket.on('createWebRtcTransport', async ({ roomToken }, callback) => {
      try {
        const router = routers.get(roomToken);
        if (!router) return callback({ error: 'Router not found' });

        const transport = await router.createWebRtcTransport({
          listenIps: [{
            ip: process.env.MEDIASOUP_LISTEN_IP || '127.0.0.1',
            announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || undefined
          }],
          enableUdp: true,
          enableTcp: true,
          preferUdp: true,
          appData: { router }
        });

        transport.on('dtlsstatechange', dtlsState => {
          if (dtlsState === 'closed') transport.close();
        });

        transports.set(transport.id, transport);

        callback({
          params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters
          }
        });
      } catch (error) {
        callback({ error: 'Failed to create transport' });
      }
    });

    socket.on('connectTransport', async ({ transportId, dtlsParameters }, callback) => {
      try {
        const transport = transports.get(transportId);
        if (!transport) return callback({ error: 'Transport not found' });

        await transport.connect({ dtlsParameters });
        callback({});
      } catch (error) {
        callback({ error: 'Failed to connect transport' });
      }
    });

    socket.on('produce', async ({ transportId, kind, rtpParameters, roomToken }, callback) => {
      try {
        const transport = transports.get(transportId);
        if (!transport) return callback({ error: 'Transport not found' });

        const producer = await transport.produce({ kind, rtpParameters });
        producers.set(producer.id, producer);

        // Inform other clients in the room about the new producer
        if (roomToken) {
          socket.to(roomToken).emit('newProducer', { producerId: producer.id });
        }
        
        callback({ id: producer.id });
      } catch (error) {
        callback({ error: 'Failed to produce' });
      }
    });

    socket.on('consume', async ({ transportId, producerId, rtpCapabilities }, callback) => {
      try {
        const transport = transports.get(transportId);
        if (!transport) return callback({ error: 'Transport not found' });
        
        const router = transport.appData.router as Router; // We need to attach router to transport

        if (!router || !router.canConsume({ producerId, rtpCapabilities })) {
          return callback({ error: 'Cannot consume' });
        }

        const consumer = await transport.consume({
          producerId,
          rtpCapabilities,
          paused: true,
        });

        consumer.on('transportclose', () => {
          consumer.close();
        });

        consumer.on('producerclose', () => {
          socket.emit('producerClosed', { producerId });
          consumer.close();
        });

        consumers.set(consumer.id, consumer);

        callback({
          id: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });
      } catch (error) {
        console.error('Consume error:', error);
        callback({ error: 'Failed to consume' });
      }
    });

    socket.on('resume', async ({ consumerId }, callback) => {
      try {
        const consumer = consumers.get(consumerId);
        if (!consumer) return callback({ error: 'Consumer not found' });
        await consumer.resume();
        callback({});
      } catch (error) {
        console.error('Resume error:', error);
        callback({ error: 'Failed to resume' });
      }
    });

    socket.on('chatMessage', async ({ roomToken, senderId, content }, callback) => {
      try {
        const session = await Session.findOne({ roomToken });
        if (!session) return callback({ error: 'Session not found' });

        const message = new Message({
          sessionId: session._id,
          senderId,
          content
        });
        await message.save();

        io.to(roomToken).emit('newChatMessage', message);
        callback({});
      } catch (error) {
        callback({ error: 'Failed to save message' });
      }
    });

    socket.on('getChatHistory', async ({ roomToken }, callback) => {
      try {
        const session = await Session.findOne({ roomToken });
        if (!session) return callback({ error: 'Session not found' });

        const messages = await Message.find({ sessionId: session._id }).sort({ timestamp: 1 });
        callback({ messages });
      } catch (error) {
        callback({ error: 'Failed to fetch history' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      // Implement 60s reconnect grace period logic here if needed
    });
  });
};
