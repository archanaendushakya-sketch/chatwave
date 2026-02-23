import { v4 as uuidv4 } from 'uuid';
import {
    extractEntities,
    detectIntent,
    ConversationContext,
    ResponseGenerator,
    INTENTS,
} from '../nlp/engine.js';
import { RoutePlanner } from './routePlanner.js';
import { queryAll, queryOne, runSql } from '../database/init.js';

/**
 * Chat Service
 * ============
 * Orchestrates the conversation flow:
 * 1. Receives user messages
 * 2. Runs NLP processing (intent + entity extraction)
 * 3. Manages conversation context
 * 4. Calls the route planner when ready
 * 5. Returns formatted responses
 */

export class ChatService {
    constructor() {
        this.context = new ConversationContext();
        this.responseGen = new ResponseGenerator();
        this.routePlanner = new RoutePlanner();
    }

    async processMessage(sessionId, message) {
        const ctx = this.context.getContext(sessionId);
        const entities = extractEntities(message, ctx.entities);
        const { intent, confidence } = detectIntent(message, entities);

        this.context.updateContext(sessionId, {
            entities,
            lastIntent: intent,
            message: { role: 'user', content: message, timestamp: new Date().toISOString() },
        });

        let response;
        let metadata = { intent, confidence, entities: { ...entities } };

        switch (intent) {
            case INTENTS.GREETING:
                response = this.responseGen.generateGreeting();
                this.context.updateContext(sessionId, { state: 'idle' });
                break;

            case INTENTS.HELP:
                response = this.responseGen.generateHelp();
                break;

            case INTENTS.GOODBYE:
                response = this.responseGen.generateGoodbye();
                this.context.clearContext(sessionId);
                break;

            case INTENTS.THANKS:
                response = this.responseGen.generateThanks();
                break;

            case INTENTS.TRAVEL_SEARCH:
            case INTENTS.SCHEDULE_QUERY:
            case INTENTS.PRICE_QUERY:
                response = await this.handleTravelQuery(sessionId, entities, intent);
                metadata.routes = this.context.getContext(sessionId).lastRoutes;
                break;

            case INTENTS.COMPARE_ROUTES:
                response = await this.handleCompareRoutes(sessionId, entities);
                break;

            case INTENTS.ROUTE_PREFERENCE:
                response = await this.handlePreference(sessionId, entities);
                break;

            case INTENTS.SELECT_ROUTE:
                response = this.handleRouteSelection(sessionId, message);
                break;

            default:
                if (entities.origin && entities.destination) {
                    response = await this.handleTravelQuery(sessionId, entities, INTENTS.TRAVEL_SEARCH);
                    metadata.routes = this.context.getContext(sessionId).lastRoutes;
                } else {
                    response = this.responseGen.generateUnknown();
                }
        }

        this.context.updateContext(sessionId, {
            message: { role: 'assistant', content: response, timestamp: new Date().toISOString() },
        });

        this.saveMessage(sessionId, 'user', message, metadata);
        this.saveMessage(sessionId, 'assistant', response, {});

        return { text: response, metadata, sessionId };
    }

    async handleTravelQuery(sessionId, entities, intent) {
        const missing = this.context.getMissingEntities(sessionId);

        if (missing.length > 0) {
            this.context.updateContext(sessionId, { state: 'collecting_info' });
            return this.responseGen.generateMissingInfo(missing, entities);
        }

        this.context.updateContext(sessionId, { state: 'showing_results' });
        const result = await this.routePlanner.planRoutes(entities);
        this.context.updateContext(sessionId, { lastRoutes: result.routes });
        return this.responseGen.generateRouteResults(result.routes, entities);
    }

    async handleCompareRoutes(sessionId, entities) {
        const ctx = this.context.getContext(sessionId);

        if (ctx.lastRoutes && ctx.lastRoutes.length > 0) {
            return this.generateComparison(ctx.lastRoutes);
        }

        if (entities.origin && entities.destination) {
            return await this.handleTravelQuery(sessionId, entities, INTENTS.COMPARE_ROUTES);
        }

        return "I don't have any routes to compare yet. Tell me where you'd like to go, and I'll find options to compare!";
    }

