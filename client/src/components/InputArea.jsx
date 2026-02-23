import { useState, useRef, useEffect } from 'react';

function InputArea({ onSendMessage, isTyping, isConnected }) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
        }
    }, [message]);

    // Focus on mount
    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    const handleSubmit = () => {
        if (!message.trim() || isTyping) return;
        onSendMessage(message);
        setMessage('');
        // Reset height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="input-area">
            <div className="input-container">
                <div className="input-wrapper">
                    <textarea
                        ref={textareaRef}
                        id="chat-input"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isConnected
                            ? "Plan your trip... e.g., 'Find trains from Mumbai to Pune tomorrow'"
                            : "Connecting to server..."
                        }
                        disabled={!isConnected || isTyping}
                        rows={1}
                        aria-label="Type your travel query"
                    />
                </div>
                <button
                    className="send-btn"
                    onClick={handleSubmit}
                    disabled={!message.trim() || isTyping || !isConnected}
                    id="send-button"
                    aria-label="Send message"
                >
                    ➤
                </button>
            </div>
            <div className="input-hint">
                Press <strong>Enter</strong> to send • <strong>Shift+Enter</strong> for new line
            </div>
        </div>
    );
}

export default InputArea;
