import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Socket.IO singleton instance
let socket = null;

export function getSocket() {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 10000,
        });
    }
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

/**
 * REST API client for fallback and non-realtime operations.
 */
export async function apiRequest(endpoint, options = {}) {
    const { method = 'GET', body, headers = {} } = options;

    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || 'Request failed');
    }

    return response.json();
}

/**
 * Send a chat message via REST API (fallback if WebSocket disconnects).
 */
export async function sendMessageREST(sessionId, message) {
    return apiRequest('/chat/message', {
        method: 'POST',
        body: { sessionId, message },
    });
}

/**
 * Get chat history for a session.
 */
export async function getChatHistory(sessionId) {
    return apiRequest(`/chat/history/${sessionId}`);
}

/**
 * Create a new chat session.
 */
export async function createSession(userId, title) {
    return apiRequest('/chat/session', {
        method: 'POST',
        body: { userId, title },
    });
}

/**
 * Get available cities.
 */
export async function getAvailableCities() {
    return apiRequest('/cities');
}

/**
 * Generate a unique session ID.
 */
export function generateSessionId() {
    return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}
