function Sidebar({ sessions, activeSessionId, onNewChat, onSelectSession, isOpen, isConnected }) {
    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">🌊</div>
                <div className="sidebar-title">
                    <h1>ChatWave</h1>
                    <span>Travel Planner AI</span>
                </div>
            </div>

            <button className="new-chat-btn" onClick={onNewChat} id="new-chat-button">
                <span>＋</span>
                <span>New Trip</span>
            </button>

            <div className="session-list">
                {sessions.map(session => (
                    <div
                        key={session.id}
                        className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
                        onClick={() => onSelectSession(session.id)}
                        id={`session-${session.id}`}
                    >
                        <span className="session-item-icon">💬</span>
                        <span className="session-item-text">{session.title}</span>
                    </div>
                ))}
            </div>

            <div className="sidebar-footer">
                <div className={`status-dot ${isConnected ? '' : 'disconnected'}`}
                    style={{ background: isConnected ? 'var(--success-400)' : 'var(--error-400)' }} />
                <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
            </div>
        </aside>
    );
}

export default Sidebar;
