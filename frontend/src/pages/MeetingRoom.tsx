import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { useMediaStore } from '../store/useMediaStore';
import { useAuthStore } from '../store/useAuthStore';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Send, Users, MonitorUp, Settings, Signal, Shield, User } from 'lucide-react';

export default function MeetingRoom() {
  const { roomId } = useParams(); // This is the secure roomToken
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<mediasoupClient.Device | null>(null);
  const sendTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const { 
    setDevice, 
    sendTransport, setSendTransport, 
    recvTransport, setRecvTransport,
    audioProducer, setAudioProducer, 
    videoProducer, setVideoProducer,
    isConnected, setConnected,
    chatMessages, addChatMessage, setChatMessages,
    participants, addParticipant
  } = useMediaStore();

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [showParticipants, setShowParticipants] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const { userId, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.classList.remove('hidden');
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      navigate('/login');
    }
  }, [isAuthenticated, userId, navigate]);

  useEffect(() => {
    // 1. Initialize Socket.IO connection
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');

    socketRef.current.on('connect', () => {
      setConnected(true);
      joinSession();
    });

    socketRef.current.on('disconnect', () => {
      setConnected(false);
    });

    socketRef.current.on('userJoined', ({ userId }) => {
      addParticipant(userId);
    });

    socketRef.current.on('newChatMessage', (msg) => {
      addChatMessage(msg);
    });

    socketRef.current.on('newProducer', async ({ producerId }) => {
      // Small delay to ensure sendTransport is done
      setTimeout(() => consume(producerId), 500);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [roomId]);

  const joinSession = () => {
    socketRef.current?.emit('joinSession', { roomToken: roomId, userId }, async (res: any) => {
      if (res.error) {
        console.error('Failed to join session:', res.error);
        alert('Invalid session token or room closed.');
        navigate('/login');
        return;
      }
      
      socketRef.current?.emit('getChatHistory', { roomToken: roomId }, (chatRes: any) => {
        if (!chatRes.error && chatRes.messages) {
          setChatMessages(chatRes.messages);
        }
      });

      // loadDevice returns the freshly created device so we don't rely on stale Zustand state
      const loadedDevice = await loadDevice(res.rtpCapabilities);
      if (loadedDevice) {
        createSendTransport(loadedDevice);
      }
    });
  };

  const loadDevice = async (routerRtpCapabilities: any): Promise<mediasoupClient.Device | null> => {
    try {
      const newDevice = new mediasoupClient.Device();
      await newDevice.load({ routerRtpCapabilities });
      setDevice(newDevice);
      deviceRef.current = newDevice; // store in ref for sync access in closures
      return newDevice;
    } catch (error) {
      console.error('Failed to load device', error);
      return null;
    }
  };

  const createSendTransport = (localDevice: mediasoupClient.Device) => {
    socketRef.current?.emit('createWebRtcTransport', { roomToken: roomId }, async (res: any) => {
      if (res.error) {
        console.error('Create transport error', res.error);
        return;
      }

      const transport = localDevice.createSendTransport(res.params);
      
      transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        socketRef.current?.emit('connectTransport', {
          transportId: transport.id,
          dtlsParameters
        }, (res2: any) => {
          if (res2.error) errback(res2.error);
          else callback();
        });
      });

      transport.on('produce', async (parameters, callback, errback) => {
        socketRef.current?.emit('produce', {
          transportId: transport.id,
          kind: parameters.kind,
          rtpParameters: parameters.rtpParameters,
          appData: parameters.appData,
          roomToken: roomId
        }, (res2: any) => {
          if (res2.error) errback(res2.error);
          else callback({ id: res2.id });
        });
      });

      setSendTransport(transport);
      sendTransportRef.current = transport; // store in ref for sync access in closures
      console.log('[MeetingRoom] Send transport ready:', transport.id);
    });
  };

  const createRecvTransport = (localDevice: mediasoupClient.Device) => {
    return new Promise<mediasoupClient.types.Transport>((resolve, reject) => {
      socketRef.current?.emit('createWebRtcTransport', { roomToken: roomId }, async (res: any) => {
        if (res.error) return reject(res.error);

        const transport = localDevice.createRecvTransport(res.params);

        transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
          socketRef.current?.emit('connectTransport', {
            transportId: transport.id,
            dtlsParameters
          }, (res2: any) => {
            if (res2.error) errback(res2.error);
            else callback();
          });
        });

        setRecvTransport(transport);
        resolve(transport);
      });
    });
  };

  const consume = async (producerId: string) => {
    try {
      const currentDevice = deviceRef.current;
      if (!currentDevice) {
        console.error('[consume] Device not ready yet');
        return;
      }

      let transport = recvTransport;
      if (!transport) {
        transport = await createRecvTransport(currentDevice);
      }

      socketRef.current?.emit('consume', {
        transportId: transport.id,
        producerId,
        rtpCapabilities: currentDevice.rtpCapabilities
      }, async (res: any) => {
        if (res.error) {
          console.error('Consume error:', res.error);
          return;
        }

        const consumer = await transport.consume({
          id: res.id,
          producerId: res.producerId,
          kind: res.kind,
          rtpParameters: res.rtpParameters,
        });

        // Add stream to remote video element
        const { track } = consumer;
        if (track.kind === 'video') {
          setRemoteStream(prev => {
            const stream = prev || new MediaStream();
            stream.addTrack(track);
            console.log("Remote stream:", stream);
            return stream;
          });
        }

        socketRef.current?.emit('resume', { consumerId: consumer.id }, () => {});
      });
    } catch (err) {
      console.error('Error consuming', err);
    }
  };

  const toggleMic = async () => {
    console.log("Mute clicked");
    if (audioProducer) {
      audioProducer.track.enabled = !audioProducer.track.enabled;
      setMicOn(audioProducer.track.enabled);
    } else {
      const transport = sendTransport || sendTransportRef.current;
      if (!transport) { console.warn('[toggleMic] sendTransport not ready'); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const track = stream.getAudioTracks()[0];
        const producer = await transport.produce({ track });
        setAudioProducer(producer);
        setMicOn(true);
      } catch (err) {
        console.error('Mic access denied', err);
      }
    }
  };

  const toggleCam = async () => {
    console.log("Video clicked");
    if (videoProducer) {
      videoProducer.track.enabled = !videoProducer.track.enabled;
      setCamOn(videoProducer.track.enabled);
    } else {
      const transport = sendTransport || sendTransportRef.current;
      if (!transport) { console.warn('[toggleCam] sendTransport not ready'); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log("Local stream:", stream);
        const track = stream.getVideoTracks()[0];
        setLocalStream(stream);
        const producer = await transport.produce({ track });
        setVideoProducer(producer);
        setCamOn(true);
      } catch (err) {
        console.error('Camera access denied', err);
      }
    }
  };

  const toggleScreenShare = async () => {
    console.log("Share clicked");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      setLocalStream(stream);
      if (videoProducer) {
        await videoProducer.replaceTrack({ track });
        setCamOn(true);
      } else if (sendTransport) {
        const producer = await sendTransport.produce({ track });
        setVideoProducer(producer);
        setCamOn(true);
      }
    } catch (err) {
      console.error('Screen share error', err);
    }
  };

  const handleEndCall = () => {
    console.log("End call clicked");
    if (sendTransport) sendTransport.close();
    if (recvTransport) recvTransport.close();
    if (socketRef.current) socketRef.current.disconnect();
    
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (remoteStream) remoteStream.getTracks().forEach(t => t.stop());

    navigate('/dashboard');
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    socketRef.current?.emit('chatMessage', {
      roomToken: roomId,
      senderId: userId,
      content: chatInput
    }, () => {
      setChatInput('');
    });
  };

  return (
    <div className="w-screen h-screen bg-[#0B1120] text-white flex flex-col overflow-hidden font-sans">

      {/* ─── HEADER ───────────────────────────────────────── */}
      <div className="h-[72px] shrink-0 flex items-center justify-between px-6 bg-[#111827] border-b border-[#1F2937] z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600/20 text-blue-500 rounded-lg flex items-center justify-center">
            <Shield size={18} />
          </div>
          <h1 className="text-base font-bold tracking-tight text-gray-100">Consultation Session</h1>
          <span className="bg-[#1F2937] text-gray-300 px-3 py-1 rounded-md text-xs font-semibold tracking-wide border border-gray-700">
            ID: {roomId?.substring(0,6).toUpperCase() || 'UNKNOWN'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#1F2937] border border-gray-700 px-4 py-2 rounded-lg">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`}></span>
            <span className="text-sm text-gray-300 font-medium">{isConnected ? 'Live' : 'Offline'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Users size={14} />
            <span>{participants.length || 2} participants</span>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ──────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT — video + controls */}
        <div className="relative flex-1 flex flex-col min-w-0">

          {/* VIDEO GRID */}
          <div className="flex-1 grid grid-cols-2 gap-6 p-6 min-h-0">

            {/* Local Video Card */}
            <div className={`relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden bg-[#111827] border border-[#1F2937] shadow-xl ${micOn ? 'ring-2 ring-blue-500/50' : ''}`}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              {!localStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B1120]/90 backdrop-blur-sm">
                  <div className="w-20 h-20 bg-[#1F2937] rounded-full flex items-center justify-center mb-3 border border-gray-700">
                    <User size={36} className="text-gray-500" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-200">You (Client)</h3>
                  <span className="text-sm text-gray-400 mt-1">Camera is off</span>
                </div>
              )}
              <div className="absolute top-3 left-3 z-10 bg-[#111827]/80 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-gray-700/50">
                <Signal size={13} className="text-green-500" />
                <span className="text-xs font-semibold text-gray-200">You (Client)</span>
                {!micOn && <MicOff size={11} className="text-red-400 ml-1" />}
              </div>
            </div>

            {/* Remote Video Card */}
            <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden bg-[#111827] border border-[#1F2937] shadow-xl">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover hidden"
              />
              {!remoteStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B1120]/90 backdrop-blur-sm">
                  <div className="w-20 h-20 bg-[#1F2937] rounded-full flex items-center justify-center mb-3 border border-gray-700">
                    <Shield size={36} className="text-blue-500/50" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-200">Agent</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-blue-400 font-medium">Waiting to join...</span>
                  </div>
                </div>
              )}
              <div className="absolute top-3 left-3 z-10 bg-[#111827]/80 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-gray-700/50">
                <Signal size={13} className="text-green-500" />
                <span className="text-xs font-semibold text-gray-200">Agent</span>
              </div>
            </div>
          </div>

          {/* SESSION INFO BAR */}
          <div className="shrink-0 px-4 pb-4 grid grid-cols-3 gap-3">
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-3 flex items-center gap-2">
              <User size={14} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Case ID</p>
                <p className="text-xs font-semibold text-gray-200">{roomId?.substring(0,6).toUpperCase() || 'UNKNOWN'}</p>
              </div>
            </div>
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Status</p>
                <p className="text-xs font-semibold text-green-400">Active Session</p>
              </div>
            </div>

            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-3 flex items-center gap-2">
              <Users size={14} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Participants</p>
                <p className="text-xs font-semibold text-gray-200">{participants.length || 2}</p>
              </div>
            </div>
          </div>

          {/* ─── FLOATING CONTROLS DOCK ───────────────────────── */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-4 px-4 py-3 rounded-full bg-[#111827]/95 backdrop-blur-xl border border-[#1F2937] shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
            <div className="relative group">
              <button onClick={toggleMic} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${micOn ? 'bg-[#1F2937] hover:bg-gray-700 text-gray-200' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}>
                {micOn ? <Mic size={20} className="w-5 h-5" /> : <MicOff size={20} className="w-5 h-5" />}
              </button>
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {micOn ? 'Mute' : 'Unmute'}
              </span>
            </div>

            <div className="relative group">
              <button onClick={toggleCam} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${camOn ? 'bg-[#1F2937] hover:bg-gray-700 text-gray-200' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}>
                {camOn ? <Video size={20} className="w-5 h-5" /> : <VideoOff size={20} className="w-5 h-5" />}
              </button>
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {camOn ? 'Stop Camera' : 'Start Camera'}
              </span>
            </div>

            <div className="relative group">
              <button onClick={toggleScreenShare} className="w-12 h-12 rounded-full flex items-center justify-center bg-[#1F2937] hover:bg-gray-700 text-gray-200 transition-all">
                <MonitorUp size={20} className="w-5 h-5" />
              </button>
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Share Screen</span>
            </div>

            <div className="w-px h-8 bg-gray-700 mx-1 self-center"></div>

            <div className="relative group">
              <button onClick={() => { console.log("Participants toggled"); setShowParticipants(prev => !prev); }} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${showParticipants ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' : 'bg-[#1F2937] hover:bg-gray-700 text-gray-200'}`}>
                <Users size={20} className="w-5 h-5" />
              </button>
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Participants</span>
            </div>

            <div className="relative group">
              <button onClick={() => { console.log("Settings opened"); setShowSettings(true); }} className="w-12 h-12 rounded-full flex items-center justify-center bg-[#1F2937] hover:bg-gray-700 text-gray-200 transition-all">
                <Settings size={20} className="w-5 h-5" />
              </button>
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Settings</span>
            </div>

            <div className="w-px h-8 bg-gray-700 mx-1 self-center"></div>

            <div className="relative group">
              <button type="button" onClick={handleEndCall} className="w-12 h-12 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 text-white transition-all shadow-[0_0_16px_rgba(239,68,68,0.4)]">
                <PhoneOff size={20} className="w-5 h-5" />
              </button>
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Leave</span>
            </div>
          </div>

        </div>

        {/* RIGHT SIDEBAR */}
        <div className={`flex flex-col h-full bg-[#111827] border-l border-[#1F2937] transition-all duration-300 shrink-0 ${showParticipants ? 'w-[340px]' : 'w-0 overflow-hidden border-none'}`}>

          {/* Participants */}
          <div className="shrink-0 p-4 border-b border-[#1F2937] bg-[#0B1120]/20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-gray-300 tracking-wider uppercase">Participants</h2>
              <span className="bg-[#1F2937] text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full">{participants.length || 2}</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1F2937]/60 border border-gray-800/50 hover:bg-[#1F2937] transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-xs font-bold">C</div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1F2937]"></div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-200 font-medium leading-none">You</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Client</p>
                  </div>
                </div>
                <div className={`p-1 rounded ${micOn ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                  {micOn ? <Mic size={13} /> : <MicOff size={13} />}
                </div>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1F2937]/60 border border-gray-800/50 hover:bg-[#1F2937] transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-xs font-bold">A</div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1F2937]"></div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-200 font-medium leading-none">Agent</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Support</p>
                  </div>
                </div>
                <div className="p-1 rounded bg-blue-500/10 text-blue-400">
                  <Mic size={13} />
                </div>
              </div>
            </div>
          </div>

          {/* Chat Header */}
          <div className="shrink-0 px-4 py-3 border-b border-[#1F2937] flex items-center gap-2 bg-[#0B1120]/20">
            <MessageSquare size={15} className="text-blue-500" />
            <h2 className="text-xs font-bold text-gray-300 tracking-wider uppercase">Session Chat</h2>
          </div>

          {/* Chat Messages — scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-40">
                <div className="w-10 h-10 bg-[#1F2937] rounded-full flex items-center justify-center mb-2">
                  <MessageSquare size={18} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-400 font-medium">No messages yet.</p>
                <p className="text-xs text-gray-500 mt-1">Start the conversation</p>
              </div>
            ) : (
              chatMessages.map((msg, i) => {
                const isLocal = msg.senderId === userId;
                return (
                  <div key={i} className={`flex flex-col w-full ${isLocal ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] flex flex-col ${isLocal ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline gap-1.5 mb-1 px-1">
                        <span className="text-[11px] text-gray-400 font-medium">{isLocal ? 'You' : 'Agent'}</span>
                        <span className="text-[10px] text-gray-500">10:30 AM</span>
                      </div>
                      <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                        isLocal
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-[#1F2937] text-gray-100 rounded-tl-sm border border-gray-700'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Input — sticky bottom */}
          <div className="shrink-0 p-3 bg-[#111827] border-t border-[#1F2937]">
            <form onSubmit={handleSendChat} className="relative flex items-center">
              <input
                type="text"
                className="w-full bg-[#1F2937] border border-gray-700 rounded-xl py-2.5 pl-4 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-white placeholder-gray-500"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="absolute right-1.5 w-8 h-8 bg-blue-600 rounded-lg hover:bg-blue-500 transition-all flex items-center justify-center disabled:opacity-40 disabled:hover:bg-blue-600"
              >
                <Send size={14} className="text-white ml-px" />
              </button>
            </form>
          </div>
        </div>
      </div>



      {/* ─── SETTINGS MODAL ────────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={() => setShowSettings(false)}>
          <div className="w-[420px] rounded-2xl bg-[#111827] p-6 border border-[#1F2937] shadow-[0_20px_60px_rgba(0,0,0,0.8)]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-100 mb-6">Settings</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-[#1F2937]/60 p-3.5 rounded-xl border border-gray-800/50">
                <div className="flex items-center gap-3">
                  <Mic size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">Microphone</span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${micOn ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-400'}`}>
                  {micOn ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#1F2937]/60 p-3.5 rounded-xl border border-gray-800/50">
                <div className="flex items-center gap-3">
                  <Video size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">Camera</span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${camOn ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-400'}`}>
                  {camOn ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#1F2937]/60 p-3.5 rounded-xl border border-gray-800/50">
                <div className="flex items-center gap-3">
                  <Signal size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">Connection</span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${isConnected ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-400'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#1F2937]/60 p-3.5 rounded-xl border border-gray-800/50">
                <div className="flex items-center gap-3">
                  <Users size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">Participants</span>
                </div>
                <span className="text-sm font-bold text-gray-200 bg-[#0B1120] px-2 py-0.5 rounded">
                  {participants.length}
                </span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowSettings(false)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
