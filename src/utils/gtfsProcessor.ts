import type {
  GTFSRoute,
  GTFSTrip,
  GTFSStopTime,
  GTFSStop,
  GTFSShape,
  GTFSCalendar,
  ProcessedRoute,
  ProcessedSchedule,
  ProcessedStop,
  RouteShape,
  DirectionAxis,
  DirectionType,
  Coordinate,
} from '../types';
import { parseGTFSTime } from './gtfsLoader';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate the bearing between two coordinates in degrees
 * @returns Bearing from 0-360 degrees (0 = North, 90 = East, 180 = South, 270 = West)
 */
function calculateBearing(
  coord1: Coordinate,
  coord2: Coordinate
): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Determine if a route is primarily east-west or north-south
 * @param coordinates - Array of [lat, lon] coordinates along the route
 * @returns "east-west" or "north-south"
 */
export function determineDirectionAxis(coordinates: Coordinate[]): DirectionAxis {
  if (coordinates.length < 2) {
    console.warn('Not enough coordinates to determine direction axis');
    return 'east-west'; // Default fallback
  }

  // Calculate variance in latitude and longitude
  const lats = coordinates.map(c => c[0]);
  const lons = coordinates.map(c => c[1]);

  const latRange = Math.max(...lats) - Math.min(...lats);
  const lonRange = Math.max(...lons) - Math.min(...lons);

  // Also check the overall bearing of the route
  const firstCoord = coordinates[0];
  const lastCoord = coordinates[coordinates.length - 1];
  const bearing = calculateBearing(firstCoord, lastCoord);

  // Determine primary direction
  // If bearing is roughly N-S (315-45 or 135-225), use lat variance
  // If bearing is roughly E-W (45-135 or 225-315), use lon variance
  const isNorthSouthBearing =
    (bearing >= 315 || bearing < 45) || (bearing >= 135 && bearing < 225);

  // Combine bearing and variance checks
  if (isNorthSouthBearing && latRange >= lonRange * 0.7) {
    return 'north-south';
  } else if (!isNorthSouthBearing && lonRange >= latRange * 0.7) {
    return 'east-west';
  }

  // If unclear, use the larger variance
  return lonRange > latRange ? 'east-west' : 'north-south';
}

/**
 * Get human-readable direction labels for a route
 * @param route - Processed route
 * @returns Direction labels based on route axis
 */
export function getDirectionLabels(route: ProcessedRoute): {
  option1: string;
  option2: string;
} {
  if (route.directionAxis === 'east-west') {
    return {
      option1: 'Westbound',
      option2: 'Eastbound',
    };
  } else {
    return {
      option1: 'Northbound',
      option2: 'Southbound',
    };
  }
}

/**
 * Get more specific direction labels using trip headsigns
 * @param trips - Trips for this route
 * @returns Direction labels based on headsigns (e.g., "To Chicago", "To Los Angeles")
 */
export function getSpecificDirectionLabels(trips: GTFSTrip[]): {
  option1: string;
  option2: string;
} | null {
  // Get unique headsigns
  const headsigns = [...new Set(trips.map(t => t.trip_headsign).filter(Boolean))];

  if (headsigns.length === 2) {
    return {
      option1: `To ${headsigns[0]}`,
      option2: `To ${headsigns[1]}`,
    };
  } else if (headsigns.length === 1) {
    // Only one direction available
    return {
      option1: `To ${headsigns[0]}`,
      option2: `To ${headsigns[0]}`,
    };
  }

  return null; // Fall back to generic labels
}

// ============================================================================
// Index Building Functions
// ============================================================================

/**
 * Build index of stops by stop_id for fast lookup
 */
export function buildStopIndex(stops: GTFSStop[]): Map<string, GTFSStop> {
  const index = new Map<string, GTFSStop>();
  for (const stop of stops) {
    index.set(stop.stop_id, stop);
  }
  return index;
}

/**
 * Build index of routes by route_id for fast lookup
 */
export function buildRouteIndex(routes: GTFSRoute[]): Map<string, GTFSRoute> {
  const index = new Map<string, GTFSRoute>();
  for (const route of routes) {
    index.set(route.route_id, route);
  }
  return index;
}

/**
 * Build index of shapes grouped by shape_id
 */
