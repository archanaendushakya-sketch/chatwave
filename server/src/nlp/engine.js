/**
 * ChatWave NLP Engine
 * ==================
 * Custom rule-based NLP engine for travel intent detection and entity extraction.
 * 
 * Design Decision: We use a rule-based approach rather than an LLM API because:
 * 1. Zero latency — no external API calls needed
 * 2. Deterministic — same input always produces same output
 * 3. Privacy — user data never leaves the server
 * 4. Cost — no per-token pricing
 * 5. Reliability — no external service dependencies
 * 
 * The engine handles:
 * - Intent classification (travel search, greeting, help, etc.)
 * - Entity extraction (origin, destination, date, time, mode, class)
 * - Context management (multi-turn conversation)
 * - Response generation
 */

// ============================================================================
// INTENT DEFINITIONS
// ============================================================================

export const INTENTS = {
    TRAVEL_SEARCH: 'travel_search',
    GREETING: 'greeting',
    HELP: 'help',
    ROUTE_PREFERENCE: 'route_preference',
    SCHEDULE_QUERY: 'schedule_query',
    PRICE_QUERY: 'price_query',
    COMPARE_ROUTES: 'compare_routes',
    SELECT_ROUTE: 'select_route',
    GOODBYE: 'goodbye',
    THANKS: 'thanks',
    UNKNOWN: 'unknown',
};

// ============================================================================
// PATTERN DATABASES
// ============================================================================

