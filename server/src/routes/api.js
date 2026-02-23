import { Router } from 'express';
import { ChatService } from '../services/chatService.js';
import { TransportService } from '../services/transportService.js';

const router = Router();
const chatService = new ChatService();
const transportService = new TransportService();

// ============================================================================
// CHAT ENDPOINTS
// ============================================================================

/**
 * POST /api/chat/message
 * Process a user message and return AI response.
 */
router.post('/chat/message', async (req, res) => {
    try {
        const { sessionId, message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        const response = await chatService.processMessage(sessionId, message.trim());

        res.json({
            success: true,
            data: response,
        });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            error: 'Failed to process message',
            message: error.message
        });
    }
});

/**
 * GET /api/chat/history/:sessionId
 * Get conversation history for a session.
 */
router.get('/chat/history/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const history = chatService.getHistory(sessionId);
        res.json({ success: true, data: history });
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

/**
 * POST /api/chat/session
 * Create a new conversation session.
 */
router.post('/chat/session', (req, res) => {
    try {
        const { userId, title } = req.body;
        const session = chatService.createSession(userId, title);
        res.json({ success: true, data: session });
    } catch (error) {
        console.error('Session error:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

/**
 * GET /api/chat/sessions
 * Get all sessions.
 */
router.get('/chat/sessions', (req, res) => {
    try {
        const { userId } = req.query;
        const sessions = chatService.getSessions(userId);
        res.json({ success: true, data: sessions });
    } catch (error) {
        console.error('Sessions error:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// ============================================================================
// TRANSPORT DATA ENDPOINTS
// ============================================================================

/**
 * GET /api/routes/search
 * Search for routes between cities.
 */
router.get('/routes/search', (req, res) => {
    try {
        const { origin, destination, mode } = req.query;

        if (!origin || !destination) {
            return res.status(400).json({ error: 'Origin and destination are required' });
        }

        const routes = transportService.searchRoutes(origin, destination, mode || 'any');
        res.json({ success: true, data: routes, count: routes.length });
    } catch (error) {
        console.error('Route search error:', error);
        res.status(500).json({ error: 'Failed to search routes' });
    }
});

/**
 * GET /api/routes/:id
 * Get a specific route by ID.
 */
router.get('/routes/:id', (req, res) => {
    try {
        const route = transportService.getRouteById(req.params.id);
        if (!route) {
            return res.status(404).json({ error: 'Route not found' });
        }
        res.json({ success: true, data: route });
    } catch (error) {
        console.error('Route error:', error);
        res.status(500).json({ error: 'Failed to fetch route' });
    }
});

/**
 * GET /api/stations
 * Get available stations.
 */
router.get('/stations', (req, res) => {
    try {
        const { city, type } = req.query;
        const stations = transportService.getStations({ city, type });
        res.json({ success: true, data: stations });
    } catch (error) {
        console.error('Stations error:', error);
        res.status(500).json({ error: 'Failed to fetch stations' });
    }
});

/**
 * GET /api/cities
 * Get list of available cities.
 */
router.get('/cities', (req, res) => {
    try {
        const cities = transportService.getAvailableCities();
        res.json({ success: true, data: cities });
    } catch (error) {
        console.error('Cities error:', error);
        res.status(500).json({ error: 'Failed to fetch cities' });
    }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'ChatWave API',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

export default router;