    generateComparison(routes) {
        if (routes.length < 2) {
            return "I only found one route, so there's nothing to compare. Would you like to search for a different trip?";
        }

        let response = '📊 **Route Comparison:**\n\n';
        response += '| # | Route | Mode | Price | Duration | Departures |\n';
        response += '|---|-------|------|-------|----------|------------|\n';

        routes.forEach((route, i) => {
            const icon = route.mode === 'train' ? '🚂' : '🚌';
            const dur = `${Math.floor(route.duration_minutes / 60)}h ${route.duration_minutes % 60}m`;
            const deps = route.schedules?.length || 0;
            response += `| ${i + 1} | ${icon} ${route.route_name} | ${route.mode} | ₹${route.base_price} | ${dur} | ${deps}/day |\n`;
        });

        response += '\nWhich option interests you? Or would you like me to recommend the best one?';
        return response;
    }

    async handlePreference(sessionId, entities) {
        const ctx = this.context.getContext(sessionId);

        if (entities.origin && entities.destination) {
            return await this.handleTravelQuery(sessionId, entities, INTENTS.TRAVEL_SEARCH);
        }

        let response = "Got it! I've noted your preferences";
        const prefs = [];
        if (entities.mode) prefs.push(`transport: ${entities.mode}`);
        if (entities.budgetPreference) prefs.push(`budget: ${entities.budgetPreference}`);
        if (entities.seatClass) prefs.push(`class: ${entities.seatClass}`);

        if (prefs.length > 0) response += ` (${prefs.join(', ')})`;
        response += '. Now tell me where you\'d like to travel!';
        return response;
    }

    handleRouteSelection(sessionId, message) {
        const ctx = this.context.getContext(sessionId);

        if (!ctx.lastRoutes || ctx.lastRoutes.length === 0) {
            return "I don't have any routes to select from. Would you like to search for a trip?";
        }

        const numMatch = message.match(/(\d+)/);
        if (numMatch) {
            const idx = parseInt(numMatch[1]) - 1;
            if (idx >= 0 && idx < ctx.lastRoutes.length) {
                const route = ctx.lastRoutes[idx];
                const icon = route.mode === 'train' ? '🚂' : '🚌';
                let response = `Great choice! Here are the details for **${route.route_name}** ${icon}:\n\n`;
                response += `📍 **Route:** ${route.origin_station} → ${route.dest_station}\n`;
                response += `🏢 **Operator:** ${route.operator}\n`;
                response += `💰 **Price:** ₹${route.base_price}\n`;
                response += `⏱️ **Duration:** ${Math.floor(route.duration_minutes / 60)}h ${route.duration_minutes % 60}m\n`;
                if (route.distance_km) response += `📏 **Distance:** ${route.distance_km} km\n`;

                if (route.schedules && route.schedules.length > 0) {
                    response += `\n🕐 **Available Departures:**\n`;
                    route.schedules.forEach(s => {
                        response += `   • ${s.departure_time} → ${s.arrival_time}`;
                        if (s.platform) response += ` (Platform ${s.platform})`;
                        response += '\n';
                    });
                }

                response += '\n✨ Would you like to plan another trip or need any other help?';
                return response;
            }
        }

        return `Please select a valid option (1-${ctx.lastRoutes.length}). Which route would you like?`;
    }

    saveMessage(sessionId, role, content, metadata = {}) {
        try {
            const session = queryOne('SELECT id FROM sessions WHERE id = ?', [sessionId]);
            if (!session) {
                runSql('INSERT INTO sessions (id, title) VALUES (?, ?)', [sessionId, 'Travel Planning']);
            }

            runSql(
                'INSERT INTO messages (id, session_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)',
                [uuidv4(), sessionId, role, content, JSON.stringify(metadata)]
            );
        } catch (error) {
            console.error('Failed to save message:', error.message);
        }
    }

    getHistory(sessionId) {
        return queryAll(
            'SELECT id, role, content, metadata, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC',
            [sessionId]
        );
    }

    getSessions(userId) {
        return queryAll(
            `SELECT s.*, 
        (SELECT COUNT(*) FROM messages WHERE session_id = s.id) as message_count
       FROM sessions s
       WHERE s.user_id = ? OR s.user_id IS NULL
       ORDER BY s.updated_at DESC`,
            [userId || 'anonymous']
        );
    }

    createSession(userId, title = 'New Trip Planning') {
        const id = uuidv4();
        runSql('INSERT INTO sessions (id, user_id, title) VALUES (?, ?, ?)', [id, userId || null, title]);
        return { id, title };
    }
}