const INTENT_PATTERNS = {
    [INTENTS.GREETING]: [
        /^(hi|hello|hey|howdy|hola|good\s*(morning|afternoon|evening|day)|namaste|namaskar)/i,
        /^(what'?s?\s*up|yo|sup)/i,
    ],
    [INTENTS.GOODBYE]: [
        /\b(bye|goodbye|see\s*you|take\s*care|ciao|later|ttyl)\b/i,
    ],
    [INTENTS.THANKS]: [
        /\b(thanks?|thank\s*you|thx|ty|appreciate|grateful|dhanyavaad)\b/i,
    ],
    [INTENTS.HELP]: [
        /\b(help|assist|support|how\s*(do|can|to)|what\s*can\s*you|guide|tutorial)\b/i,
        /\bwhat\s*(do|can)\s*you\s*do\b/i,
    ],
    [INTENTS.PRICE_QUERY]: [
        /\b(how\s*much|price|cost|fare|charge|rate|ticket\s*price|expensive|cheap|budget)\b/i,
    ],
    [INTENTS.SCHEDULE_QUERY]: [
        /\b(when|what\s*time|schedule|timing|departure|arrival|next\s*(train|bus)|timetable)\b/i,
    ],
    [INTENTS.COMPARE_ROUTES]: [
        /\b(compare|comparison|difference|vs|versus|which\s*is\s*(better|faster|cheaper)|between)\b/i,
    ],
    [INTENTS.SELECT_ROUTE]: [
        /\b(select|choose|book|pick|go\s*with|option\s*\d|i('ll|\s*will)\s*(take|choose|go\s*with))\b/i,
        /\b(number|#)\s*\d\b/i,
    ],
    [INTENTS.ROUTE_PREFERENCE]: [
        /\b(prefer|want|looking\s*for|need\s*a?|fastest|cheapest|quickest|comfortable|direct)\b/i,
    ],
    [INTENTS.TRAVEL_SEARCH]: [
        /\b(travel|go|going|trip|journey|route|from|to\b.*\bto\b|book|find\s*(a\s*)?(bus|train|route|trip))/i,
        /\b(bus|train|flight)\s*(from|to|between)\b/i,
        /\bfrom\s+\w+\s+to\s+\w+/i,
        /\b(i\s*(want|need|have)\s*to\s*(go|travel|reach|visit|get\s*to))\b/i,
        /\btake\s*me\s*(to|from)\b/i,
    ],
};

// ============================================================================
// CITY NAME DATABASE (with aliases)
// ============================================================================

const CITY_ALIASES = {
    'mumbai': 'Mumbai',
    'bombay': 'Mumbai',
    'bom': 'Mumbai',
    'delhi': 'Delhi',
    'new delhi': 'Delhi',
    'dilli': 'Delhi',
    'pune': 'Pune',
    'poona': 'Pune',
    'bangalore': 'Bangalore',
    'bengaluru': 'Bangalore',
    'blr': 'Bangalore',
    'chennai': 'Chennai',
    'madras': 'Chennai',
    'hyderabad': 'Hyderabad',
    'hyd': 'Hyderabad',
    'kolkata': 'Kolkata',
    'calcutta': 'Kolkata',
    'cal': 'Kolkata',
    'jaipur': 'Jaipur',
    'ahmedabad': 'Ahmedabad',
    'amd': 'Ahmedabad',
    'goa': 'Goa',
    'panaji': 'Goa',
    'lucknow': 'Lucknow',
};

// ============================================================================
// TIME & DATE PATTERNS
// ============================================================================

const TIME_PATTERNS = {
    morning: { start: '06:00', end: '12:00', label: 'morning' },
    afternoon: { start: '12:00', end: '17:00', label: 'afternoon' },
    evening: { start: '17:00', end: '21:00', label: 'evening' },
    night: { start: '21:00', end: '06:00', label: 'night' },
    early: { start: '04:00', end: '08:00', label: 'early morning' },
    late: { start: '20:00', end: '23:59', label: 'late night' },
};

const DATE_ALIASES = {
    today: 0,
    tomorrow: 1,
    'day after tomorrow': 2,
    'day after': 2,
    'next week': 7,
    'this weekend': null, // calculated dynamically
};

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// ============================================================================
// ENTITY EXTRACTION
// ============================================================================

/**
 * Extract travel-related entities from user message.
 * @param {string} message - Raw user message
 * @param {object} context - Existing conversation context
 * @returns {object} Extracted entities
 */
export function extractEntities(message, context = {}) {
    const normalized = message.toLowerCase().trim();
    const entities = {};

    // Extract origin and destination
    const locations = extractLocations(normalized);
    if (locations.origin) entities.origin = locations.origin;
    if (locations.destination) entities.destination = locations.destination;

    // Extract transport mode
    const mode = extractMode(normalized);
    if (mode) entities.mode = mode;

    // Extract date
    const date = extractDate(normalized);
    if (date) entities.date = date;

    // Extract time preference
    const time = extractTime(normalized);
    if (time) entities.timePreference = time;

    // Extract class preference
    const seatClass = extractClass(normalized);
    if (seatClass) entities.seatClass = seatClass;

    // Extract budget preference
    const budget = extractBudget(normalized);
    if (budget) entities.budgetPreference = budget;

    // Merge with context (existing entities fill in missing ones)
    return mergeWithContext(entities, context);
}

function extractLocations(text) {
    const result = {};

    // Pattern: "from X to Y"
    const fromTo = text.match(/from\s+([a-z\s]+?)\s+to\s+([a-z\s]+?)(?:\s+(?:by|on|in|at|tomorrow|today|next|this|$)|\s*$)/i);
    if (fromTo) {
        result.origin = resolveCity(fromTo[1].trim());
        result.destination = resolveCity(fromTo[2].trim());
        return result;
    }

    // Pattern: "X to Y"
    const xToY = text.match(/([a-z\s]+?)\s+to\s+([a-z\s]+?)(?:\s+(?:by|on|in|at|tomorrow|today|next|this|$)|\s*$)/i);
    if (xToY) {
        const origin = resolveCity(xToY[1].trim());
        const dest = resolveCity(xToY[2].trim());
        if (origin && dest) {
            result.origin = origin;
            result.destination = dest;
            return result;
        }
    }

    // Pattern: "to Y from X"
    const toFrom = text.match(/to\s+([a-z\s]+?)\s+from\s+([a-z\s]+?)(?:\s|$)/i);
    if (toFrom) {
        result.destination = resolveCity(toFrom[1].trim());
        result.origin = resolveCity(toFrom[2].trim());
        return result;
    }

    // Pattern: "go to Y" or "reach Y" or "visit Y"
    const goTo = text.match(/(?:go|going|travel|reach|visit|get)\s+(?:to\s+)?([a-z\s]+?)(?:\s+(?:by|on|in|at|from|tomorrow|today)|\s*$)/i);
    if (goTo) {
        result.destination = resolveCity(goTo[1].trim());
    }

    // Pattern: "from X"
    const from = text.match(/from\s+([a-z\s]+?)(?:\s+(?:by|on|in|at|to|tomorrow|today)|\s*$)/i);
    if (from) {
        result.origin = resolveCity(from[1].trim());
    }

    return result;
}

function resolveCity(text) {
    if (!text) return null;
    const cleaned = text.replace(/[^a-z\s]/gi, '').trim().toLowerCase();

    // Direct match
    if (CITY_ALIASES[cleaned]) return CITY_ALIASES[cleaned];

    // Partial match (check if any city name is contained in the text)
    for (const [alias, city] of Object.entries(CITY_ALIASES)) {
        if (cleaned.includes(alias) || alias.includes(cleaned)) {
            return city;
        }
    }

    return null;
}

function extractMode(text) {
    if (/\b(train|railway|rail|express|rajdhani|shatabdi)\b/i.test(text)) return 'train';
    if (/\b(bus|volvo|sleeper|msrtc|rsrtc|ksrtc)\b/i.test(text)) return 'bus';
    if (/\b(any|both|either|all)\s*(mode|transport|option)?\b/i.test(text)) return 'any';
    return null;
}

function extractDate(text) {
    const now = new Date();

    // Check for relative dates
    for (const [alias, offset] of Object.entries(DATE_ALIASES)) {
        if (text.includes(alias)) {
            if (offset === null) {
                // Handle "this weekend"
                const dayOfWeek = now.getDay();
                const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
                const weekend = new Date(now);
                weekend.setDate(now.getDate() + daysUntilSat);
                return weekend.toISOString().split('T')[0];
            }
            const date = new Date(now);
            date.setDate(now.getDate() + offset);
            return date.toISOString().split('T')[0];
        }
    }

    // Check for day names
    for (let i = 0; i < DAY_NAMES.length; i++) {
        if (text.includes(DAY_NAMES[i])) {
            const dayOfWeek = now.getDay();
            let daysAhead = i - dayOfWeek;
            if (daysAhead <= 0) daysAhead += 7;
            const date = new Date(now);
            date.setDate(now.getDate() + daysAhead);
            return date.toISOString().split('T')[0];
        }
    }

    // Check for explicit dates (DD/MM, DD-MM, DD MMM)
    const explicitDate = text.match(/(\d{1,2})[\/\-\s]((?:\d{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)/i);
    if (explicitDate) {
        const day = parseInt(explicitDate[1]);
        let month;
        const monthStr = explicitDate[2].toLowerCase();
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthIndex = monthNames.findIndex(m => monthStr.startsWith(m));
        if (monthIndex >= 0) {
            month = monthIndex;
        } else {
            month = parseInt(monthStr) - 1;
        }
        if (!isNaN(day) && !isNaN(month) && month >= 0 && month <= 11) {
            const date = new Date(now.getFullYear(), month, day);
            if (date < now) date.setFullYear(date.getFullYear() + 1);
            return date.toISOString().split('T')[0];
        }
    }

    return null;
}

function extractTime(text) {
    // Check for time-of-day keywords
    for (const [keyword, timeRange] of Object.entries(TIME_PATTERNS)) {
        if (text.includes(keyword)) return timeRange;
    }

    // Check for explicit time (e.g., "at 3pm", "around 14:00")
    const explicitTime = text.match(/(?:at|around|by|before|after)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (explicitTime) {
        let hour = parseInt(explicitTime[1]);
        const minutes = explicitTime[2] || '00';
        const ampm = explicitTime[3];
        if (ampm?.toLowerCase() === 'pm' && hour < 12) hour += 12;
        if (ampm?.toLowerCase() === 'am' && hour === 12) hour = 0;
        return { start: `${hour.toString().padStart(2, '0')}:${minutes}`, end: null, label: `around ${hour}:${minutes}` };
    }

    return null;
}

function extractClass(text) {
    if (/\b(first\s*class|1st\s*class|fc|1ac)\b/i.test(text)) return 'first';
    if (/\b(second\s*class|2nd\s*class|2ac)\b/i.test(text)) return 'second';
    if (/\b(sleeper|sl|3ac)\b/i.test(text)) return 'sleeper';
    if (/\b(ac|air\s*condition)\b/i.test(text)) return 'ac';
    if (/\b(general|gen|unreserved)\b/i.test(text)) return 'general';
    return null;
}

function extractBudget(text) {
    if (/\b(cheap|budget|low\s*cost|affordable|economy|economical)\b/i.test(text)) return 'budget';
    if (/\b(premium|luxury|comfortable|best|top|vip)\b/i.test(text)) return 'premium';
    if (/\b(moderate|balanced|mid|medium)\b/i.test(text)) return 'balanced';
    return null;
}

function mergeWithContext(entities, context) {
    const merged = { ...context };

    // Overwrite with newly extracted entities
    for (const [key, value] of Object.entries(entities)) {
        if (value !== null && value !== undefined) {
            merged[key] = value;
        }
    }

    return merged;
}

// ============================================================================
// INTENT DETECTION
// ============================================================================

/**
 * Detect the primary intent from the user's message.
 * Uses a scoring system — the intent with the highest match score wins.
 * Travel search intent is boosted if location entities are found.
 */
export function detectIntent(message, entities = {}) {
    const normalized = message.toLowerCase().trim();
    const scores = {};

    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
        scores[intent] = 0;
        for (const pattern of patterns) {
            if (pattern.test(normalized)) {
                scores[intent] += 1;
            }
        }
    }

    // Boost travel_search if we found location entities
    if (entities.origin || entities.destination) {
        scores[INTENTS.TRAVEL_SEARCH] = (scores[INTENTS.TRAVEL_SEARCH] || 0) + 2;
    }

    // Find the intent with highest score
    let maxScore = 0;
    let bestIntent = INTENTS.UNKNOWN;

    for (const [intent, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            bestIntent = intent;
        }
    }

    // If score is very low and we have entities, default to travel search
    if (maxScore <= 0 && (entities.origin || entities.destination)) {
        bestIntent = INTENTS.TRAVEL_SEARCH;
    }

    return { intent: bestIntent, confidence: Math.min(maxScore / 3, 1) };
}

// ============================================================================
// CONVERSATION CONTEXT MANAGER
// ============================================================================

export class ConversationContext {
    constructor() {
        this.sessions = new Map();
    }

    getContext(sessionId) {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                entities: {},
                lastIntent: null,
                turnCount: 0,
                history: [],
                lastRoutes: null,
                state: 'idle', // idle, collecting_info, showing_results, confirming
            });
        }
        return this.sessions.get(sessionId);
    }

    updateContext(sessionId, updates) {
        const ctx = this.getContext(sessionId);

        if (updates.entities) {
            ctx.entities = { ...ctx.entities, ...updates.entities };
        }
        if (updates.lastIntent) ctx.lastIntent = updates.lastIntent;
        if (updates.state) ctx.state = updates.state;
        if (updates.lastRoutes) ctx.lastRoutes = updates.lastRoutes;

        ctx.turnCount++;

        if (updates.message) {
            ctx.history.push(updates.message);
            // Keep only last 20 messages for context
            if (ctx.history.length > 20) {
                ctx.history = ctx.history.slice(-20);
            }
        }

        return ctx;
    }

    clearContext(sessionId) {
        this.sessions.delete(sessionId);
    }

    /**
     * Determine what information is still missing for a travel search.
     */
    getMissingEntities(sessionId) {
        const ctx = this.getContext(sessionId);
        const missing = [];

        if (!ctx.entities.origin) missing.push('origin');
        if (!ctx.entities.destination) missing.push('destination');

        return missing;
    }
}

// ============================================================================
// RESPONSE GENERATOR
// ============================================================================

export class ResponseGenerator {
    constructor() {
        this.greetings = [
            "Hello! 👋 I'm ChatWave, your travel planning assistant. I can help you find bus and train routes across India. Where would you like to go?",
            "Hey there! 🌊 Welcome to ChatWave! Tell me about your travel plans — I'll find the best routes for you.",
            "Hi! 🚂🚌 I'm here to help you plan your journey. Just tell me where you're traveling from and to, and I'll find the best options!",
            "Namaste! 🙏 I'm ChatWave, your smart travel companion. Where are you headed today?",
        ];

        this.goodbyes = [
            "Safe travels! 🌊 Feel free to chat anytime you need travel help. Bye!",
            "Goodbye! Have a wonderful journey! 🚂✨",
            "Take care! Come back whenever you need to plan another trip. 👋",
        ];

        this.thanks = [
            "You're welcome! 😊 Let me know if you need anything else for your trip.",
            "Happy to help! 🌟 Have a great journey!",
            "My pleasure! Feel free to ask if you have more travel questions. 🚌🚂",
        ];

        this.helpMessages = [
            `I can help you with:
🔍 **Finding routes** — "Find a train from Mumbai to Pune tomorrow"
🚂 **Train schedules** — "What trains go to Delhi?"
🚌 **Bus options** — "Show me buses from Bangalore to Chennai"
💰 **Price comparison** — "What's the cheapest way to get to Goa?"
⚡ **Quick search** — "Mumbai to Pune tomorrow morning by train"

Just type naturally — I understand conversational language! Try something like:
• "I want to go from Mumbai to Pune tomorrow morning"
• "Find buses to Chennai from Bangalore"
• "What's the fastest train to Delhi?"`,
        ];
    }

    generateGreeting() {
        return this.greetings[Math.floor(Math.random() * this.greetings.length)];
    }

    generateGoodbye() {
        return this.goodbyes[Math.floor(Math.random() * this.goodbyes.length)];
    }

    generateThanks() {
        return this.thanks[Math.floor(Math.random() * this.thanks.length)];
    }

    generateHelp() {
        return this.helpMessages[0];
    }

    generateMissingInfo(missing, entities) {
        if (missing.includes('origin') && missing.includes('destination')) {
            return "I'd love to help you plan your trip! 🗺️ Where are you traveling **from** and **to**?";
        }
        if (missing.includes('origin')) {
            return `Great, you want to go to **${entities.destination}**! Where will you be starting from?`;
        }
        if (missing.includes('destination')) {
            return `Got it, you're starting from **${entities.origin}**! Where would you like to go?`;
        }
        return "Could you tell me more about your travel plans?";
    }

    generateRouteResults(routes, entities) {
        if (!routes || routes.length === 0) {
            return this.generateNoResults(entities);
        }

        const { origin, destination, mode, date } = entities;
        const dateStr = date ? ` on **${formatDate(date)}**` : '';
        const modeStr = mode && mode !== 'any' ? ` by **${mode}**` : '';

        let response = `🎯 Found **${routes.length} route${routes.length > 1 ? 's' : ''}** from **${origin}** to **${destination}**${modeStr}${dateStr}:\n\n`;

        routes.forEach((route, index) => {
            const modeIcon = route.mode === 'train' ? '🚂' : '🚌';
            const duration = formatDuration(route.duration_minutes);

            response += `**${index + 1}. ${modeIcon} ${route.route_name}** — ${route.operator}\n`;
            response += `   ⏱️ Duration: ${duration} | 💰 ₹${route.base_price}\n`;

            if (route.schedules && route.schedules.length > 0) {
                const scheduleStr = route.schedules.map(s =>
                    `${s.departure_time} → ${s.arrival_time}${s.platform ? ` (Platform ${s.platform})` : ''}`
                ).join(' | ');
                response += `   🕐 Departures: ${scheduleStr}\n`;
            }

            if (route.distance_km) {
                response += `   📏 Distance: ${route.distance_km} km\n`;
            }
            response += '\n';
        });

        // Add recommendation
        const cheapest = routes.reduce((a, b) => a.base_price < b.base_price ? a : b);
        const fastest = routes.reduce((a, b) => a.duration_minutes < b.duration_minutes ? a : b);

        response += '---\n';
        response += `💡 **Recommendation:** `;

        if (cheapest.id === fastest.id) {
            response += `**${cheapest.route_name}** is both the cheapest (₹${cheapest.base_price}) and fastest (${formatDuration(cheapest.duration_minutes)})!`;
        } else {
            response += `Cheapest: **${cheapest.route_name}** at ₹${cheapest.base_price} | Fastest: **${fastest.route_name}** in ${formatDuration(fastest.duration_minutes)}`;
        }

        response += '\n\nWould you like more details about any route, or want to search for a different trip?';

        return response;
    }

    generateNoResults(entities) {
        const { origin, destination, mode } = entities;
        let response = `😔 I couldn't find any direct routes from **${origin || 'your origin'}** to **${destination || 'your destination'}**`;
        if (mode && mode !== 'any') response += ` by ${mode}`;
        response += '.\n\n';
        response += 'Here are some suggestions:\n';
        response += '• Try searching without specifying a transport mode\n';
        response += '• Check if the city names are correct\n';
        response += '• Look for routes to nearby cities\n\n';
        response += 'Available cities: Mumbai, Delhi, Pune, Bangalore, Chennai, Hyderabad, Kolkata, Jaipur, Ahmedabad, Goa, Lucknow';
        return response;
    }

    generateUnknown() {
        const responses = [
            "I'm not sure I understood that. Could you rephrase? I'm great at finding bus and train routes! Try: \"Find a train from Mumbai to Pune\"",
            "Hmm, I didn't quite catch that. 🤔 Tell me where you'd like to travel, and I'll find the best routes for you!",
            "I specialize in travel planning! Try asking me something like \"What buses go from Delhi to Jaipur tomorrow?\"",
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
}

export { formatDuration, formatDate };
