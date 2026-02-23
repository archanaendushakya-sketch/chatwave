const QUICK_ACTIONS = [
    {
        icon: '🚂',
        title: 'Find Train Routes',
        desc: 'Search trains between major cities',
        message: 'Find trains from Mumbai to Pune tomorrow morning',
    },
    {
        icon: '🚌',
        title: 'Bus Journey',
        desc: 'Compare bus options and prices',
        message: 'Show me buses from Delhi to Jaipur',
    },
    {
        icon: '💰',
        title: 'Budget Travel',
        desc: 'Find the cheapest routes',
        message: 'What is the cheapest way to travel from Bangalore to Chennai?',
    },
    {
        icon: '⚡',
        title: 'Fastest Route',
        desc: 'Get there as quick as possible',
        message: 'Find the fastest route from Hyderabad to Bangalore',
    },
];

function WelcomeScreen({ onQuickAction }) {
    return (
        <div className="welcome-screen">
            <div className="welcome-icon">🌊</div>
            <h2>Welcome to ChatWave</h2>
            <p>
                Your intelligent travel companion. Plan bus and train journeys across India
                through natural conversation. Just tell me where you want to go!
            </p>
            <div className="quick-actions">
                {QUICK_ACTIONS.map((action, i) => (
                    <div
                        key={i}
                        className="quick-action"
                        onClick={() => onQuickAction(action.message)}
                        id={`quick-action-${i}`}
                    >
                        <div className="quick-action-icon">{action.icon}</div>
                        <div className="quick-action-title">{action.title}</div>
                        <div className="quick-action-desc">{action.desc}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default WelcomeScreen;
