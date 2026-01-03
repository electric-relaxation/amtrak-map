import type {
  GTFSRoute,
  GTFSStop,
  GTFSTrip,
  GTFSStopTime,
  GTFSShape,
  GTFSCalendar,
  GTFSAgency,
  GTFSData,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

// Base path to GTFS files in public folder
const GTFS_BASE_PATH = '/gtfs';

// ============================================================================
// CSV Parsing Utilities
// ============================================================================

/**
 * Parse a CSV line, handling quoted fields properly
 * GTFS uses commas as delimiters and quotes for fields containing commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Push the last field
  result.push(current.trim());

  return result;
}

/**
 * Generic GTFS file parser
 * Reads a CSV file and converts it to typed objects
 */
async function parseGTFSFile<T>(
  filename: string,
  rowMapper: (row: Record<string, string>) => T
): Promise<T[]> {
  try {
    // Fetch the file
    const response = await fetch(`${GTFS_BASE_PATH}/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.statusText}`);
    }

    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    if (lines.length === 0) {
      return [];
    }

    // First line is the header
    const headers = parseCSVLine(lines[0]);

    // Parse each data row
    const results: T[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      // Create object mapping headers to values
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      // Map to typed object
      results.push(rowMapper(row));
    }

    return results;
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    throw error;
  }
}

// ============================================================================
// GTFS Time Parsing
// ============================================================================

/**
 * Parsed GTFS time with day offset
 * GTFS allows times > 24:00:00 for trips past midnight
 * Example: "25:30:00" = 1:30 AM the next day (dayOffset = 1)
 */
export interface ParsedGTFSTime {
  hours: number;        // 0-23 (normalized)
  minutes: number;      // 0-59
  seconds: number;      // 0-59
  dayOffset: number;    // 0 = same day, 1 = next day, etc.
  totalMinutes: number; // Total minutes from start (for easy comparison)
}

/**
 * Parse a GTFS time string (HH:MM:SS format, can exceed 24:00:00)
 * @param timeStr - Time string like "14:30:00" or "25:30:00"
 * @returns Parsed time with day offset
 */
export function parseGTFSTime(timeStr: string): ParsedGTFSTime {
  const parts = timeStr.split(':');

  if (parts.length !== 3) {
    throw new Error(`Invalid GTFS time format: ${timeStr}`);
  }

  const totalHours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);

  // Calculate day offset
  const dayOffset = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return {
    hours,
    minutes,
    seconds,
    dayOffset,
    totalMinutes: totalHours * 60 + minutes,
  };
}

/**
 * Convert parsed GTFS time to a Date object
 * @param baseDate - The starting date for the trip
 * @param parsedTime - The parsed GTFS time
 * @returns Date object representing the absolute time
 *
 * Note: This creates a Date in the local timezone. For accurate timezone handling,
 * use a library like date-fns-tz with the station's timezone from stops.txt
 */
export function gtfsTimeToDate(
  baseDate: Date,
  parsedTime: ParsedGTFSTime
): Date {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + parsedTime.dayOffset);
  result.setHours(parsedTime.hours, parsedTime.minutes, parsedTime.seconds, 0);
  return result;
}

// ============================================================================
// Type-specific Row Mappers
// ============================================================================

function mapRouteRow(row: Record<string, string>): GTFSRoute {
  return {
    route_id: row.route_id,
    agency_id: row.agency_id,
    route_short_name: row.route_short_name || '',
    route_long_name: row.route_long_name,
    route_type: parseInt(row.route_type, 10),
    route_url: row.route_url,
    route_color: row.route_color,
    route_text_color: row.route_text_color,
  };
}

function mapStopRow(row: Record<string, string>): GTFSStop {
  return {
    stop_id: row.stop_id,
    stop_name: row.stop_name,
    stop_url: row.stop_url,
    stop_timezone: row.stop_timezone,
    stop_lat: parseFloat(row.stop_lat),
    stop_lon: parseFloat(row.stop_lon),
  };
}

function mapTripRow(row: Record<string, string>): GTFSTrip {
  return {
    route_id: row.route_id,
    service_id: row.service_id,
    trip_id: row.trip_id,
    trip_short_name: row.trip_short_name || '',
    direction_id: parseInt(row.direction_id, 10),
    shape_id: row.shape_id,
    trip_headsign: row.trip_headsign || '',
  };
}

