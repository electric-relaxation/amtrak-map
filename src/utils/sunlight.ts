import * as SunCalc from 'suncalc';
import { parseGTFSTime } from './gtfsLoader';
import type {
  ProcessedRoute,
  ProcessedTrip,
  Coordinate,
  SunlightPhase,
  SunlightSegment,
} from '../types';

// ============================================================================
// Constants
// ============================================================================

const EARTH_RADIUS_KM = 6371;
const DEFAULT_SAMPLE_POINTS = 100; // Points to sample along the route for smooth gradients

// ============================================================================
// Helper Functions - Distance and Interpolation
// ============================================================================

/**
 * Calculate distance between two coordinates using Haversine formula
 *
 * @param coord1 - First coordinate [lat, lng]
 * @param coord2 - Second coordinate [lat, lng]
 * @returns Distance in kilometers
 */
function calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Interpolate a coordinate between two points
 *
 * @param coord1 - Start coordinate [lat, lng]
 * @param coord2 - End coordinate [lat, lng]
 * @param fraction - Fraction along the path (0 = coord1, 1 = coord2)
 * @returns Interpolated coordinate
 */
function interpolateCoordinate(
  coord1: Coordinate,
  coord2: Coordinate,
  fraction: number
): Coordinate {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const lat = lat1 + (lat2 - lat1) * fraction;
  const lon = lon1 + (lon2 - lon1) * fraction;

  return [lat, lon];
}

/**
 * Calculate cumulative distances along a path
 *
 * @param coordinates - Array of coordinates
 * @returns Array of cumulative distances in km
 */
function calculateCumulativeDistances(coordinates: Coordinate[]): number[] {
  const distances: number[] = [0];
  let cumulative = 0;

  for (let i = 1; i < coordinates.length; i++) {
    cumulative += calculateDistance(coordinates[i - 1], coordinates[i]);
    distances.push(cumulative);
  }

  return distances;
}

// ============================================================================
// Helper Functions - Time Conversion
// ============================================================================

/**
 * Convert a GTFS time string and base date to an absolute Date object
 *
 * @param baseDate - The base date (typically the selected date)
 * @param timeString - GTFS time string (HH:MM:SS, can exceed 24:00:00)
 * @param dayOffset - Day offset from parseGTFSTime
 * @returns Absolute Date object
 */
function gtfsTimeToDate(baseDate: Date, timeString: string, dayOffset: number): Date {
  const parsed = parseGTFSTime(timeString);
  const result = new Date(baseDate);
  result.setDate(result.getDate() + dayOffset);
  result.setHours(parsed.hours, parsed.minutes, parsed.seconds, 0);
  return result;
}

/**
 * Interpolate a time between two dates
 *
 * @param time1 - Start time
 * @param time2 - End time
 * @param fraction - Fraction between the times (0 = time1, 1 = time2)
 * @returns Interpolated Date
 */
function interpolateTime(time1: Date, time2: Date, fraction: number): Date {
  const millis1 = time1.getTime();
  const millis2 = time2.getTime();
  return new Date(millis1 + (millis2 - millis1) * fraction);
}

// ============================================================================
// Helper Functions - Sunlight Calculation
// ============================================================================

/**
 * Calculate the sunlight phase at a given location and time
 *
 * @param coord - Coordinate [lat, lng]
 * @param time - Date/time
 * @returns Sunlight phase (day, night, dawn, dusk)
 */
function calculateSunlightPhase(coord: Coordinate, time: Date): SunlightPhase {
  const [lat, lng] = coord;
  const times = SunCalc.getTimes(time, lat, lng);

  // Dawn = astronomical dawn (nightEnd) to sunrise
  if (time >= times.nightEnd && time < times.sunrise) {
    return 'dawn';
  }

  // Day = sunrise to sunset
  if (time >= times.sunrise && time < times.sunset) {
    return 'day';
  }

  // Dusk = sunset to astronomical dusk (night)
  if (time >= times.sunset && time < times.night) {
    return 'dusk';
  }

  return 'night';
}

/**
 * Calculate sunlight intensity (0-1) at a given location and time
 *
 * @param coord - Coordinate [lat, lng]
 * @param time - Date/time
 * @returns Intensity value between 0 (darkest) and 1 (brightest)
 */
