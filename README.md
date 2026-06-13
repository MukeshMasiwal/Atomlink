# AtomLink - Modern WebRTC Application

## Core Modules
- **Dashboard**: Create or join meeting rooms.
- **Video Meeting Rooms**: WebRTC-powered video and audio scaling.
- **User Authentication**: Secure signup and login.
- **Real-time Chat**: In-meeting text communication via Socket.io.
- **File Sharing**: Document exchange in rooms.

## Tech Stack
- Frontend: React (Vite), Tailwind CSS

- Backend: Node.js, Express, Socket.io
- Database & Cache: MongoDB, Redis
- Real-time Comm: WebRTC, socket.io-client

## Setup & Running

**Prerequisites**:
- Node.js installed
- MongoDB and Redis instances running locally or via remote URI

**Workspace Setup**:
1. From the repository root, run `npm install`
2. Start both apps with `npm run dev`

**Frontend Setup**:
1. Cd into `frontend/`
2. `npm run dev`

**Backend Setup**:
1. Cd into `backend/`
2. `npm run dev`

The backend listens on `PORT` when available and falls back to the next free port if `5000` is already in use.

## UI/UX Notes
- Using #D32F2F (Primary Red) and #B71C1C (Accent Dark Red).
- Card-based layouts and responsive styling.