function mapStopTimeRow(row: Record<string, string>): GTFSStopTime {
  return {
    trip_id: row.trip_id,
    arrival_time: row.arrival_time,
    departure_time: row.departure_time,
    stop_id: row.stop_id,
    stop_sequence: parseInt(row.stop_sequence, 10),
    pickup_type: parseInt(row.pickup_type || '0', 10),
    drop_off_type: parseInt(row.drop_off_type || '0', 10),
    timepoint: parseInt(row.timepoint || '1', 10),
  };
}

function mapShapeRow(row: Record<string, string>): GTFSShape {
  return {
    shape_id: row.shape_id,
    shape_pt_lat: parseFloat(row.shape_pt_lat),
    shape_pt_lon: parseFloat(row.shape_pt_lon),
    shape_pt_sequence: parseInt(row.shape_pt_sequence, 10),
  };
}

function mapCalendarRow(row: Record<string, string>): GTFSCalendar {
  return {
    service_id: row.service_id,
    monday: parseInt(row.monday, 10),
    tuesday: parseInt(row.tuesday, 10),
    wednesday: parseInt(row.wednesday, 10),
    thursday: parseInt(row.thursday, 10),
    friday: parseInt(row.friday, 10),
    saturday: parseInt(row.saturday, 10),
    sunday: parseInt(row.sunday, 10),
    start_date: row.start_date,
    end_date: row.end_date,
  };
}

function mapAgencyRow(row: Record<string, string>): GTFSAgency {
  return {
    agency_id: row.agency_id,
    agency_name: row.agency_name,
    agency_url: row.agency_url,
    agency_timezone: row.agency_timezone,
    agency_lang: row.agency_lang,
  };
}

// ============================================================================
// Individual File Loaders
// ============================================================================

/**
 * Load routes from routes.txt
 * Filter to Amtrak trains only (route_type = 2, agency_id = 51)
 */
export async function loadRoutes(filterToAmtrakTrains = true): Promise<GTFSRoute[]> {
  const routes = await parseGTFSFile('routes.txt', mapRouteRow);

  if (filterToAmtrakTrains) {
    return routes.filter(
      route => route.route_type === 2 && route.agency_id === '51'
    );
  }

  return routes;
}

/**
 * Load stops from stops.txt
 */
export async function loadStops(): Promise<GTFSStop[]> {
  return parseGTFSFile('stops.txt', mapStopRow);
}

/**
 * Load trips from trips.txt
 * Optionally filter to specific route IDs
 */
export async function loadTrips(routeIds?: string[]): Promise<GTFSTrip[]> {
  const trips = await parseGTFSFile('trips.txt', mapTripRow);

  if (routeIds) {
    const routeIdSet = new Set(routeIds);
    return trips.filter(trip => routeIdSet.has(trip.route_id));
  }

  return trips;
}

/**
 * Load stop times from stop_times.txt
 * Optionally filter to specific trip IDs
 * WARNING: This file can be large (27k+ entries)
 */
export async function loadStopTimes(tripIds?: string[]): Promise<GTFSStopTime[]> {
  const stopTimes = await parseGTFSFile('stop_times.txt', mapStopTimeRow);

  if (tripIds) {
    const tripIdSet = new Set(tripIds);
    return stopTimes.filter(st => tripIdSet.has(st.trip_id));
  }

  return stopTimes;
}

/**
 * Load shapes from shapes.txt
 * Optionally filter to specific shape IDs
 * WARNING: This file is VERY large (353k+ points, 16MB)
 * Consider loading only specific shapes or implementing progressive loading
 */
export async function loadShapes(shapeIds?: string[]): Promise<GTFSShape[]> {
  console.warn('Loading shapes.txt - this is a large file (16MB, 353k points)');
  const shapes = await parseGTFSFile('shapes.txt', mapShapeRow);

  if (shapeIds) {
    const shapeIdSet = new Set(shapeIds);
    return shapes.filter(shape => shapeIdSet.has(shape.shape_id));
  }

  return shapes;
}

/**
 * Load calendar from calendar.txt
 */
export async function loadCalendar(): Promise<GTFSCalendar[]> {
  return parseGTFSFile('calendar.txt', mapCalendarRow);
}

