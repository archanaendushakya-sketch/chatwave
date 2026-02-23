import { getDb, queryAll, queryOne, runSql, saveDatabase } from './init.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed the database with realistic Indian transport data.
 */
export function seedDatabase() {
    const db = getDb();

    const stationCount = queryOne('SELECT COUNT(*) as count FROM stations');
    if (stationCount && stationCount.count > 0) {
        console.log('  Database already seeded. Skipping...');
        return;
    }

    console.log('  🌱 Seeding database with transport data...');

    const stations = [
        { id: uuidv4(), name: 'Mumbai Central', city: 'Mumbai', state: 'Maharashtra', type: 'both', latitude: 18.9712, longitude: 72.8196, code: 'BCT' },
        { id: uuidv4(), name: 'Chhatrapati Shivaji Terminus', city: 'Mumbai', state: 'Maharashtra', type: 'train', latitude: 18.9402, longitude: 72.8356, code: 'CSMT' },
        { id: uuidv4(), name: 'Mumbai Bus Terminal', city: 'Mumbai', state: 'Maharashtra', type: 'bus', latitude: 19.0760, longitude: 72.8777, code: 'MBT' },

        { id: uuidv4(), name: 'New Delhi Railway Station', city: 'Delhi', state: 'Delhi', type: 'train', latitude: 28.6424, longitude: 77.2195, code: 'NDLS' },
        { id: uuidv4(), name: 'Delhi ISBT Kashmere Gate', city: 'Delhi', state: 'Delhi', type: 'bus', latitude: 28.6671, longitude: 77.2284, code: 'DKGB' },
        { id: uuidv4(), name: 'Hazrat Nizamuddin', city: 'Delhi', state: 'Delhi', type: 'train', latitude: 28.5892, longitude: 77.2509, code: 'NZM' },

        { id: uuidv4(), name: 'Pune Junction', city: 'Pune', state: 'Maharashtra', type: 'train', latitude: 18.5285, longitude: 73.8742, code: 'PUNE' },
        { id: uuidv4(), name: 'Pune Swargate Bus Stand', city: 'Pune', state: 'Maharashtra', type: 'bus', latitude: 18.5018, longitude: 73.8636, code: 'PSWG' },

        { id: uuidv4(), name: 'Bangalore City Junction', city: 'Bangalore', state: 'Karnataka', type: 'train', latitude: 12.9784, longitude: 77.5716, code: 'SBC' },
        { id: uuidv4(), name: 'Majestic Bus Station', city: 'Bangalore', state: 'Karnataka', type: 'bus', latitude: 12.9772, longitude: 77.5722, code: 'BMBS' },

        { id: uuidv4(), name: 'Chennai Central', city: 'Chennai', state: 'Tamil Nadu', type: 'train', latitude: 13.0827, longitude: 80.2707, code: 'MAS' },
        { id: uuidv4(), name: 'Chennai CMBT', city: 'Chennai', state: 'Tamil Nadu', type: 'bus', latitude: 13.0694, longitude: 80.2029, code: 'CMBT' },

        { id: uuidv4(), name: 'Secunderabad Junction', city: 'Hyderabad', state: 'Telangana', type: 'train', latitude: 17.4340, longitude: 78.5015, code: 'SC' },
        { id: uuidv4(), name: 'Hyderabad MGBS', city: 'Hyderabad', state: 'Telangana', type: 'bus', latitude: 17.3782, longitude: 78.4860, code: 'MGBS' },

        { id: uuidv4(), name: 'Howrah Junction', city: 'Kolkata', state: 'West Bengal', type: 'train', latitude: 22.5839, longitude: 88.3428, code: 'HWH' },
        { id: uuidv4(), name: 'Esplanade Bus Stand', city: 'Kolkata', state: 'West Bengal', type: 'bus', latitude: 22.5626, longitude: 88.3520, code: 'KEBS' },

        { id: uuidv4(), name: 'Jaipur Junction', city: 'Jaipur', state: 'Rajasthan', type: 'train', latitude: 26.9194, longitude: 75.7880, code: 'JP' },
        { id: uuidv4(), name: 'Jaipur Sindhi Camp Bus Stand', city: 'Jaipur', state: 'Rajasthan', type: 'bus', latitude: 26.9211, longitude: 75.7935, code: 'JSCB' },

        { id: uuidv4(), name: 'Ahmedabad Junction', city: 'Ahmedabad', state: 'Gujarat', type: 'train', latitude: 23.0258, longitude: 72.6007, code: 'ADI' },
        { id: uuidv4(), name: 'Ahmedabad Central Bus Stand', city: 'Ahmedabad', state: 'Gujarat', type: 'bus', latitude: 23.0225, longitude: 72.5714, code: 'ACBS' },

        { id: uuidv4(), name: 'Madgaon Junction', city: 'Goa', state: 'Goa', type: 'train', latitude: 15.2993, longitude: 74.0855, code: 'MAO' },
        { id: uuidv4(), name: 'Panaji Bus Stand', city: 'Goa', state: 'Goa', type: 'bus', latitude: 15.4989, longitude: 73.8278, code: 'GPBS' },

        { id: uuidv4(), name: 'Lucknow Charbagh', city: 'Lucknow', state: 'Uttar Pradesh', type: 'train', latitude: 26.8297, longitude: 80.9225, code: 'LKO' },
        { id: uuidv4(), name: 'Lucknow Alambagh Bus Stand', city: 'Lucknow', state: 'Uttar Pradesh', type: 'bus', latitude: 26.8240, longitude: 80.9163, code: 'LABS' },
    ];

    // Insert stations
    for (const s of stations) {
        runSql(
            'INSERT INTO stations (id, name, city, state, type, latitude, longitude, code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [s.id, s.name, s.city, s.state, s.type, s.latitude, s.longitude, s.code]
        );
    }

    // Build city-to-stations map
    const cityStations = {};
    for (const s of stations) {
        if (!cityStations[s.city]) cityStations[s.city] = {};
        if (!cityStations[s.city][s.type]) cityStations[s.city][s.type] = s;
        if (s.type === 'both') {
            cityStations[s.city]['bus'] = cityStations[s.city]['bus'] || s;
            cityStations[s.city]['train'] = cityStations[s.city]['train'] || s;
        }
    }

    const routeDefinitions = [
        {
            from: 'Mumbai', to: 'Pune', mode: 'train', operator: 'Indian Railways', name: 'Deccan Express', price: 350, duration: 195, distance: 192, schedules: [
                { dep: '07:00', arr: '10:15', platform: '3' },
                { dep: '12:30', arr: '15:45', platform: '5' },
                { dep: '17:00', arr: '20:15', platform: '2' },
            ]
        },
        {
            from: 'Mumbai', to: 'Pune', mode: 'train', operator: 'Indian Railways', name: 'Shatabdi Express', price: 650, duration: 165, distance: 192, schedules: [
                { dep: '06:25', arr: '09:10', platform: '1' },
                { dep: '14:00', arr: '16:45', platform: '4' },
            ]
        },
        {
            from: 'Mumbai', to: 'Pune', mode: 'bus', operator: 'MSRTC', name: 'Shivneri AC', price: 450, duration: 210, distance: 150, schedules: [
                { dep: '06:00', arr: '09:30' }, { dep: '08:00', arr: '11:30' },
                { dep: '10:00', arr: '13:30' }, { dep: '14:00', arr: '17:30' },
                { dep: '18:00', arr: '21:30' }, { dep: '22:00', arr: '01:30' },
            ]
        },
        {
            from: 'Mumbai', to: 'Pune', mode: 'bus', operator: 'Neeta Travels', name: 'Volvo AC Sleeper', price: 700, duration: 240, distance: 150, schedules: [
                { dep: '21:00', arr: '01:00' }, { dep: '23:00', arr: '03:00' },
            ]
        },

        {
            from: 'Delhi', to: 'Jaipur', mode: 'train', operator: 'Indian Railways', name: 'Ajmer Shatabdi', price: 755, duration: 275, distance: 308, schedules: [
                { dep: '06:05', arr: '10:40', platform: '6' },
                { dep: '16:55', arr: '21:30', platform: '3' },
            ]
        },
        {
            from: 'Delhi', to: 'Jaipur', mode: 'bus', operator: 'RSRTC', name: 'Volvo AC', price: 850, duration: 330, distance: 280, schedules: [
                { dep: '06:00', arr: '11:30' }, { dep: '14:00', arr: '19:30' },
                { dep: '22:00', arr: '03:30' },
            ]
        },

        {
            from: 'Bangalore', to: 'Chennai', mode: 'train', operator: 'Indian Railways', name: 'Brindavan Express', price: 260, duration: 305, distance: 362, schedules: [
                { dep: '07:50', arr: '12:55', platform: '1' },
                { dep: '14:20', arr: '19:25', platform: '4' },
            ]
        },
        {
            from: 'Bangalore', to: 'Chennai', mode: 'train', operator: 'Indian Railways', name: 'Shatabdi Express', price: 820, duration: 245, distance: 362, schedules: [
                { dep: '06:00', arr: '10:05', platform: '2' },
            ]
        },
        {
            from: 'Bangalore', to: 'Chennai', mode: 'bus', operator: 'KSRTC', name: 'Airavat Club Class', price: 950, duration: 360, distance: 350, schedules: [
                { dep: '07:00', arr: '13:00' }, { dep: '15:00', arr: '21:00' },
                { dep: '22:30', arr: '04:30' },
            ]
        },

        {
            from: 'Mumbai', to: 'Delhi', mode: 'train', operator: 'Indian Railways', name: 'Rajdhani Express', price: 2025, duration: 960, distance: 1384, schedules: [
                { dep: '16:35', arr: '08:35', platform: '1' },
            ]
        },
        {
            from: 'Mumbai', to: 'Delhi', mode: 'train', operator: 'Indian Railways', name: 'August Kranti Rajdhani', price: 1850, duration: 1035, distance: 1384, schedules: [
                { dep: '17:40', arr: '10:55', platform: '5' },
            ]
        },

        {
            from: 'Mumbai', to: 'Goa', mode: 'train', operator: 'Indian Railways', name: 'Konkan Kanya Express', price: 595, duration: 690, distance: 588, schedules: [
                { dep: '23:00', arr: '10:30', platform: '8' },
            ]
        },
        {
            from: 'Mumbai', to: 'Goa', mode: 'bus', operator: 'Paulo Travels', name: 'Volvo Multi-Axle', price: 1200, duration: 720, distance: 570, schedules: [
                { dep: '18:00', arr: '06:00' }, { dep: '20:00', arr: '08:00' },
            ]
        },

        {
            from: 'Hyderabad', to: 'Bangalore', mode: 'train', operator: 'Indian Railways', name: 'Kacheguda Express', price: 455, duration: 690, distance: 570, schedules: [
                { dep: '18:00', arr: '05:30', platform: '3' },
            ]
        },
        {
            from: 'Hyderabad', to: 'Bangalore', mode: 'bus', operator: 'APSRTC', name: 'Garuda Plus', price: 1100, duration: 600, distance: 560, schedules: [
                { dep: '20:00', arr: '06:00' }, { dep: '22:00', arr: '08:00' },
            ]
        },

        {
            from: 'Delhi', to: 'Lucknow', mode: 'train', operator: 'Indian Railways', name: 'Swarna Shatabdi', price: 950, duration: 390, distance: 511, schedules: [
                { dep: '06:10', arr: '12:40', platform: '2' },
            ]
        },
        {
            from: 'Delhi', to: 'Lucknow', mode: 'bus', operator: 'UPSRTC', name: 'AC Sleeper', price: 800, duration: 540, distance: 500, schedules: [
                { dep: '20:00', arr: '05:00' }, { dep: '22:00', arr: '07:00' },
            ]
        },

        {
            from: 'Pune', to: 'Bangalore', mode: 'train', operator: 'Indian Railways', name: 'Udyan Express', price: 680, duration: 1110, distance: 840, schedules: [
                { dep: '11:45', arr: '06:15', platform: '1' },
            ]
        },
        {
            from: 'Pune', to: 'Bangalore', mode: 'bus', operator: 'VRL Travels', name: 'Multi-Axle Volvo', price: 1400, duration: 780, distance: 830, schedules: [
                { dep: '17:00', arr: '06:00' }, { dep: '20:00', arr: '09:00' },
            ]
        },

        {
            from: 'Chennai', to: 'Hyderabad', mode: 'train', operator: 'Indian Railways', name: 'Charminar Express', price: 545, duration: 780, distance: 627, schedules: [
                { dep: '18:30', arr: '07:30', platform: '4' },
            ]
        },
        {
            from: 'Chennai', to: 'Hyderabad', mode: 'bus', operator: 'Orange Travels', name: 'AC Sleeper', price: 950, duration: 720, distance: 630, schedules: [
                { dep: '19:00', arr: '07:00' }, { dep: '21:00', arr: '09:00' },
            ]
        },

        {
            from: 'Ahmedabad', to: 'Mumbai', mode: 'train', operator: 'Indian Railways', name: 'Karnavati Express', price: 460, duration: 420, distance: 493, schedules: [
                { dep: '06:00', arr: '13:00', platform: '2' },
                { dep: '23:15', arr: '06:15', platform: '6' },
            ]
        },
        {
            from: 'Ahmedabad', to: 'Mumbai', mode: 'bus', operator: 'Eagle Travels', name: 'AC Sleeper', price: 750, duration: 480, distance: 525, schedules: [
                { dep: '20:00', arr: '04:00' }, { dep: '22:00', arr: '06:00' },
            ]
        },

        {
            from: 'Kolkata', to: 'Delhi', mode: 'train', operator: 'Indian Railways', name: 'Rajdhani Express', price: 2250, duration: 1020, distance: 1447, schedules: [
                { dep: '16:50', arr: '09:50', platform: '9' },
            ]
        },
    ];

    for (const rd of routeDefinitions) {
        const originStation = cityStations[rd.from]?.[rd.mode] || cityStations[rd.from]?.['both'];
        const destStation = cityStations[rd.to]?.[rd.mode] || cityStations[rd.to]?.['both'];

        if (!originStation || !destStation) {
            console.warn(`  Skipping route ${rd.from} -> ${rd.to}: station not found`);
            continue;
        }

        const routeId = uuidv4();
        runSql(
            'INSERT INTO routes (id, origin_id, destination_id, mode, operator, route_name, base_price, duration_minutes, distance_km, frequency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [routeId, originStation.id, destStation.id, rd.mode, rd.operator, rd.name, rd.price, rd.duration, rd.distance, 'daily']
        );

        for (const s of rd.schedules) {
            runSql(
                'INSERT INTO schedules (id, route_id, departure_time, arrival_time, days_of_week, is_active, platform) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [uuidv4(), routeId, s.dep, s.arr, '0,1,2,3,4,5,6', 1, s.platform || null]
            );
        }
    }

    saveDatabase();
    console.log('  ✅ Database seeded successfully with transport data!');
}
