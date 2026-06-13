# AtomLink ⚛️🔗

AtomLink is a self-hosted WebRTC-powered communication platform enabling secure, low-latency video rooms without relying on third-party hosted video APIs.

Built for scalability and real-time collaboration, AtomLink provides seamless room-based communication with custom signaling and media routing.

## Features

* 🎥 Real-time video and audio communication
* 🏠 Room-based meeting system
* 🔐 Secure peer connections using WebRTC
* ⚡ Low-latency media streaming
* 📡 Custom signaling server with Socket.IO
* 🧩 Scalable architecture with SFU support
* 📱 Responsive modern UI
* 👨‍💼 Admin and client dashboards

## Tech Stack

### Frontend

* React.js
* TypeScript
* Tailwind CSS

### Backend

* Node.js
* Express.js
* Socket.IO

### Real-time Communication

* WebRTC
* SFU (Selective Forwarding Unit)

## Project Structure

```bash
AtomLink/
├── client/        # Frontend application
├── server/        # Backend and signaling server
├── sfu/           # Media routing logic
├── public/        # Static assets
└── README.md
```

## Installation

Clone the repository:

```bash
git clone https://github.com/your-username/atomlink.git
cd atomlink
```

Install dependencies:

```bash
# Frontend
cd client
npm install

# Backend
cd ../server
npm install
```

## Running the Project

Start frontend:

```bash
npm run dev
```

Start backend:

```bash
npm start
```

## Environment Variables

Create a `.env` file inside the server directory:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
```

## Roadmap

* Screen sharing support
* Chat system integration
* Meeting recording
* Authentication system
* Participant controls
* Breakout rooms
* Whiteboard collaboration



