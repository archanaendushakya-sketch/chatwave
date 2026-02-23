import express from 'express';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { initDatabase } from './database/init.js';
import { seedDatabase } from './database/seed.js';
import apiRoutes from './routes/api.js';
import { setupWebSocket } from './websocket/handler.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// ============================================================================
// APP SETUP
// ============================================================================

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = new SocketIO(server, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable for dev
    crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
    origin: CORS_ORIGIN,
    credentials: true,
}));

// Request logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ============================================================================
// ROUTES
// ============================================================================

app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'ChatWave API',
        version: '1.0.0',
        description: 'Intelligent Real-Time Conversational Travel Planner',
        docs: '/api/health',
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    });
});

// ============================================================================
// STARTUP
// ============================================================================

async function startServer() {
    try {
        // Initialize database
        console.log('📦 Initializing database...');
        await initDatabase();

        // Seed with transport data
        console.log('🌱 Seeding transport data...');
        seedDatabase();

        // Setup WebSocket handlers
        console.log('🔌 Setting up WebSocket...');
        setupWebSocket(io);

        // Start server
        server.listen(PORT, () => {
            console.log('');
            console.log('  🌊 ========================================');
            console.log('  🌊  ChatWave API Server');
            console.log('  🌊 ========================================');
            console.log(`  🌊  Port:      ${PORT}`);
            console.log(`  🌊  Mode:      ${process.env.NODE_ENV || 'development'}`);
            console.log(`  🌊  CORS:      ${CORS_ORIGIN}`);
            console.log(`  🌊  API:       http://localhost:${PORT}/api`);
            console.log(`  🌊  Health:    http://localhost:${PORT}/api/health`);
            console.log(`  🌊  WebSocket: ws://localhost:${PORT}`);
            console.log('  🌊 ========================================');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

export { app, server, io };
