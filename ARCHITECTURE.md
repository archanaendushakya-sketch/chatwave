# ChatWave — Intelligent Real-Time Conversational Travel Planner

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (React + Vite)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │Chat UI   │  │Route View│  │History Panel         │   │
│  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘   │
│       └──────────────┴──────────────────┬┘               │
│                    WebSocket + REST API                   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                  BACKEND (Node.js + Express)              │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │NLP Engine  │  │Route Planner│  │Transport Service │  │
│  │(Intent +   │  │(Optimization│  │(API Integration) │  │
│  │ Entities)  │  │ + Compare)  │  │                  │  │
│  └─────┬──────┘  └──────┬──────┘  └────────┬─────────┘  │
│        └────────────┬────┴──────────────────┘            │
│               ┌─────┴──────┐                              │
│               │  Database   │                              │
│               │  (SQLite)   │                              │
│               └─────────────┘                              │
└──────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer        | Technology           | Justification                                    |
|--------------|---------------------|--------------------------------------------------|
| Backend      | Node.js + Express   | Non-blocking I/O, real-time chat support          |
| Frontend     | React + Vite        | Fast HMR, component-based, excellent for chat     |
| NLP          | Custom rule-based   | No API dependency, fast, deterministic             |
| Database     | SQLite              | Zero-config, portable, dev-friendly                |
| Real-time    | Socket.IO           | Battle-tested WebSocket with fallbacks             |
| Styling      | Vanilla CSS         | Maximum control, no framework dependency           |
| Testing      | Vitest + Supertest  | Fast, Vite-native testing                          |

## Data Flow

1. User types message in chat UI
2. Message sent via WebSocket to backend
3. NLP Engine extracts intent + entities
4. Route Planner queries Transport Service
5. Optimized routes returned to user
6. Conversation context maintained in session

## Database Schema

- **users**: id, username, email, password_hash
- **sessions**: id, user_id, created_at, title
- **messages**: id, session_id, role, content, metadata, timestamp
- **routes_cache**: id, origin, destination, mode, data, expires_at
- **stations**: id, name, city, type, latitude, longitude
