import { useMemo } from 'react';
import { useGTFSData } from '../hooks/useGTFSData';
import RouteLayer from './RouteLayer';
import type { AppSettings, RouteSettings, ProcessedSchedule } from '../types';

interface AllRoutesLayerProps {
  selectedDate: Date;
  globalSettings: AppSettings;
  routeSettings?: Map<string, RouteSettings>;
}

/**
 * Check if a schedule is valid for the selected date
 */
function isScheduleValidForDate(schedule: ProcessedSchedule, date: Date): boolean {
  // Check date range
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD format

  if (dateStr < schedule.startDate || dateStr > schedule.endDate) {
    return false;
  }

  // Check day of week
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayNames: (keyof typeof schedule.operatingDays)[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];

  const dayName = dayNames[dayOfWeek];
  return schedule.operatingDays[dayName];
}

/**
 * Get the appropriate schedule for a route based on settings and date
 */
function getScheduleForRoute(
  _routeId: string,
  allSchedules: ProcessedSchedule[],
  globalSettings: AppSettings,
  routeSettings: RouteSettings | undefined,
  selectedDate: Date,
  routeDirectionAxis: 'east-west' | 'north-south'
): ProcessedSchedule | null {
  // Filter schedules that are valid for the selected date
  const validSchedules = allSchedules.filter(schedule =>
    isScheduleValidForDate(schedule, selectedDate)
  );

  if (validSchedules.length === 0) {
    return null;
  }

  // Determine which direction to use
  let desiredDirection: string;

  if (routeSettings) {
    // Use route-specific settings if available
    desiredDirection = routeSettings.selectedDirection;
  } else {
    // Use global settings based on route's direction axis
    if (routeDirectionAxis === 'east-west') {
      desiredDirection = globalSettings.globalEastWestDirection;
    } else {
      desiredDirection = globalSettings.globalNorthSouthDirection;
    }
  }

  // Filter by direction - match against trip_headsign or direction
  let directionFilteredSchedules = validSchedules.filter(schedule =>
    schedule.direction.toLowerCase().includes(desiredDirection.toLowerCase())
  );

  // If no exact match, try matching by cardinal direction
  if (directionFilteredSchedules.length === 0) {
    directionFilteredSchedules = validSchedules.filter(schedule => {
      const firstStop = schedule.stops[0];
      const lastStop = schedule.stops[schedule.stops.length - 1];

      if (!firstStop || !lastStop) return false;

      const latDiff = lastStop.coordinates[0] - firstStop.coordinates[0];
      const lonDiff = lastStop.coordinates[1] - firstStop.coordinates[1];

      // Check if the actual direction matches the desired direction
      if (desiredDirection === 'northbound') return latDiff > 0;
      if (desiredDirection === 'southbound') return latDiff < 0;
      if (desiredDirection === 'eastbound') return lonDiff > 0;
      if (desiredDirection === 'westbound') return lonDiff < 0;

      return false;
    });
  }

  if (directionFilteredSchedules.length === 0) {
    return null;
  }

  // If there's a specific train number requested, use that
  if (routeSettings?.selectedTrainNumber) {
    const trainSchedule = directionFilteredSchedules.find(
      schedule => schedule.trainNumber === routeSettings.selectedTrainNumber
    );
    if (trainSchedule) {
      return trainSchedule;
    }
  }

  // Return the first matching schedule
  return directionFilteredSchedules[0];
}

/**
 * AllRoutesLayer component
 * Renders all train routes on the map with sunlight-based coloring
 */
const AllRoutesLayer = ({
  selectedDate,
  globalSettings,
  routeSettings = new Map(),
}: AllRoutesLayerProps) => {
  const { routes, schedules } = useGTFSData();

  // Get schedules for all routes and memoize
  const routeScheduleMap = useMemo(() => {
    const map = new Map<string, ProcessedSchedule | null>();

    routes.forEach(route => {
      // Get all schedules for this route
      const allSchedules = schedules.get(route.routeId) || [];

      // Get the appropriate schedule based on settings
      const routeSettingsForRoute = routeSettings.get(route.routeId);
      const schedule = getScheduleForRoute(
        route.routeId,
        allSchedules,
        globalSettings,
        routeSettingsForRoute,
        selectedDate,
        route.directionAxis
      );

      map.set(route.routeId, schedule);
    });

    return map;
  }, [routes, schedules, routeSettings, globalSettings, selectedDate]);

  return (
    <>
      {routes.map(route => {
        const schedule = routeScheduleMap.get(route.routeId);

        if (!schedule) {
          // No valid schedule for this route on this date/direction
          return null;
        }

        return (
          <RouteLayer
            key={route.routeId}
            route={route}
            schedule={schedule}
            selectedDate={selectedDate}
            isVisible={true}
          />
        );
      })}
    </>
  );
};

export default AllRoutesLayer;