export function buildShapeIndex(shapes: GTFSShape[]): Map<string, RouteShape> {
  const index = new Map<string, RouteShape>();

  // Group shapes by shape_id
  const shapeGroups = new Map<string, GTFSShape[]>();
  for (const shape of shapes) {
    if (!shapeGroups.has(shape.shape_id)) {
      shapeGroups.set(shape.shape_id, []);
    }
    shapeGroups.get(shape.shape_id)!.push(shape);
  }

  // Sort and convert to RouteShape
  for (const [shapeId, shapePoints] of shapeGroups) {
    // Sort by sequence
    shapePoints.sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence);

    // Convert to coordinates
    const coordinates: Coordinate[] = shapePoints.map(sp => [
      sp.shape_pt_lat,
      sp.shape_pt_lon,
    ]);

    index.set(shapeId, {
      shapeId,
      coordinates,
    });
  }

  return index;
}

/**
 * Build index of stop times grouped by trip_id
 */
export function buildStopTimeIndex(
  stopTimes: GTFSStopTime[]
): Map<string, GTFSStopTime[]> {
  const index = new Map<string, GTFSStopTime[]>();

  for (const stopTime of stopTimes) {
    if (!index.has(stopTime.trip_id)) {
      index.set(stopTime.trip_id, []);
    }
    index.get(stopTime.trip_id)!.push(stopTime);
  }

  // Sort each trip's stop times by sequence
  for (const stopTimeList of index.values()) {
    stopTimeList.sort((a, b) => a.stop_sequence - b.stop_sequence);
  }

  return index;
}

// ============================================================================
// Main Processing Functions
// ============================================================================

/**
 * Process raw GTFS routes into ProcessedRoute format
 *
 * @param routes - GTFS routes (should be filtered to Amtrak trains)
 * @param trips - GTFS trips
 * @param shapes - GTFS shapes (optional - will use stop coordinates as fallback)
 * @param stops - GTFS stops
 * @param stopTimes - GTFS stop times
 * @returns Array of processed routes ready for app consumption
 */
export function processRoutes(
  routes: GTFSRoute[],
  trips: GTFSTrip[],
  shapes: GTFSShape[],
  stops: GTFSStop[],
  stopTimes: GTFSStopTime[]
): ProcessedRoute[] {
  console.log(`Processing ${routes.length} routes...`);

  // Build indexes for fast lookup
  const stopIndex = buildStopIndex(stops);
  const shapeIndex = buildShapeIndex(shapes);
  const stopTimeIndex = buildStopTimeIndex(stopTimes);

  const processedRoutes: ProcessedRoute[] = [];

  for (const route of routes) {
    try {
      // Get all trips for this route
      const routeTrips = trips.filter(t => t.route_id === route.route_id);

      if (routeTrips.length === 0) {
        console.warn(`Route ${route.route_long_name} has no trips`);
        continue;
      }

      // Get unique train numbers
      const routeNumbers = [
        ...new Set(routeTrips.map(t => t.trip_short_name).filter(Boolean))
      ];

      // Get unique shape IDs
      const shapeIds = [...new Set(routeTrips.map(t => t.shape_id).filter(Boolean))];

      // Determine direction options
      // First try using trip_headsign
      const uniqueHeadsigns = [
        ...new Set(routeTrips.map(t => t.trip_headsign).filter(Boolean))
      ];

      // If we don't have headsigns, fall back to direction_id
      const uniqueDirectionIds = [...new Set(routeTrips.map(t => t.direction_id))];

      let directionOptions: DirectionType[] = [];

      // Determine direction axis from shapes or stops
      let directionAxis: DirectionAxis = 'east-west';

      if (shapeIds.length > 0 && shapeIndex.has(shapeIds[0])) {
        // Use shapes to determine axis
        const shape = shapeIndex.get(shapeIds[0])!;
        directionAxis = determineDirectionAxis(shape.coordinates);
      } else {
        // Fallback: use stop coordinates from first trip
        const firstTrip = routeTrips[0];
        const tripStopTimes = stopTimeIndex.get(firstTrip.trip_id) || [];

        if (tripStopTimes.length >= 2) {
          const stopCoords: Coordinate[] = tripStopTimes
            .map(st => {
              const stop = stopIndex.get(st.stop_id);
              return stop ? [stop.stop_lat, stop.stop_lon] as Coordinate : null;
            })
            .filter((c): c is Coordinate => c !== null);

          if (stopCoords.length >= 2) {
            directionAxis = determineDirectionAxis(stopCoords);
          }
        }
      }

      // Build direction options based on axis
      if (directionAxis === 'east-west') {
        if (uniqueDirectionIds.length >= 2 || uniqueHeadsigns.length >= 2) {
          directionOptions = ['westbound', 'eastbound'];
        } else {
          directionOptions = ['westbound']; // Single direction
        }
      } else {
        if (uniqueDirectionIds.length >= 2 || uniqueHeadsigns.length >= 2) {
          directionOptions = ['northbound', 'southbound'];
        } else {
          directionOptions = ['northbound']; // Single direction
        }
      }

      const processedRoute: ProcessedRoute = {
        routeId: route.route_id,
        routeName: route.route_long_name,
        routeNumbers,
        directionAxis,
        directionOptions,
        shapeIds,
        color: route.route_color,
        url: route.route_url,
      };

      processedRoutes.push(processedRoute);
    } catch (error) {
      console.error(`Error processing route ${route.route_long_name}:`, error);
    }
  }

  console.log(`Processed ${processedRoutes.length} routes`);
  return processedRoutes;
}

