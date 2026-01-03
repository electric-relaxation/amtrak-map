// ============================================================================
// GTFS Raw Types - Match the structure of GTFS text files
// ============================================================================

/**
 * Route from routes.txt
 * Represents a transit route (e.g., "California Zephyr", "Northeast Regional")
 */
export interface GTFSRoute {
  route_id: string;           // Unique identifier (e.g., "96", "88")
  agency_id: string;          // Foreign key to agency (use "51" for Amtrak)
  route_short_name: string;   // Short name (typically empty for Amtrak)
  route_long_name: string;    // Display name (e.g., "California Zephyr")
  route_type: number;         // 2 = rail, 3 = bus
  route_url: string;          // Link to route info on amtrak.com
  route_color: string;        // Hex color code
  route_text_color: string;   // Text color for contrast
}

/**
 * Stop/Station from stops.txt
 * Represents a physical station location
 */
export interface GTFSStop {
  stop_id: string;        // 3-letter station code (e.g., "CHI", "NYP")
  stop_name: string;      // Full station name
  stop_url: string;       // Link to station page on amtrak.com
  stop_timezone: string;  // IANA timezone (e.g., "America/Chicago")
  stop_lat: number;       // Latitude in decimal degrees
  stop_lon: number;       // Longitude in decimal degrees
}

/**
 * Trip from trips.txt
 * Represents a specific train departure/journey
 */
export interface GTFSTrip {
  route_id: string;         // Foreign key to routes.txt
  service_id: string;       // Foreign key to calendar.txt (defines operating days)
  trip_id: string;          // Unique identifier for this trip
  trip_short_name: string;  // Train number (e.g., "5", "2150", "1340")
  direction_id: number;     // 0 or 1 (inconsistent across routes - could distinguish east-west or north-south)
  shape_id: string;         // Foreign key to shapes.txt (geographic path)
  trip_headsign: string;    // Destination shown to passengers (e.g., "Chicago", "Los Angeles")
}

/**
 * Stop time from stop_times.txt
 * Represents a scheduled stop on a trip
 */
export interface GTFSStopTime {
  trip_id: string;          // Foreign key to trips.txt
  arrival_time: string;     // HH:MM:SS format (can exceed 24:00:00 for next-day arrivals)
  departure_time: string;   // HH:MM:SS format
  stop_id: string;          // Foreign key to stops.txt
  stop_sequence: number;    // Order of stops (1, 2, 3, ...)
  pickup_type: number;      // 0 = regular pickup
  drop_off_type: number;    // 0 = regular drop-off
  timepoint: number;        // 1 = scheduled timepoint, 0 = approximate
}

/**
 * Shape point from shapes.txt
 * Defines the geographic path a train follows
 */
export interface GTFSShape {
  shape_id: string;           // Identifier for this shape/path
  shape_pt_lat: number;       // Latitude of this point
  shape_pt_lon: number;       // Longitude of this point
  shape_pt_sequence: number;  // Order along the path (1, 2, 3, ...)
}

/**
 * Calendar from calendar.txt
 * Defines which days of the week a service operates
 */
export interface GTFSCalendar {
  service_id: string;  // Unique identifier
  monday: number;      // 1 = operates, 0 = doesn't operate
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  start_date: string;  // YYYYMMDD format
  end_date: string;    // YYYYMMDD format
}

/**
 * Agency from agency.txt
 * Defines the transit agency operating services
 */
export interface GTFSAgency {
  agency_id: string;       // Unique identifier (Amtrak = "51")
  agency_name: string;     // Display name
  agency_url: string;      // Website URL
  agency_timezone: string; // IANA timezone
  agency_lang: string;     // Language code (e.g., "en")
}

// ============================================================================
// Processed Types - Derived from GTFS data for app use
// ============================================================================

/**
 * Direction type for train travel
 */
export type DirectionType = "eastbound" | "westbound" | "northbound" | "southbound";

/**
 * Primary axis of travel for a route
 */
export type DirectionAxis = "east-west" | "north-south";

/**
 * Processed route combining GTFS data for UI consumption
 * Built from: routes.txt + trips.txt + shapes.txt
 */
