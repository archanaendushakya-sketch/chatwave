function ChatHeader({ isConnected, onMenuClick }) {
    return (
        <header className="chat-header">
            <button className="menu-btn" onClick={onMenuClick} id="menu-toggle" aria-label="Toggle menu">
                ☰
            </button>
            <div className="chat-header-info">
                <div className="chat-header-avatar">🤖</div>
                <div className="chat-header-text">
                    <h2>ChatWave Assistant</h2>
                    <span>{isConnected ? '🟢 Online — Ready to plan your trip' : '🔴 Reconnecting...'}</span>
                </div>
            </div>
            <div style={{ width: 40 }} />
        </header>
    );
}

export default ChatHeader;
