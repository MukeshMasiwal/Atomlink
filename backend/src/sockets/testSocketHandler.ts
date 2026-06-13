import { Server, Socket } from 'socket.io';
import { Router, Transport, Producer, Consumer } from 'mediasoup/node/lib/types';
import { createRouter } from '../services/mediasoupService';

// Global state for test namespace
let router: Router | null = null;
const transports: Map<string, Transport> = new Map();
const producers: Map<string, Producer> = new Map();
const consumers: Map<string, Consumer> = new Map();

export const handleTestSocketConnection = async (io: Server) => {
  const testNamespace = io.of('/test-call');

  testNamespace.on('connection', async (socket: Socket) => {
    console.log(`[TEST-CALL] Client connected: ${socket.id}`);

    // Ensure we have a router initialized
    if (!router) {
      console.log('[TEST-CALL] Initializing Mediasoup Router...');
      router = await createRouter();
      console.log('[TEST-CALL] Router created successfully');
    }

    socket.on('getRouterRtpCapabilities', (callback) => {
      console.log(`[TEST-CALL] ${socket.id} requested router RTP Capabilities`);
      if (!router) return callback({ error: 'Router not initialized' });
      callback({ rtpCapabilities: router.rtpCapabilities });
    });

    socket.on('createWebRtcTransport', async (callback) => {
      console.log(`[TEST-CALL] ${socket.id} requesting new WebRTC Transport`);
      try {
        if (!router) return callback({ error: 'Router not initialized' });

        const transport = await router.createWebRtcTransport({
          listenIps: [{ ip: process.env.MEDIASOUP_LISTEN_IP || '127.0.0.1', announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || undefined }],
          enableUdp: true,
          enableTcp: true,
          preferUdp: true,
          appData: { router } // Attach router to transport
        });

        transport.on('dtlsstatechange', dtlsState => {
          if (dtlsState === 'closed') transport.close();
        });

        transport.on('routerclose', () => {
          transport.close();
        });

        transports.set(transport.id, transport);

        console.log(`[TEST-CALL] Transport created: ${transport.id}`);
        callback({
          params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          }
        });
      } catch (error) {
        console.error('[TEST-CALL] createWebRtcTransport error:', error);
        callback({ error: 'Failed to create transport' });
      }
    });

    socket.on('connectTransport', async ({ transportId, dtlsParameters }, callback) => {
      console.log(`[TEST-CALL] ${socket.id} connecting transport ${transportId}`);
      try {
        const transport = transports.get(transportId);
        if (!transport) return callback({ error: 'Transport not found' });

        await transport.connect({ dtlsParameters });
        console.log(`[TEST-CALL] Transport ${transportId} connected`);
        callback({});
      } catch (error) {
        console.error('[TEST-CALL] connectTransport error:', error);
        callback({ error: 'Failed to connect transport' });
      }
    });

    socket.on('produce', async ({ transportId, kind, rtpParameters }, callback) => {
      console.log(`[TEST-CALL] ${socket.id} producing ${kind}`);
      try {
        const transport = transports.get(transportId);
        if (!transport) return callback({ error: 'Transport not found' });

        const producer = await transport.produce({ kind, rtpParameters });
        producers.set(producer.id, producer);

        // Inform other clients in the test namespace about the new producer
        socket.broadcast.emit('newProducer', { producerId: producer.id });
        console.log(`[TEST-CALL] Producer created: ${producer.id} (${kind})`);
        
        callback({ id: producer.id });
      } catch (error) {
        console.error('[TEST-CALL] produce error:', error);
        callback({ error: 'Failed to produce' });
      }
    });

    socket.on('consume', async ({ transportId, producerId, rtpCapabilities }, callback) => {
      console.log(`[TEST-CALL] ${socket.id} consuming ${producerId}`);
      try {
        const transport = transports.get(transportId);
        if (!transport) return callback({ error: 'Transport not found' });
        
        if (!router) return callback({ error: 'Router not found' });

        if (!router.canConsume({ producerId, rtpCapabilities })) {
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

        console.log(`[TEST-CALL] Consumer created: ${consumer.id}`);

        callback({
          id: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });
      } catch (error) {
        console.error('[TEST-CALL] consume error:', error);
        callback({ error: 'Failed to consume' });
      }
    });

    socket.on('resume', async ({ consumerId }, callback) => {
      console.log(`[TEST-CALL] ${socket.id} resuming consumer ${consumerId}`);
      try {
        const consumer = consumers.get(consumerId);
        if (!consumer) return callback({ error: 'Consumer not found' });
        await consumer.resume();
        callback({});
      } catch (error) {
        console.error('[TEST-CALL] resume error:', error);
        callback({ error: 'Failed to resume' });
      }
    });

    // We can also let new joiners know about ALL existing producers
    socket.on('getProducers', (callback) => {
      console.log(`[TEST-CALL] ${socket.id} fetching existing producers`);
      const existingProducers = Array.from(producers.keys());
      callback({ producers: existingProducers });
    });

    socket.on('disconnect', () => {
      console.log(`[TEST-CALL] Client disconnected: ${socket.id}`);
      // In a robust implementation, we would tie transports and producers to the socket ID
      // and close them on disconnect to clean up memory. For a minimal test, memory will
      // slowly build up, but it's acceptable for a local dev prototype.
    });
  });
};