/**
 * Load agencies from agency.txt
 */
export async function loadAgencies(): Promise<GTFSAgency[]> {
  return parseGTFSFile('agency.txt', mapAgencyRow);
}

// ============================================================================
// Main Loader
// ============================================================================

export interface LoadOptions {
  /** Filter routes to Amtrak trains only (route_type=2, agency_id=51) */
  filterToAmtrakTrains?: boolean;
  /** Load shapes.txt (16MB file - defaults to false) */
  loadShapes?: boolean;
  /** Load stop_times.txt (1MB file - defaults to true) */
  loadStopTimes?: boolean;
}

/**
 * Load all GTFS data
 *
 * WARNING: By default, this does NOT load shapes.txt (16MB)
 * Set options.loadShapes = true to include shapes
 *
 * @param options - Loading options
 * @returns Complete GTFS data bundle
 */
export async function loadAllGTFSData(
  options: LoadOptions = {}
): Promise<GTFSData> {
  const {
    filterToAmtrakTrains = true,
    loadShapes: shouldLoadShapes = true,
    loadStopTimes: shouldLoadStopTimes = true,
  } = options;

  console.log('Loading GTFS data...');
  const startTime = performance.now();

  try {
    // Load files in parallel where possible
    const [routes, stops, agencies, calendar] = await Promise.all([
      loadRoutes(filterToAmtrakTrains),
      loadStops(),
      loadAgencies(),
      loadCalendar(),
    ]);

    console.log(`Loaded routes (${routes.length}), stops (${stops.length}), calendar (${calendar.length})`);

    // Load trips after routes (need route IDs for filtering)
    const routeIds = routes.map(r => r.route_id);
    const trips = await loadTrips(filterToAmtrakTrains ? routeIds : undefined);
    console.log(`Loaded trips (${trips.length})`);

    // Load stop times if requested (can be filtered by trip IDs)
    let stopTimes: GTFSStopTime[] = [];
    if (shouldLoadStopTimes) {
      const tripIds = trips.map(t => t.trip_id);
      stopTimes = await loadStopTimes(tripIds);
      console.log(`Loaded stop times (${stopTimes.length})`);
    }

    // Load shapes if requested (LARGE FILE - 16MB)
    let shapes: GTFSShape[] = [];
    if (shouldLoadShapes) {
      const shapeIds = [...new Set(trips.map(t => t.shape_id))];
      shapes = await loadShapes(shapeIds);
      console.log(`Loaded shapes (${shapes.length} points)`);
    } else {
      console.log('Skipping shapes.txt (set loadShapes: true to include)');
    }

    const endTime = performance.now();
    console.log(`GTFS data loaded in ${((endTime - startTime) / 1000).toFixed(2)}s`);

    return {
      routes,
      stops,
      trips,
      stopTimes,
      shapes,
      calendar,
      agencies,
    };
  } catch (error) {
    console.error('Failed to load GTFS data:', error);
    throw error;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a service operates on a given date
 * @param calendar - Calendar entry from calendar.txt
 * @param date - Date to check
 * @returns true if service operates on this date
 */
export function serviceOperatesOnDate(
  calendar: GTFSCalendar,
  date: Date
): boolean {
  // Check if date is within service period
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  if (dateStr < calendar.start_date || dateStr > calendar.end_date) {
    return false;
  }

  // Check day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = date.getDay();
  const dayFields = [
    calendar.sunday,
    calendar.monday,
    calendar.tuesday,
    calendar.wednesday,
    calendar.thursday,
    calendar.friday,
    calendar.saturday,
  ];

  return dayFields[dayOfWeek] === 1;
}

/**
 * Get all trips operating on a specific date
 * @param trips - All trips
 * @param calendar - Calendar data
 * @param date - Target date
 * @returns Trips operating on this date
 */
export function getTripsForDate(
  trips: GTFSTrip[],
  calendar: GTFSCalendar[],
  date: Date
): GTFSTrip[] {
  // Build service ID set for this date
  const activeServiceIds = new Set(
    calendar
      .filter(cal => serviceOperatesOnDate(cal, date))
      .map(cal => cal.service_id)
  );

  return trips.filter(trip => activeServiceIds.has(trip.service_id));
}
