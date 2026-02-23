# 🌊 ChatWave — Intelligent Real-Time Conversational Travel Planner

**ChatWave** is a production-ready, full-stack intelligent assistant designed to plan bus and train journeys through natural language conversation. It integrates optimized route searching, real-time updates via WebSockets, and a custom rule-based NLP engine.

## 🚀 Features
- **Natural Language Planning**: Just type "I want to go from Mumbai to Pune tomorrow morning".
- **Intelligent NLP Engine**: Zero-latency intent detection and entity extraction (locations, dates, modes).
- **Route Optimization**: Multi-factor scoring algorithm (Price, Duration, Convenience).
- **Real-Time Experience**: Instant responses and typing indicators powered by Socket.IO.
- **Premium UI**: Dark-mode glassmorphism design with smooth animations.
- **Cross-Platform**: Optimized for both desktop and mobile devices.

## 🛠️ Technology Stack
- **Frontend**: React + Vite, Vanilla CSS (Design System), Socket.IO Client.
- **Backend**: Node.js + Express, Socket.IO, SQL.js (WASM SQLite).
- **Testing**: Vitest for NLP logic validation.

## 📦 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm

### 2. Installation
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Running the Application
```bash
# Start the backend server (Port 3001)
cd server
npm start

# Start the frontend dev server (Port 5173)
cd ../client
npm run dev
```

## 🧪 Testing
```bash
cd server
npm test
```