/**
 * Process raw GTFS data into ProcessedSchedule format
 *
 * @param trips - GTFS trips
 * @param stopTimes - GTFS stop times
 * @param stops - GTFS stops
 * @param calendar - GTFS calendar
 * @returns Map of routeId -> array of schedules
 */
export function processSchedules(
  trips: GTFSTrip[],
  stopTimes: GTFSStopTime[],
  stops: GTFSStop[],
  calendar: GTFSCalendar[]
): Map<string, ProcessedSchedule[]> {
  console.log(`Processing schedules for ${trips.length} trips...`);

  const stopIndex = buildStopIndex(stops);
  const stopTimeIndex = buildStopTimeIndex(stopTimes);
  const calendarIndex = new Map(calendar.map(c => [c.service_id, c]));

  const schedulesByRoute = new Map<string, ProcessedSchedule[]>();

  for (const trip of trips) {
    try {
      const tripStopTimes = stopTimeIndex.get(trip.trip_id);
      if (!tripStopTimes || tripStopTimes.length === 0) {
        console.warn(`Trip ${trip.trip_id} has no stop times`);
        continue;
      }

      // Get calendar info
      const cal = calendarIndex.get(trip.service_id);
      if (!cal) {
        console.warn(`Trip ${trip.trip_id} has invalid service_id ${trip.service_id}`);
        continue;
      }

      // Process stops
      const processedStops: ProcessedStop[] = tripStopTimes.map(st => {
        const stop = stopIndex.get(st.stop_id);

        if (!stop) {
          throw new Error(`Stop ${st.stop_id} not found in stops index`);
        }

        // Parse arrival time to get day offset
        const arrivalParsed = parseGTFSTime(st.arrival_time);

        return {
          stopId: st.stop_id,
          stopName: stop.stop_name,
          stopSequence: st.stop_sequence,
          coordinates: [stop.stop_lat, stop.stop_lon],
          timezone: stop.stop_timezone,
          arrivalTime: st.arrival_time,
          departureTime: st.departure_time,
          dayOffset: arrivalParsed.dayOffset, // Use arrival time for day offset
        };
      });

      const schedule: ProcessedSchedule = {
        tripId: trip.trip_id,
        routeId: trip.route_id,
        trainNumber: trip.trip_short_name,
        direction: trip.trip_headsign,
        shapeId: trip.shape_id,
        stops: processedStops,
        operatingDays: {
          monday: cal.monday === 1,
          tuesday: cal.tuesday === 1,
          wednesday: cal.wednesday === 1,
          thursday: cal.thursday === 1,
          friday: cal.friday === 1,
          saturday: cal.saturday === 1,
          sunday: cal.sunday === 1,
        },
        startDate: cal.start_date,
        endDate: cal.end_date,
      };

      // Add to route schedules
      if (!schedulesByRoute.has(trip.route_id)) {
        schedulesByRoute.set(trip.route_id, []);
      }
      schedulesByRoute.get(trip.route_id)!.push(schedule);
    } catch (error) {
      console.error(`Error processing schedule for trip ${trip.trip_id}:`, error);
    }
  }

  console.log(
    `Processed schedules for ${schedulesByRoute.size} routes (${trips.length} total trips)`
  );

  return schedulesByRoute;
}

// ============================================================================
// Shape Processing Utilities
// ============================================================================

/**
 * Simplify a shape using Douglas-Peucker algorithm
 * Reduces the number of points while preserving the overall shape
 *
 * @param coordinates - Array of coordinates
 * @param tolerance - Tolerance in degrees (higher = more simplification)
 * @returns Simplified array of coordinates
 */
