import { ChatService } from '../services/chatService.js';

/**
 * WebSocket Handler
 * =================
 * Manages real-time communication using Socket.IO.
 * 
 * Events:
 * - 'chat:message' — User sends a message
 * - 'chat:response' — Server sends response back
 * - 'chat:typing' — Typing indicator
 * - 'chat:error' — Error notification
 * - 'session:create' — Create new session
 * - 'session:history' — Request chat history
 */

const chatService = new ChatService();

export function setupWebSocket(io) {
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        let currentSessionId = null;

        // Handle new chat message
        socket.on('chat:message', async (data) => {
            const { sessionId, message } = data;
            currentSessionId = sessionId;

            if (!message || !message.trim()) {
                socket.emit('chat:error', { error: 'Empty message' });
                return;
            }

            try {
                // Send typing indicator
                socket.emit('chat:typing', { isTyping: true });

                // Simulate a small delay for natural feel
                await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));

                // Process the message
                const response = await chatService.processMessage(sessionId, message.trim());

                // Stop typing indicator
                socket.emit('chat:typing', { isTyping: false });

                // Send response
                socket.emit('chat:response', {
                    sessionId,
                    message: {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: response.text,
                        metadata: response.metadata,
                        timestamp: new Date().toISOString(),
                    },
                });
            } catch (error) {
                console.error('WebSocket chat error:', error);
                socket.emit('chat:typing', { isTyping: false });
                socket.emit('chat:error', {
                    error: 'Failed to process your message. Please try again.',
                    details: error.message,
                });
            }
        });

        // Handle session creation
        socket.on('session:create', (data) => {
            try {
                const session = chatService.createSession(data?.userId, data?.title);
                currentSessionId = session.id;
                socket.emit('session:created', { session });
            } catch (error) {
                socket.emit('chat:error', { error: 'Failed to create session' });
            }
        });

        // Handle history request
        socket.on('session:history', (data) => {
            try {
                const { sessionId } = data;
                const history = chatService.getHistory(sessionId);
                socket.emit('session:history', { sessionId, messages: history });
            } catch (error) {
                socket.emit('chat:error', { error: 'Failed to fetch history' });
            }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });
}
