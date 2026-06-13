import * as mediasoup from 'mediasoup';
import { Worker, Router } from 'mediasoup/node/lib/types';
import os from 'os';

let workers: Worker[] = [];
let nextWorkerIndex = 0;

export const createWorkers = async () => {
  const numWorkers = Object.keys(os.cpus()).length;
  console.log(`Starting ${numWorkers} mediasoup workers...`);

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: 'warn',
      rtcMinPort: 40000,
      rtcMaxPort: 49999
    });

    worker.on('died', () => {
      console.error(`Mediasoup worker died, exiting in 2 seconds... [pid:${worker.pid}]`);
      setTimeout(() => process.exit(1), 2000);
    });

    workers.push(worker);
  }
};

export const getNextWorker = (): Worker => {
  const worker = workers[nextWorkerIndex];
  if (++nextWorkerIndex === workers.length) {
    nextWorkerIndex = 0;
  }
  return worker;
};

export const createRouter = async (): Promise<Router> => {
  const worker = getNextWorker();
  
  const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2
    },
    {
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000,
      parameters: {
        'x-google-start-bitrate': 1000
      }
    }
  ];

  return await worker.createRouter({ mediaCodecs });
};