export function simplifyShape(
  coordinates: Coordinate[],
  tolerance: number = 0.001
): Coordinate[] {
  if (coordinates.length <= 2) {
    return coordinates;
  }

  // Find the point with the maximum distance from the line between first and last
  let maxDistance = 0;
  let maxIndex = 0;

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  for (let i = 1; i < coordinates.length - 1; i++) {
    const distance = perpendicularDistance(coordinates[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const left = simplifyShape(coordinates.slice(0, maxIndex + 1), tolerance);
    const right = simplifyShape(coordinates.slice(maxIndex), tolerance);

    // Combine results (remove duplicate point at join)
    return [...left.slice(0, -1), ...right];
  } else {
    // If max distance is within tolerance, return just endpoints
    return [first, last];
  }
}

/**
 * Calculate perpendicular distance from a point to a line
 */
function perpendicularDistance(
  point: Coordinate,
  lineStart: Coordinate,
  lineEnd: Coordinate
): number {
  const [px, py] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    // Line start and end are the same point
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }

  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
}

/**
 * Build a shape from stop coordinates when shapes.txt is not available
 *
 * @param stopTimes - Stop times for a trip, sorted by sequence
 * @param stops - Stop index
 * @returns RouteShape built from stop coordinates
 */
export function buildShapeFromStops(
  stopTimes: GTFSStopTime[],
  stops: Map<string, GTFSStop>
): RouteShape | null {
  const coordinates: Coordinate[] = [];

  for (const st of stopTimes) {
    const stop = stops.get(st.stop_id);
    if (stop) {
      coordinates.push([stop.stop_lat, stop.stop_lon]);
    }
  }

  if (coordinates.length < 2) {
    return null;
  }

  return {
    shapeId: 'generated',
    coordinates,
  };
}

// ============================================================================
// Data Validation Utilities
// ============================================================================

/**
 * Validate processed routes and log warnings for any issues
 */
export function validateProcessedRoutes(routes: ProcessedRoute[]): void {
  console.log('Validating processed routes...');

  let warnings = 0;

  for (const route of routes) {
    // Check for missing data
    if (!route.routeName) {
      console.warn(`Route ${route.routeId} is missing a name`);
      warnings++;
    }

    if (route.routeNumbers.length === 0) {
      console.warn(`Route ${route.routeName} has no train numbers`);
      warnings++;
    }

    if (route.shapeIds.length === 0) {
      console.warn(`Route ${route.routeName} has no shapes`);
      warnings++;
    }

    if (route.directionOptions.length === 0) {
      console.warn(`Route ${route.routeName} has no direction options`);
      warnings++;
    }
  }

  if (warnings === 0) {
    console.log('✓ All routes validated successfully');
  } else {
    console.warn(`⚠ Found ${warnings} warnings during route validation`);
  }
}

/**
 * Validate processed schedules and log warnings for any issues
 */
export function validateProcessedSchedules(
  schedules: Map<string, ProcessedSchedule[]>
): void {
  console.log('Validating processed schedules...');

  let warnings = 0;
  let totalSchedules = 0;

  for (const [routeId, routeSchedules] of schedules) {
    totalSchedules += routeSchedules.length;

    for (const schedule of routeSchedules) {
      // Check for missing data
      if (schedule.stops.length < 2) {
        console.warn(
          `Schedule ${schedule.tripId} for route ${routeId} has fewer than 2 stops`
        );
        warnings++;
      }

      // Check for stops without coordinates
      for (const stop of schedule.stops) {
        if (!stop.coordinates || stop.coordinates.length !== 2) {
          console.warn(
            `Stop ${stop.stopId} in trip ${schedule.tripId} has invalid coordinates`
          );
          warnings++;
        }
      }

      // Check for increasing day offsets
      let lastDayOffset = 0;
      for (const stop of schedule.stops) {
        if (stop.dayOffset < lastDayOffset) {
          console.warn(
            `Trip ${schedule.tripId} has non-increasing day offsets at stop ${stop.stopId}`
          );
          warnings++;
        }
        lastDayOffset = stop.dayOffset;
      }
    }
  }

  if (warnings === 0) {
    console.log(`✓ All ${totalSchedules} schedules validated successfully`);
  } else {
    console.warn(`⚠ Found ${warnings} warnings during schedule validation`);
  }
}
