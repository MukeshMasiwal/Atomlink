import { create } from 'zustand';
import { Device, types } from 'mediasoup-client';

interface MediaState {
  device: Device | null;
  sendTransport: types.Transport | null;
  recvTransport: types.Transport | null;
  audioProducer: types.Producer | null;
  videoProducer: types.Producer | null;
  consumers: types.Consumer[];
  chatMessages: any[];
  isConnected: boolean;
  participants: string[];
  
  setDevice: (device: Device) => void;
  setSendTransport: (transport: types.Transport) => void;
  setRecvTransport: (transport: types.Transport) => void;
  setAudioProducer: (producer: types.Producer | null) => void;
  setVideoProducer: (producer: types.Producer | null) => void;
  addConsumer: (consumer: types.Consumer) => void;
  removeConsumer: (consumerId: string) => void;
  setChatMessages: (msgs: any[]) => void;
  addChatMessage: (msg: any) => void;
  setConnected: (status: boolean) => void;
  addParticipant: (userId: string) => void;
  removeParticipant: (userId: string) => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  device: null,
  sendTransport: null,
  recvTransport: null,
  audioProducer: null,
  videoProducer: null,
  consumers: [],
  chatMessages: [],
  isConnected: false,
  participants: [],

  setDevice: (device) => set({ device }),
  setSendTransport: (transport) => set({ sendTransport: transport }),
  setRecvTransport: (transport) => set({ recvTransport: transport }),
  setAudioProducer: (producer) => set({ audioProducer: producer }),
  setVideoProducer: (producer) => set({ videoProducer: producer }),
  addConsumer: (consumer) => set((state) => ({ consumers: [...state.consumers, consumer] })),
  removeConsumer: (consumerId) => set((state) => ({ 
    consumers: state.consumers.filter(c => c.id !== consumerId) 
  })),
  setChatMessages: (msgs) => set({ chatMessages: msgs }),
  addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  setConnected: (status) => set({ isConnected: status }),
  addParticipant: (userId) => set((state) => ({
    participants: state.participants.includes(userId) ? state.participants : [...state.participants, userId]
  })),
  removeParticipant: (userId) => set((state) => ({
    participants: state.participants.filter(p => p !== userId)
  }))
}));