export interface ProcessedRoute {
  routeId: string;                    // From route_id
  routeName: string;                  // From route_long_name
  routeNumbers: string[];             // Unique train numbers from trips (trip_short_name)
  directionAxis: DirectionAxis;       // Inferred from geography or user-provided
  directionOptions: DirectionType[];  // Available directions (derived from trip_headsign)
  shapeIds: string[];                 // Unique shape_ids for this route
  color: string;                      // From route_color
  url: string;                        // From route_url
}

/**
 * Coordinate pair [latitude, longitude]
 */
export type Coordinate = [number, number];

/**
 * Geographic shape/path for rendering on map
 * Built from: shapes.txt
 */
export interface RouteShape {
  shapeId: string;              // From shape_id
  coordinates: Coordinate[];    // Array of [lat, lon] pairs, ordered by sequence
}

/**
 * Stop information for schedule display
 * Built from: stop_times.txt + stops.txt
 */
export interface ProcessedStop {
  stopId: string;            // From stop_id
  stopName: string;          // From stop_name
  stopSequence: number;      // From stop_sequence
  coordinates: Coordinate;   // [lat, lon] from stop_lat, stop_lon
  timezone: string;          // From stop_timezone
  arrivalTime: string;       // From arrival_time (HH:MM:SS, may exceed 24:00:00)
  departureTime: string;     // From departure_time (HH:MM:SS)
  dayOffset: number;         // Day offset (0 = same day, 1 = next day, etc.)
}

/**
 * Complete schedule for a specific trip
 * Built from: trips.txt + stop_times.txt + stops.txt + shapes.txt
 */
export interface ProcessedSchedule {
  tripId: string;               // From trip_id
  routeId: string;              // From route_id
  trainNumber: string;          // From trip_short_name
  direction: string;            // From trip_headsign (e.g., "Chicago", "Los Angeles")
  shapeId: string;              // From shape_id
  stops: ProcessedStop[];       // Ordered array of stops
  operatingDays: {              // From calendar.txt via service_id
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  startDate: string;            // From calendar start_date (YYYYMMDD)
  endDate: string;              // From calendar end_date (YYYYMMDD)
}

/**
 * Time information for a specific point along a route
 * Used for interpolating sunlight along the path
 */
export interface TimePoint {
  coordinate: Coordinate;     // [lat, lon]
  datetime: Date;             // Absolute date/time at this location
  timezone: string;           // IANA timezone for this point
}

// ============================================================================
// Application State Types
// ============================================================================

/**
 * Global application settings
 */
export interface AppSettings {
  selectedDate: Date;
  globalEastWestDirection: "eastbound" | "westbound";
  globalNorthSouthDirection: "northbound" | "southbound";
}

/**
 * Per-route settings
 */
export interface RouteSettings {
  routeId: string;
  selectedTrainNumber: string;  // Changed from number to string to match trip_short_name
  selectedDirection: string;     // trip_headsign value
}

// ============================================================================
// Sunlight Visualization Types
// ============================================================================

/**
 * Sunlight phase at a location
 */
export type SunlightPhase = "day" | "night" | "dawn" | "dusk";

/**
 * Sunlight data for a segment of the route path
 * Used for coloring route segments on the map
 */
export interface SunlightSegment {
  startCoord: Coordinate;        // [lat, lng]
  endCoord: Coordinate;          // [lat, lng]
  sunlightPhase: SunlightPhase;
  sunlightIntensity: number;     // 0-1 for gradient coloring
}

/**
 * Complete sunlight data for a trip
 */
export interface TripSunlight {
  tripId: string;
  segments: SunlightSegment[];
}

// ============================================================================
// Utility Types for Data Loading
// ============================================================================

/**
 * GTFS data bundle - all parsed GTFS files
 */
export interface GTFSData {
  routes: GTFSRoute[];
  stops: GTFSStop[];
  trips: GTFSTrip[];
  stopTimes: GTFSStopTime[];
  shapes: GTFSShape[];
  calendar: GTFSCalendar[];
  agencies: GTFSAgency[];
}

/**
 * Processed data bundle - ready for app consumption
 */
export interface ProcessedGTFSData {
  routes: ProcessedRoute[];
  shapes: Map<string, RouteShape>;     // Keyed by shape_id
  schedules: Map<string, ProcessedSchedule>;  // Keyed by trip_id
  stops: Map<string, GTFSStop>;        // Keyed by stop_id
}
