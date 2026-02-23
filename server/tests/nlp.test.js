import { describe, it, expect } from 'vitest';
import {
    extractEntities,
    detectIntent,
    ConversationContext,
    ResponseGenerator,
    INTENTS,
    formatDuration,
} from '../src/nlp/engine.js';

// ============================================================================
// INTENT DETECTION TESTS
// ============================================================================

describe('Intent Detection', () => {
    it('should detect greeting intent', () => {
        const { intent } = detectIntent('Hello!');
        expect(intent).toBe(INTENTS.GREETING);
    });

    it('should detect greeting with "hi"', () => {
        const { intent } = detectIntent('Hi there');
        expect(intent).toBe(INTENTS.GREETING);
    });

    it('should detect goodbye intent', () => {
        const { intent } = detectIntent('Bye, see you later');
        expect(intent).toBe(INTENTS.GOODBYE);
    });

    it('should detect help intent', () => {
        const { intent } = detectIntent('What can you do?');
        expect(intent).toBe(INTENTS.HELP);
    });

    it('should detect thanks intent', () => {
        const { intent } = detectIntent('Thank you so much!');
        expect(intent).toBe(INTENTS.THANKS);
    });

    it('should detect travel search intent', () => {
        const entities = extractEntities('I want to go from Mumbai to Pune');
        const { intent } = detectIntent('I want to go from Mumbai to Pune', entities);
        expect(intent).toBe(INTENTS.TRAVEL_SEARCH);
    });

    it('should detect travel search with route entities', () => {
        const entities = { origin: 'Mumbai', destination: 'Pune' };
        const { intent } = detectIntent('Find trains', entities);
        expect(intent).toBe(INTENTS.TRAVEL_SEARCH);
    });

    it('should detect price query intent', () => {
        const { intent } = detectIntent('How much does it cost?');
        expect(intent).toBe(INTENTS.PRICE_QUERY);
    });

    it('should detect compare routes intent', () => {
        const { intent } = detectIntent('Compare the options');
        expect(intent).toBe(INTENTS.COMPARE_ROUTES);
    });

    it('should detect select route intent', () => {
        const { intent } = detectIntent("I'll take option 2");
        expect(intent).toBe(INTENTS.SELECT_ROUTE);
    });

    it('should return unknown for gibberish', () => {
        const { intent } = detectIntent('asdfghjkl');
        expect(intent).toBe(INTENTS.UNKNOWN);
    });
});

// ============================================================================
// ENTITY EXTRACTION TESTS
// ============================================================================

describe('Entity Extraction', () => {
    describe('Location Extraction', () => {
        it('should extract "from X to Y" pattern', () => {
            const entities = extractEntities('I want to go from Mumbai to Pune');
            expect(entities.origin).toBe('Mumbai');
            expect(entities.destination).toBe('Pune');
        });

        it('should extract "X to Y" pattern', () => {
            const entities = extractEntities('Mumbai to Delhi');
            expect(entities.origin).toBe('Mumbai');
            expect(entities.destination).toBe('Delhi');
        });

        it('should handle city aliases', () => {
            const entities = extractEntities('Bombay to Poona');
            expect(entities.origin).toBe('Mumbai');
            expect(entities.destination).toBe('Pune');
        });

        it('should handle Bangalore/Bengaluru alias', () => {
            const entities = extractEntities('Bengaluru to Chennai');
            expect(entities.origin).toBe('Bangalore');
            expect(entities.destination).toBe('Chennai');
        });

        it('should handle partial "go to Y"', () => {
            const entities = extractEntities('I want to travel to Pune');
            expect(entities.destination).toBe('Pune');
        });
    });

    describe('Transport Mode Extraction', () => {
        it('should extract train mode', () => {
            const entities = extractEntities('Find a train from Mumbai to Pune');
            expect(entities.mode).toBe('train');
        });

        it('should extract bus mode', () => {
            const entities = extractEntities('Show me buses from Delhi to Jaipur');
            expect(entities.mode).toBe('bus');
        });

        it('should not set mode if not specified', () => {
            const entities = extractEntities('Mumbai to Delhi');
            expect(entities.mode).toBeUndefined();
        });
    });

    describe('Date Extraction', () => {
        it('should extract "tomorrow"', () => {
            const entities = extractEntities('Travel tomorrow from Mumbai to Pune');
            expect(entities.date).toBeDefined();

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            expect(entities.date).toBe(tomorrow.toISOString().split('T')[0]);
        });

        it('should extract "today"', () => {
            const entities = extractEntities('Go to Delhi today');
            const today = new Date().toISOString().split('T')[0];
            expect(entities.date).toBe(today);
        });
    });

    describe('Time Extraction', () => {
        it('should extract "morning" preference', () => {
            const entities = extractEntities('Train to Pune tomorrow morning');
            expect(entities.timePreference).toBeDefined();
            expect(entities.timePreference.label).toBe('morning');
        });

        it('should extract "evening" preference', () => {
            const entities = extractEntities('bus in the evening');
            expect(entities.timePreference).toBeDefined();
            expect(entities.timePreference.label).toBe('evening');
        });
    });

    describe('Budget Extraction', () => {
        it('should extract budget preference', () => {
            const entities = extractEntities('Find a cheap bus to Pune');
            expect(entities.budgetPreference).toBe('budget');
        });

        it('should extract premium preference', () => {
            const entities = extractEntities('I want the best luxury option');
            expect(entities.budgetPreference).toBe('premium');
        });
    });

    describe('Context Merging', () => {
        it('should merge with existing context', () => {
            const context = { origin: 'Mumbai' };
            const entities = extractEntities('travel to Pune tomorrow', context);
            expect(entities.origin).toBe('Mumbai');
            expect(entities.destination).toBe('Pune');
        });

        it('should override context with new values', () => {
            const context = { origin: 'Mumbai', destination: 'Delhi' };
            const entities = extractEntities('travel to Pune', context);
            expect(entities.destination).toBe('Pune');
            expect(entities.origin).toBe('Mumbai'); // Preserved from context
        });
    });
});

