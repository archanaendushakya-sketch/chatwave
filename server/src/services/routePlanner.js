import { TransportService } from './transportService.js';

/**
 * Route Planner Service
 * =====================
 * Implements the route comparison algorithm, travel optimization logic,
 * and recommendation strategy.
 * 
 * Decision Rules:
 * 1. Budget preference → sort by price
 * 2. Premium preference → sort by comfort (price descending, as higher price = better class) 
 * 3. Time preference → filter and sort by departure time proximity
 * 4. Default (balanced) → multi-factor score combining price, duration, and convenience
 */

export class RoutePlanner {
    constructor() {
        this.transportService = new TransportService();
    }

    /**
     * Plan routes based on extracted entities.
     * This is the main entry point for the route planning engine.
     */
    async planRoutes(entities) {
        const { origin, destination, mode, date, timePreference, budgetPreference } = entities;

        if (!origin || !destination) {
            return { routes: [], error: 'Origin and destination are required' };
        }

        // Search for matching routes
        let routes = this.transportService.searchRoutes(origin, destination, mode || 'any', {
            timePreference,
            date,
            budgetPreference,
        });

        // Score and rank routes
        routes = this.scoreRoutes(routes, entities);

        // Sort by score (descending — higher is better)
        routes.sort((a, b) => b._score - a._score);

        // Add recommendations
        const recommendations = this.generateRecommendations(routes, entities);

        return {
            routes,
            recommendations,
            meta: {
                origin,
                destination,
                mode: mode || 'any',
                date,
                totalResults: routes.length,
            },
        };
    }

    /**
     * Score routes using a multi-factor algorithm.
     * 
     * Factors:
     * - Price (lower is better) - weight: 0.3
     * - Duration (shorter is better) - weight: 0.3
     * - Schedule convenience (more departures is better) - weight: 0.2
     * - Operator reputation (hardcoded rankings) - weight: 0.2
     */
    scoreRoutes(routes, entities) {
        if (routes.length === 0) return routes;

        // Find min/max for normalization
        const prices = routes.map(r => r.base_price);
        const durations = routes.map(r => r.duration_minutes);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);

        // Determine weights based on user preference
        let weights = { price: 0.3, duration: 0.3, schedule: 0.2, operator: 0.2 };

        if (entities.budgetPreference === 'budget') {
            weights = { price: 0.5, duration: 0.25, schedule: 0.15, operator: 0.1 };
        } else if (entities.budgetPreference === 'premium') {
            weights = { price: 0.1, duration: 0.3, schedule: 0.2, operator: 0.4 };
        }

        for (const route of routes) {
            // Normalize price (0-1, lower is better → inverted)
            const priceScore = maxPrice === minPrice ? 1 :
                1 - (route.base_price - minPrice) / (maxPrice - minPrice);

            // Normalize duration (0-1, shorter is better → inverted)
            const durationScore = maxDuration === minDuration ? 1 :
                1 - (route.duration_minutes - minDuration) / (maxDuration - minDuration);

            // Schedule score (more departures = more convenient)
            const scheduleCount = route.schedules?.length || 0;
            const scheduleScore = Math.min(scheduleCount / 5, 1); // Cap at 5 departures

            // Operator score (based on known quality)
            const operatorScore = this.getOperatorScore(route.operator);

            // Calculate weighted score
            route._score = (
                weights.price * priceScore +
                weights.duration * durationScore +
                weights.schedule * scheduleScore +
                weights.operator * operatorScore
            );

            // Add tags
            route._tags = [];
            if (route.base_price === minPrice) route._tags.push('cheapest');
            if (route.duration_minutes === minDuration) route._tags.push('fastest');
            if (scheduleCount >= 4) route._tags.push('frequent');
        }

        return routes;
    }

    /**
     * Operator reputation scoring.
     * Based on general reputation for service quality.
     */
    getOperatorScore(operator) {
        const scores = {
            'Indian Railways': 0.85,
            'MSRTC': 0.7,
            'RSRTC': 0.65,
            'KSRTC': 0.75,
            'APSRTC': 0.7,
            'UPSRTC': 0.6,
            'Neeta Travels': 0.8,
            'Paulo Travels': 0.85,
            'VRL Travels': 0.8,
            'Eagle Travels': 0.7,
            'Orange Travels': 0.75,
        };
        return scores[operator] || 0.5;
    }

    /**
     * Generate smart recommendations.
     */
    generateRecommendations(routes, entities) {
        if (routes.length === 0) return [];

        const recommendations = [];

        const cheapest = routes.reduce((a, b) => a.base_price < b.base_price ? a : b);
        const fastest = routes.reduce((a, b) => a.duration_minutes < b.duration_minutes ? a : b);
        const bestScored = routes[0]; // Already sorted by score

        if (cheapest.id !== fastest.id) {
            recommendations.push({
                type: 'cheapest',
                routeId: cheapest.id,
                text: `💰 Save money with **${cheapest.route_name}** — only ₹${cheapest.base_price}`,
            });
            recommendations.push({
                type: 'fastest',
                routeId: fastest.id,
                text: `⚡ Get there fastest with **${fastest.route_name}** — ${formatDurationShort(fastest.duration_minutes)}`,
            });
        }

        if (bestScored.id !== cheapest.id && bestScored.id !== fastest.id) {
            recommendations.push({
                type: 'best_value',
                routeId: bestScored.id,
                text: `🌟 Best overall: **${bestScored.route_name}** — great balance of price, speed, and comfort`,
            });
        }

        // Time-specific recommendations
        if (entities.timePreference) {
            const matching = routes.filter(r =>
                r.schedules && r.schedules.length > 0
            );
            if (matching.length > 0) {
                recommendations.push({
                    type: 'time_match',
                    text: `🕐 ${matching.length} route(s) available for ${entities.timePreference.label} departure`,
                });
            }
        }

        return recommendations;
    }
}

function formatDurationShort(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}
