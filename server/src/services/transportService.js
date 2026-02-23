import { queryAll, queryOne, runSql } from '../database/init.js';

/**
 * Transport Service
 * =================
 * Handles querying the database for routes, stations, and schedules.
 * Uses the sql.js helper functions (queryAll, queryOne, runSql).
 */

export class TransportService {
    /**
     * Search for routes between two cities.
     * @param {string} origin - Origin city name
     * @param {string} destination - Destination city name
     * @param {string} mode - 'bus', 'train', or 'any'
     * @param {object} options - Additional filter options
     * @returns {Array} Matching routes with schedules
     */
    searchRoutes(origin, destination, mode = 'any', options = {}) {
        let sql = `
      SELECT 
        r.id, r.mode, r.operator, r.route_name, r.base_price, 
        r.duration_minutes, r.distance_km, r.frequency,
        so.name as origin_station, so.code as origin_code, so.city as origin_city,
        sd.name as dest_station, sd.code as dest_code, sd.city as dest_city
      FROM routes r
      JOIN stations so ON r.origin_id = so.id
      JOIN stations sd ON r.destination_id = sd.id
      WHERE LOWER(so.city) = LOWER(?) AND LOWER(sd.city) = LOWER(?)
    `;

        const params = [origin, destination];

        if (mode && mode !== 'any') {
            sql += ' AND r.mode = ?';
            params.push(mode);
        }

        sql += ' ORDER BY r.base_price ASC';

        const routes = queryAll(sql, params);

        // Attach schedules to each route
        for (const route of routes) {
            route.schedules = queryAll(
                'SELECT id, departure_time, arrival_time, days_of_week, platform FROM schedules WHERE route_id = ? AND is_active = 1 ORDER BY departure_time ASC',
                [route.id]
            );

            // Filter by time preference if provided
            if (options.timePreference) {
                route.schedules = this.filterByTime(route.schedules, options.timePreference);
            }

            // Filter by day of week if date provided
            if (options.date) {
                const dayOfWeek = new Date(options.date).getDay();
                route.schedules = route.schedules.filter(s =>
                    s.days_of_week.split(',').map(Number).includes(dayOfWeek)
                );
            }
        }

        // Apply budget preference sorting
        if (options.budgetPreference === 'budget') {
            routes.sort((a, b) => a.base_price - b.base_price);
        } else if (options.budgetPreference === 'premium') {
            routes.sort((a, b) => b.base_price - a.base_price);
        }

        return routes;
    }

    /**
     * Filter schedules by time preference.
     */
    filterByTime(schedules, timePreference) {
        if (!timePreference || !timePreference.start) return schedules;

        return schedules.filter(s => {
            const depHour = parseInt(s.departure_time.split(':')[0]);
            const startHour = parseInt(timePreference.start.split(':')[0]);
            const endHour = timePreference.end ? parseInt(timePreference.end.split(':')[0]) : 23;

            if (startHour <= endHour) {
                return depHour >= startHour && depHour <= endHour;
            } else {
                return depHour >= startHour || depHour <= endHour;
            }
        });
    }

    /**
     * Get all stations, optionally filtered by city or type.
     */
    getStations(filters = {}) {
        let sql = 'SELECT * FROM stations WHERE 1=1';
        const params = [];

        if (filters.city) {
            sql += ' AND LOWER(city) = LOWER(?)';
            params.push(filters.city);
        }

        if (filters.type) {
            sql += ' AND (type = ? OR type = ?)';
            params.push(filters.type, 'both');
        }

        sql += ' ORDER BY city, name';
        return queryAll(sql, params);
    }

    /**
     * Get available cities from the database.
     */
    getAvailableCities() {
        const result = queryAll('SELECT DISTINCT city FROM stations ORDER BY city');
        return result.map(r => r.city);
    }

    /**
     * Search for a specific route by ID.
     */
    getRouteById(routeId) {
        const route = queryOne(
            `SELECT r.*, so.name as origin_station, sd.name as dest_station
       FROM routes r
       JOIN stations so ON r.origin_id = so.id
       JOIN stations sd ON r.destination_id = sd.id
       WHERE r.id = ?`,
            [routeId]
        );

        if (route) {
            route.schedules = queryAll(
                'SELECT * FROM schedules WHERE route_id = ? AND is_active = 1 ORDER BY departure_time',
                [routeId]
            );
        }

        return route;
    }
}