// ============================================================================
// CONVERSATION CONTEXT TESTS
// ============================================================================

describe('ConversationContext', () => {
    it('should create and retrieve context', () => {
        const ctx = new ConversationContext();
        const sessionCtx = ctx.getContext('test-123');
        expect(sessionCtx).toBeDefined();
        expect(sessionCtx.entities).toEqual({});
        expect(sessionCtx.turnCount).toBe(0);
    });

    it('should track missing entities', () => {
        const ctx = new ConversationContext();
        const missing = ctx.getMissingEntities('test-456');
        expect(missing).toContain('origin');
        expect(missing).toContain('destination');
    });

    it('should update context and increment turn count', () => {
        const ctx = new ConversationContext();
        ctx.updateContext('test-789', {
            entities: { origin: 'Mumbai' },
            lastIntent: INTENTS.TRAVEL_SEARCH,
        });

        const sessionCtx = ctx.getContext('test-789');
        expect(sessionCtx.entities.origin).toBe('Mumbai');
        expect(sessionCtx.turnCount).toBe(1);
    });

    it('should clear context', () => {
        const ctx = new ConversationContext();
        ctx.updateContext('test-clear', { entities: { origin: 'Delhi' } });
        ctx.clearContext('test-clear');

        const sessionCtx = ctx.getContext('test-clear');
        expect(sessionCtx.entities).toEqual({});
    });
});

// ============================================================================
// RESPONSE GENERATOR TESTS
// ============================================================================

describe('ResponseGenerator', () => {
    const gen = new ResponseGenerator();

    it('should generate greeting', () => {
        const response = gen.generateGreeting();
        expect(response).toBeTruthy();
        expect(typeof response).toBe('string');
    });

    it('should generate help message with examples', () => {
        const response = gen.generateHelp();
        expect(response).toContain('Finding routes');
        expect(response).toContain('Train schedules');
    });

    it('should generate missing info prompt for origin', () => {
        const response = gen.generateMissingInfo(['origin'], { destination: 'Pune' });
        expect(response).toContain('Pune');
        expect(response).toContain('starting from');
    });

    it('should generate missing info prompt for destination', () => {
        const response = gen.generateMissingInfo(['destination'], { origin: 'Mumbai' });
        expect(response).toContain('Mumbai');
    });

    it('should generate route results with routes', () => {
        const routes = [
            {
                id: '1', mode: 'train', operator: 'Indian Railways', route_name: 'Express',
                base_price: 350, duration_minutes: 195, distance_km: 192,
                schedules: [{ departure_time: '07:00', arrival_time: '10:15' }]
            },
            {
                id: '2', mode: 'bus', operator: 'MSRTC', route_name: 'Shivneri',
                base_price: 450, duration_minutes: 210,
                schedules: [{ departure_time: '08:00', arrival_time: '11:30' }]
            },
        ];
        const entities = { origin: 'Mumbai', destination: 'Pune' };
        const response = gen.generateRouteResults(routes, entities);

        expect(response).toContain('Mumbai');
        expect(response).toContain('Pune');
        expect(response).toContain('Express');
        expect(response).toContain('₹350');
    });

    it('should generate no results message', () => {
        const response = gen.generateNoResults({ origin: 'CityA', destination: 'CityB' });
        expect(response).toContain('CityA');
        expect(response).toContain('CityB');
    });
});

// ============================================================================
// UTILITY TESTS
// ============================================================================

describe('Utility Functions', () => {
    it('should format duration correctly', () => {
        expect(formatDuration(195)).toBe('3h 15min');
        expect(formatDuration(60)).toBe('1h');
        expect(formatDuration(45)).toBe('45min');
        expect(formatDuration(0)).toBe('0min');
    });
});
