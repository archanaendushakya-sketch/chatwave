import { useMemo } from 'react';

/**
 * MessageBubble component.
 * Renders a single message with markdown-like formatting.
 * Supports bold (**text**), line breaks, horizontal rules, bullet points, and emoji.
 */
function MessageBubble({ message }) {
    const formattedContent = useMemo(() => {
        return formatContent(message.content);
    }, [message.content]);

    const timeString = useMemo(() => {
        const date = new Date(message.timestamp);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }, [message.timestamp]);

    return (
        <div className={`message ${message.role}`}>
            <div className="message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
            </div>
            <div>
                <div
                    className="message-content"
                    dangerouslySetInnerHTML={{ __html: formattedContent }}
                />
                <div className="message-time">{timeString}</div>
            </div>
        </div>
    );
}

/**
 * Simple markdown-like formatter for chat messages.
 * Handles: **bold**, \n line breaks, --- hr, bullet points, links
 */
function formatContent(text) {
    if (!text) return '';

    let html = text
        // Escape HTML to prevent XSS
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Bold text **text**
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic text *text*
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
        // Horizontal rule ---
        .replace(/^---$/gm, '<hr/>')
        // Table header | # | Route | ... 
        .replace(/\|.*\|.*\|/g, (match) => {
            // Skip separator rows
            if (/^\|[\s-|]+\|$/.test(match)) return '';
            const cells = match.split('|').filter(c => c.trim());
            const cellHtml = cells.map(c => `<td style="padding: 4px 8px; border-bottom: 1px solid var(--border-color);">${c.trim()}</td>`).join('');
            return `<tr>${cellHtml}</tr>`;
        })
        // Bullet points (• or *)
        .replace(/^[\s]*[•\-\*]\s+(.+)$/gm, '<div style="padding-left: 1rem; margin: 2px 0;">• $1</div>')
        // Numbered items
        .replace(/^(\d+)\.\s+(.+)$/gm, '<div style="padding-left: 0.5rem; margin: 2px 0;"><strong>$1.</strong> $2</div>')
        // Line breaks
        .replace(/\n/g, '<br/>');

    // Wrap table rows in table if present
    if (html.includes('<tr>')) {
        html = html.replace(/(<tr>.*?<\/tr>(\s*<br\/>)*)+/gs, (match) => {
            const cleanMatch = match.replace(/<br\/>/g, '');
            return `<table style="width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 0.8rem;">${cleanMatch}</table>`;
        });
    }

    return html;
}

export default MessageBubble;
