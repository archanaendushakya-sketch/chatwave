import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

function MessageList({ messages, isTyping }) {
    const messagesEndRef = useRef(null);
    const containerRef = useRef(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping]);

    return (
        <div className="messages-container" ref={containerRef}>
            {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
            ))}

            {isTyping && (
                <div className="typing-indicator">
                    <div className="message-avatar" style={{
                        background: 'linear-gradient(135deg, #a855f7, #667eea)',
                    }}>
                        🤖
                    </div>
                    <div className="typing-dots">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                    </div>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}

export default MessageList;
