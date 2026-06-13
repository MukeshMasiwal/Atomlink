import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

export default function TestCall() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const [device, setDevice] = useState<mediasoupClient.Device | null>(null);
  const [sendTransport, setSendTransport] = useState<mediasoupClient.types.Transport | null>(null);
  const [recvTransport, setRecvTransport] = useState<mediasoupClient.types.Transport | null>(null);
  
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Audio/Video Producers tracked in Refs so we can mutate/close them easily without state tearing
  const audioProducerRef = useRef<mediasoupClient.types.Producer | null>(null);
  const videoProducerRef = useRef<mediasoupClient.types.Producer | null>(null);

  useEffect(() => {
    console.log('[TEST] Initializing Socket connection...');
    const socket = io(`${import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'}/test-call`);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[TEST] Socket connected!', socket.id);
      setIsConnected(true);
      initMediasoup(socket);
    });

    socket.on('disconnect', () => {
      console.log('[TEST] Socket disconnected');
      setIsConnected(false);
    });

    // Listen for new producers from other clients
    socket.on('newProducer', async ({ producerId }) => {
      console.log(`[TEST] New remote producer detected: ${producerId}`);
      // Small delay to ensure WebRTC state settles
      setTimeout(() => consume(socket, producerId), 1000);
    });

    return () => {
      console.log('[TEST] Component unmounting, disconnecting socket...');
      socket.disconnect();
    };
  }, []);

  const initMediasoup = (socket: Socket) => {
    socket.emit('getRouterRtpCapabilities', async (res: any) => {
      if (res.error) return console.error('[TEST] getRouterRtpCapabilities error:', res.error);
      
      console.log('[TEST] Fetched RTP Capabilities:', res.rtpCapabilities);
      
      try {
        const newDevice = new mediasoupClient.Device();
        await newDevice.load({ routerRtpCapabilities: res.rtpCapabilities });
        console.log('[TEST] Mediasoup device loaded!');
        setDevice(newDevice);

        // Fetch any existing producers that were already in the room
        socket.emit('getProducers', ({ producers }: any) => {
          console.log('[TEST] Found existing producers:', producers);
          producers.forEach((producerId: string) => {
             consume(socket, producerId, newDevice);
          });
        });
      } catch (err) {
        console.error('[TEST] Device load error:', err);
      }
    });
  };

  const createSendTransport = async (currentDevice: mediasoupClient.Device) => {
    return new Promise<mediasoupClient.types.Transport>((resolve, reject) => {
      socketRef.current?.emit('createWebRtcTransport', async (res: any) => {
        if (res.error) return reject(res.error);
        
        console.log('[TEST] Creating local Send Transport...');
        const transport = currentDevice.createSendTransport(res.params);

        transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
          console.log('[TEST] Send Transport connecting...');
          socketRef.current?.emit('connectTransport', {
            transportId: transport.id,
            dtlsParameters
          }, (res2: any) => {
            if (res2.error) return errback(res2.error);
            console.log('[TEST] Send Transport connected successfully');
            callback();
          });
        });

        transport.on('produce', async (parameters, callback, errback) => {
          console.log(`[TEST] Send Transport producing ${parameters.kind}...`);
          socketRef.current?.emit('produce', {
            transportId: transport.id,
            kind: parameters.kind,
            rtpParameters: parameters.rtpParameters,
            appData: parameters.appData
          }, (res2: any) => {
            if (res2.error) return errback(res2.error);
            console.log(`[TEST] Produce successful, Server ID: ${res2.id}`);
            callback({ id: res2.id });
          });
        });

        setSendTransport(transport);
        resolve(transport);
      });
    });
  };

  const createRecvTransport = async (currentDevice: mediasoupClient.Device) => {
    return new Promise<mediasoupClient.types.Transport>((resolve, reject) => {
      socketRef.current?.emit('createWebRtcTransport', async (res: any) => {
        if (res.error) return reject(res.error);
        
        console.log('[TEST] Creating local Recv Transport...');
        const transport = currentDevice.createRecvTransport(res.params);

        transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
          console.log('[TEST] Recv Transport connecting...');
          socketRef.current?.emit('connectTransport', {
            transportId: transport.id,
            dtlsParameters
          }, (res2: any) => {
            if (res2.error) return errback(res2.error);
            console.log('[TEST] Recv Transport connected successfully');
            callback();
          });
        });

        setRecvTransport(transport);
        resolve(transport);
      });
    });
  };

  const consume = async (socket: Socket, producerId: string, currentDevice?: mediasoupClient.Device) => {
    try {
      const activeDevice = currentDevice || device;
      if (!activeDevice) return console.warn('[TEST] Cannot consume: device not loaded');

      let transport = recvTransport;
      if (!transport) {
        transport = await createRecvTransport(activeDevice);
      }

      console.log(`[TEST] Requesting to consume producer ${producerId}...`);
      socket.emit('consume', {
        transportId: transport.id,
        producerId,
        rtpCapabilities: activeDevice.rtpCapabilities
      }, async (res: any) => {
        if (res.error) return console.error('[TEST] Consume failed server-side:', res.error);

        console.log(`[TEST] Local consume initializing for ${res.kind}...`);
        const consumer = await transport.consume({
          id: res.id,
          producerId: res.producerId,
          kind: res.kind,
          rtpParameters: res.rtpParameters,
        });

        // Add stream to remote video element
        const { track } = consumer;
        if (remoteVideoRef.current && track.kind === 'video') {
          console.log('[TEST] Remote video track attached to HTML Element!');
          const stream = remoteVideoRef.current.srcObject as MediaStream || new MediaStream();
          stream.addTrack(track);
          remoteVideoRef.current.srcObject = stream;
        }

        if (track.kind === 'audio') {
           console.log('[TEST] Remote audio track received!');
           const stream = new MediaStream([track]);
           const audioEl = new Audio();
           audioEl.srcObject = stream;
           audioEl.play().catch(e => console.warn('[TEST] Audio autoplay blocked', e));
        }

        socket.emit('resume', { consumerId: consumer.id }, () => {
          console.log(`[TEST] Resumed consumer ${consumer.id}`);
        });
      });
    } catch (err) {
      console.error('[TEST] Error consuming', err);
    }
  };

  const toggleMic = async () => {
    if (!device) return;

    if (micOn && audioProducerRef.current) {
      audioProducerRef.current.close();
      audioProducerRef.current = null;
      setMicOn(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const track = stream.getAudioTracks()[0];
      
      let transport = sendTransport;
      if (!transport) transport = await createSendTransport(device);

      const producer = await transport.produce({ track });
      audioProducerRef.current = producer;
      setMicOn(true);
      console.log('[TEST] Local mic enabled');
    } catch (err) {
      console.error('[TEST] Mic access denied', err);
    }
  };

  const toggleCam = async () => {
    if (!device) return;

    if (camOn && videoProducerRef.current) {
      videoProducerRef.current.close();
      videoProducerRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      setCamOn(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      
      let transport = sendTransport;
      if (!transport) transport = await createSendTransport(device);

      const producer = await transport.produce({ track });
      videoProducerRef.current = producer;
      setCamOn(true);
      console.log('[TEST] Local camera enabled');
    } catch (err) {
      console.error('[TEST] Camera access denied', err);
    }
  };

  const handleLeave = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-white font-sans">
      <div className="absolute top-6 flex items-center gap-3 bg-gray-900 px-4 py-2 rounded-full border border-gray-800">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm font-medium">{isConnected ? 'Connected to /test-call' : 'Disconnected'}</span>
      </div>

      <div className="flex gap-6 w-full max-w-5xl h-[60vh] mt-10">
        
        {/* Local Video */}
        <div className="flex-1 bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl relative">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
          <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">Local Video</div>
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-medium">Camera Off</div>
          )}
        </div>

        {/* Remote Video */}
        <div className="flex-1 bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl relative">
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">Remote Video</div>
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-medium -z-10">Waiting for stream...</div>
        </div>

      </div>

      <div className="mt-8 flex gap-4">
        <button 
          onClick={toggleMic} 
          className={`px-6 py-3 rounded-full font-medium transition-all ${micOn ? 'bg-gray-800 hover:bg-gray-700 border border-gray-600' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {micOn ? 'Mute Mic' : 'Unmute Mic'}
        </button>
        <button 
          onClick={toggleCam} 
          className={`px-6 py-3 rounded-full font-medium transition-all ${camOn ? 'bg-gray-800 hover:bg-gray-700 border border-gray-600' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {camOn ? 'Stop Video' : 'Start Video'}
        </button>
        <button 
          onClick={handleLeave} 
          className="px-6 py-3 rounded-full font-medium transition-all bg-red-600 hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.3)] ml-4"
        >
          Leave Test
        </button>
      </div>

      <div className="mt-12 text-center text-gray-500 max-w-xl text-sm">
        Open this page in two separate browser tabs. Press "Start Video" in both tabs to test P2P logic routed through the local Mediasoup server. Check console for detailed debug logs.
      </div>
    </div>
  );
}
