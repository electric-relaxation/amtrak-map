// Station representation
export interface AmtrakStation {
  code: string; // 3-letter station code (e.g., "CHI")
  name: string; // Full station name
  coordinates: {
    lat: number;
    lng: number;
  };
}

// Route direction configuration
export interface RouteDirection {
  primary: string; // e.g., "east-west" or "north-south"
  options: string[]; // e.g., ["westbound", "eastbound"]
}

// Train route representation
export interface AmtrakRoute {
  id: string; // e.g., "empire-builder"
  name: string; // e.g., "Empire Builder"
  routeNumber: number | number[]; // Single number or array for multiple trains
  direction: RouteDirection;
  stations: string[]; // Array of station codes
}

// Schedule stop at a station
export interface ScheduleStop {
  stationCode: string;
  arrivalTime?: string; // 24-hour format "HH:MM", optional for first stop
  departureTime?: string; // 24-hour format "HH:MM", optional for last stop
  day: number; // 1 = first day, 2 = second day, etc.
}

// Complete schedule for a route/train
export interface RouteSchedule {
  routeId: string;
  trainNumber: number;
  direction: string; // e.g., "westbound", "eastbound"
  stops: ScheduleStop[];
}

// Global application settings
export interface AppSettings {
  selectedDate: Date;
  globalEastWestDirection: "eastbound" | "westbound";
  globalNorthSouthDirection: "northbound" | "southbound";
}

// Per-route settings
export interface RouteSettings {
  routeId: string;
  selectedTrainNumber: number;
  selectedDirection: string;
}

// Sunlight calculation data for map visualization
export interface SunlightSegment {
  startCoord: [number, number]; // [lat, lng]
  endCoord: [number, number]; // [lat, lng]
  sunlightPhase: "day" | "night" | "dawn" | "dusk";
  sunlightIntensity: number; // 0-1 for gradient coloring
}