function calculateSunlightIntensity(coord: Coordinate, time: Date): number {
  const [lat, lng] = coord;
  const sunPosition = SunCalc.getPosition(time, lat, lng);
  const altitude = sunPosition.altitude; // radians, -π/2 to π/2

  // Convert altitude to intensity
  // When sun is at horizon, altitude = 0
  // When sun is at zenith, altitude = π/2 (90 degrees)
  // When sun is below horizon, altitude is negative

  // Full darkness when sun is 18 degrees below horizon (astronomical twilight)
  const minAltitude = -18 * Math.PI / 180;
  // Full brightness when sun is above horizon
  const maxAltitude = 0;

  if (altitude >= maxAltitude) {
    // Daylight - intensity based on sun height
    // Map 0 to π/2 → 0.5 to 1.0
    return 0.5 + 0.5 * (altitude / (Math.PI / 2));
  }

  if (altitude <= minAltitude) {
    // Full night
    return 0;
  }

  // Twilight - interpolate between 0 and 0.5
  const fraction = (altitude - minAltitude) / (maxAltitude - minAltitude);
  return fraction * 0.5;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Get the train's position at a specific time
 *
 * @param schedule - The train schedule
 * @param targetTime - The time to get position for
 * @param baseDate - The base date for the trip (default is today)
 * @returns Train position with coordinates and nearest stops, or null if not in transit
 *
 * @example
 * ```typescript
 * const schedule = useRouteSchedule('96', 'Emeryville');
 * const position = getTrainPositionAtTime(schedule, new Date(), new Date());
 *
 * if (position) {
 *   console.log(`Train is at ${position.lat}, ${position.lng}`);
 *   console.log(`Between ${position.nearestStops[0]} and ${position.nearestStops[1]}`);
 * }
 * ```
 */
export function getTrainPositionAtTime(
  schedule: ProcessedTrip,
  targetTime: Date,
  baseDate: Date = new Date()
): { lat: number; lng: number; nearestStops: [string, string] } | null {
  const stops = schedule.stops;

  if (stops.length < 2) {
    return null;
  }

  // Convert all stop times to absolute dates
  const stopTimes = stops.map(stop =>
    gtfsTimeToDate(baseDate, stop.departureTime, stop.dayOffset)
  );

  const firstDeparture = stopTimes[0];
  const lastArrival = gtfsTimeToDate(baseDate, stops[stops.length - 1].arrivalTime, stops[stops.length - 1].dayOffset);

  // Check if train hasn't departed yet or has already arrived
  if (targetTime < firstDeparture || targetTime > lastArrival) {
    return null;
  }

  // Find the two stops the train is between
  for (let i = 0; i < stops.length - 1; i++) {
    const currentStop = stops[i];
    const nextStop = stops[i + 1];

    const currentTime = gtfsTimeToDate(baseDate, currentStop.departureTime, currentStop.dayOffset);
    const nextTime = gtfsTimeToDate(baseDate, nextStop.arrivalTime, nextStop.dayOffset);

    if (targetTime >= currentTime && targetTime <= nextTime) {
      // Interpolate position between these two stops
      const totalDuration = nextTime.getTime() - currentTime.getTime();
      const elapsedDuration = targetTime.getTime() - currentTime.getTime();
      const fraction = totalDuration > 0 ? elapsedDuration / totalDuration : 0;

      const position = interpolateCoordinate(currentStop.coordinates, nextStop.coordinates, fraction);

      return {
        lat: position[0],
        lng: position[1],
        nearestStops: [currentStop.stopName, nextStop.stopName],
      };
    }
  }

  // If we're at a stop (exact match), return the stop's position
  for (let i = 0; i < stops.length; i++) {
    const stopTime = stopTimes[i];
    if (Math.abs(targetTime.getTime() - stopTime.getTime()) < 60000) { // Within 1 minute
      const stop = stops[i];
      const nextStopName = i < stops.length - 1 ? stops[i + 1].stopName : stop.stopName;
      return {
        lat: stop.coordinates[0],
        lng: stop.coordinates[1],
        nearestStops: [stop.stopName, nextStopName],
      };
    }
  }

  return null;
}

/**
 * Map shape coordinates to schedule times by interpolating between stops
 *
 * @param shapeCoords - Array of shape coordinates
 * @param schedule - The train schedule
 * @param baseDate - The base date for the trip
 * @returns Array of coordinate-time pairs
 *
 * @example
 * ```typescript
 * const shapeCoords = [[40.7, -74.0], [40.8, -73.9], ...];
 * const timePoints = mapShapeToSchedule(shapeCoords, schedule, new Date());
 * ```
 */
export function mapShapeToSchedule(
  shapeCoords: Coordinate[],
  schedule: ProcessedTrip,
  baseDate: Date = new Date()
): { coord: Coordinate; time: Date }[] {
  if (shapeCoords.length === 0 || schedule.stops.length < 2) {
    return [];
  }

  const stops = schedule.stops;
  const result: { coord: Coordinate; time: Date }[] = [];

  // Calculate cumulative distances along the shape
  const shapeCumulativeDistances = calculateCumulativeDistances(shapeCoords);

  // For each stop, find the closest point on the shape
  const stopShapeIndices: { stopIndex: number; shapeIndex: number; distance: number }[] = [];

  for (let stopIdx = 0; stopIdx < stops.length; stopIdx++) {
    const stop = stops[stopIdx];
    let minDistance = Infinity;
    let closestShapeIdx = 0;

    for (let shapeIdx = 0; shapeIdx < shapeCoords.length; shapeIdx++) {
      const dist = calculateDistance(stop.coordinates, shapeCoords[shapeIdx]);
      if (dist < minDistance) {
        minDistance = dist;
        closestShapeIdx = shapeIdx;
      }
    }

    stopShapeIndices.push({
      stopIndex: stopIdx,
      shapeIndex: closestShapeIdx,
      distance: shapeCumulativeDistances[closestShapeIdx],
    });
  }

  // Now interpolate times for each shape point
  for (let shapeIdx = 0; shapeIdx < shapeCoords.length; shapeIdx++) {
    const shapeDistance = shapeCumulativeDistances[shapeIdx];

    // Find which two stops this shape point is between
    let beforeStopMapping = stopShapeIndices[0];
    let afterStopMapping = stopShapeIndices[stopShapeIndices.length - 1];

    for (let i = 0; i < stopShapeIndices.length - 1; i++) {
      if (
        stopShapeIndices[i].distance <= shapeDistance &&
        stopShapeIndices[i + 1].distance >= shapeDistance
      ) {
        beforeStopMapping = stopShapeIndices[i];
        afterStopMapping = stopShapeIndices[i + 1];
        break;
      }
    }

    // Interpolate time based on distance along the shape
    const beforeStop = stops[beforeStopMapping.stopIndex];
    const afterStop = stops[afterStopMapping.stopIndex];

    const beforeTime = gtfsTimeToDate(baseDate, beforeStop.departureTime, beforeStop.dayOffset);
    const afterTime = gtfsTimeToDate(baseDate, afterStop.arrivalTime, afterStop.dayOffset);

    const distanceFraction =
      afterStopMapping.distance > beforeStopMapping.distance
        ? (shapeDistance - beforeStopMapping.distance) /
          (afterStopMapping.distance - beforeStopMapping.distance)
        : 0;

    const interpolatedTime = interpolateTime(beforeTime, afterTime, distanceFraction);

    result.push({
      coord: shapeCoords[shapeIdx],
      time: interpolatedTime,
    });
  }

  return result;
}

/**
 * Calculate sunlight-colored segments for a route
 *
 * @param route - The processed route
 * @param schedule - The train schedule
 * @param selectedDate - The date of travel
 * @param shapeCoords - Optional shape coordinates (if not provided, falls back to stop coordinates)
 * @param samplePoints - Number of points to sample (default 100)
 * @returns Array of sunlight segments for rendering
 *
 * @example
 * ```typescript
 * const route = useRoute('96');
 * const schedule = useRouteSchedule('96', 'Emeryville');
 * const segments = calculateRouteSegmentColors(route, schedule, new Date(), shapeCoords);
 *
 * // Render segments on map with different colors based on sunlightPhase
 * segments.forEach(segment => {
 *   const color = segment.sunlightPhase === 'day' ? 'yellow' :
 *                 segment.sunlightPhase === 'night' ? 'blue' :
 *                 segment.sunlightPhase === 'dawn' ? 'orange' : 'purple';
 *   // Draw line from segment.startCoord to segment.endCoord with color
 * });
 * ```
 */
export function calculateRouteSegmentColors(
  _route: ProcessedRoute,
  schedule: ProcessedTrip,
  selectedDate: Date,
  shapeCoords?: Coordinate[],
  samplePoints: number = DEFAULT_SAMPLE_POINTS
): SunlightSegment[] {
  if (schedule.stops.length < 2) {
    console.warn('Schedule must have at least 2 stops');
    return [];
  }

  // Use shape coordinates if provided, otherwise fall back to stop coordinates
  let pathCoords: Coordinate[];
  let timePoints: { coord: Coordinate; time: Date }[];

  if (shapeCoords && shapeCoords.length > 0) {
    // Use shape coordinates with interpolated times
    pathCoords = shapeCoords;
    timePoints = mapShapeToSchedule(shapeCoords, schedule, selectedDate);
  } else {
    // Fall back to stop coordinates
    pathCoords = schedule.stops.map(stop => stop.coordinates);
    timePoints = schedule.stops.map(stop => ({
      coord: stop.coordinates,
      time: gtfsTimeToDate(selectedDate, stop.departureTime, stop.dayOffset),
    }));
  }

  if (timePoints.length === 0) {
    console.warn('No time points available for sunlight calculation');
    return [];
  }

  // Sample points evenly along the path
  const cumulativeDistances = calculateCumulativeDistances(pathCoords);
  const totalDistance = cumulativeDistances[cumulativeDistances.length - 1];

  // Determine how many points to sample (either use samplePoints or actual coords if fewer)
  const numSamples = Math.min(samplePoints, pathCoords.length);
  const sampledPoints: { coord: Coordinate; time: Date }[] = [];

  for (let i = 0; i < numSamples; i++) {
    const targetDistance = (i / (numSamples - 1)) * totalDistance;

    // Find the two path points this target distance is between
    let beforeIdx = 0;
    let afterIdx = pathCoords.length - 1;

    for (let j = 0; j < cumulativeDistances.length - 1; j++) {
      if (
        cumulativeDistances[j] <= targetDistance &&
        cumulativeDistances[j + 1] >= targetDistance
      ) {
        beforeIdx = j;
        afterIdx = j + 1;
        break;
      }
    }

    // Interpolate coordinate
    const segmentDistance = cumulativeDistances[afterIdx] - cumulativeDistances[beforeIdx];
    const fraction = segmentDistance > 0
      ? (targetDistance - cumulativeDistances[beforeIdx]) / segmentDistance
      : 0;

    const coord = interpolateCoordinate(pathCoords[beforeIdx], pathCoords[afterIdx], fraction);

    // Interpolate time using the time points
    const beforeTimePoint = timePoints[beforeIdx];
    const afterTimePoint = timePoints[afterIdx];
    const time = interpolateTime(beforeTimePoint.time, afterTimePoint.time, fraction);

    sampledPoints.push({ coord, time });
  }

  // Create segments from the sampled points
  const segments: SunlightSegment[] = [];

  for (let i = 0; i < sampledPoints.length - 1; i++) {
    const start = sampledPoints[i];
    const end = sampledPoints[i + 1];

    // Calculate sunlight at the midpoint for this segment
    const midCoord = interpolateCoordinate(start.coord, end.coord, 0.5);
    const midTime = interpolateTime(start.time, end.time, 0.5);

    const phase = calculateSunlightPhase(midCoord, midTime);
    const intensity = calculateSunlightIntensity(midCoord, midTime);

    segments.push({
      startCoord: start.coord,
      endCoord: end.coord,
      sunlightPhase: phase,
      sunlightIntensity: intensity,
    });
  }

  return segments;
}

/**
 * Get sunlight information for a specific coordinate and time
 * Useful for tooltips and debugging
 *
 * @param coord - Coordinate [lat, lng]
 * @param time - Date/time
 * @returns Sunlight phase and intensity
 */
export function getSunlightInfo(coord: Coordinate, time: Date): {
  phase: SunlightPhase;
  intensity: number;
  sunTimes: SunCalc.GetTimesResult;
} {
  const [lat, lng] = coord;
  const phase = calculateSunlightPhase(coord, time);
  const intensity = calculateSunlightIntensity(coord, time);
  const sunTimes = SunCalc.getTimes(time, lat, lng);

  return {
    phase,
    intensity,
    sunTimes,
  };
}
