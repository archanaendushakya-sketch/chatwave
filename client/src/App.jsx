import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatHeader from './components/ChatHeader';
import MessageList from './components/MessageList';
import InputArea from './components/InputArea';
import WelcomeScreen from './components/WelcomeScreen';
import { getSocket, sendMessageREST, generateSessionId } from './api';

function App() {
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId, setSessionId] = useState(() => generateSessionId());
    const [sessions, setSessions] = useState([{ id: sessionId, title: 'New Trip Planning', active: true }]);
    const [isConnected, setIsConnected] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const socketRef = useRef(null);

    // Initialize Socket.IO connection
    useEffect(() => {
        const socket = getSocket();
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('🌊 Connected to ChatWave server');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('🔌 Disconnected from server');
            setIsConnected(false);
        });

        socket.on('chat:response', (data) => {
            setIsTyping(false);
            if (data.message) {
                setMessages(prev => [...prev, {
                    id: data.message.id || Date.now().toString(),
                    role: 'assistant',
                    content: data.message.content,
                    metadata: data.message.metadata,
                    timestamp: data.message.timestamp || new Date().toISOString(),
                }]);
            }
        });

        socket.on('chat:typing', (data) => {
            setIsTyping(data.isTyping);
        });

        socket.on('chat:error', (data) => {
            setIsTyping(false);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `⚠️ ${data.error || 'Something went wrong. Please try again.'}`,
                timestamp: new Date().toISOString(),
            }]);
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('chat:response');
            socket.off('chat:typing');
            socket.off('chat:error');
        };
    }, []);

    // Send message handler
    const sendMessage = useCallback(async (text) => {
        if (!text.trim()) return;

        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text.trim(),
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMessage]);

        // Update session title on first message
        if (messages.length === 0) {
            const title = text.trim().substring(0, 40) + (text.length > 40 ? '...' : '');
            setSessions(prev => prev.map(s =>
                s.id === sessionId ? { ...s, title } : s
            ));
        }

        // Try WebSocket first, fallback to REST
        if (socketRef.current?.connected) {
            socketRef.current.emit('chat:message', {
                sessionId,
                message: text.trim(),
            });
        } else {
            try {
                setIsTyping(true);
                const response = await sendMessageREST(sessionId, text.trim());
                setIsTyping(false);

                if (response.success && response.data) {
                    setMessages(prev => [...prev, {
                        id: Date.now().toString() + '_resp',
                        role: 'assistant',
                        content: response.data.text,
                        metadata: response.data.metadata,
                        timestamp: new Date().toISOString(),
                    }]);
                }
            } catch (error) {
                setIsTyping(false);
                setMessages(prev => [...prev, {
                    id: Date.now().toString() + '_err',
                    role: 'assistant',
                    content: '⚠️ Unable to connect to the server. Please check if the backend is running.',
                    timestamp: new Date().toISOString(),
                }]);
            }
        }
    }, [sessionId, messages.length]);

    // Create new chat session
    const handleNewChat = useCallback(() => {
        const newId = generateSessionId();
        setSessionId(newId);
        setMessages([]);
        setSessions(prev => [
            { id: newId, title: 'New Trip Planning', active: true },
            ...prev.map(s => ({ ...s, active: false })),
        ]);
        setIsSidebarOpen(false);
    }, []);

    // Switch to existing session
    const handleSelectSession = useCallback((id) => {
        setSessionId(id);
        setSessions(prev => prev.map(s => ({ ...s, active: s.id === id })));
        setMessages([]); // In production, load from API
        setIsSidebarOpen(false);
    }, []);

    // Quick action handler (from welcome screen)
    const handleQuickAction = useCallback((text) => {
        sendMessage(text);
    }, [sendMessage]);

    return (
        <div className="app">
            {/* Mobile sidebar overlay */}
            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
            )}

            <Sidebar
                sessions={sessions}
                activeSessionId={sessionId}
                onNewChat={handleNewChat}
                onSelectSession={handleSelectSession}
                isOpen={isSidebarOpen}
                isConnected={isConnected}
            />

            <div className="chat-area">
                <ChatHeader
                    isConnected={isConnected}
                    onMenuClick={() => setIsSidebarOpen(true)}
                />

                {messages.length === 0 ? (
                    <WelcomeScreen onQuickAction={handleQuickAction} />
                ) : (
                    <MessageList
                        messages={messages}
                        isTyping={isTyping}
                    />
                )}

                <InputArea
                    onSendMessage={sendMessage}
                    isTyping={isTyping}
                    isConnected={isConnected}
                />
            </div>
        </div>
    );
}

export default App;
