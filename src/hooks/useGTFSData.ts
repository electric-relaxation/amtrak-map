import { useMemo } from 'react';
import { useGTFSDataContext } from '../contexts/GTFSDataContext';
import type {
  ProcessedRoute,
  ProcessedSchedule,
  GTFSStop,
  DirectionAxis,
} from '../types';

// ============================================================================
// Main GTFS Data Hook
// ============================================================================

/**
 * Hook to access all GTFS data from context
 *
 * @returns Complete GTFS data including routes, schedules, stops, and loading state
 *
 * @example
 * ```tsx
 * const { routes, schedules, stops, loading, error } = useGTFSData();
 *
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 *
 * return <div>{routes.length} routes loaded</div>;
 * ```
 */
export function useGTFSData() {
  return useGTFSDataContext();
}

// ============================================================================
// Route-Specific Hooks
// ============================================================================

/**
 * Hook to get a specific route by ID
 *
 * @param routeId - The route_id to look up
 * @returns The ProcessedRoute or undefined if not found
 *
 * @example
 * ```tsx
 * const route = useRoute('96'); // California Zephyr
 * if (!route) return <div>Route not found</div>;
 *
 * return <div>{route.routeName}</div>;
 * ```
 */
export function useRoute(routeId: string): ProcessedRoute | undefined {
  const { routes } = useGTFSDataContext();

  return useMemo(() => {
    return routes.find(r => r.routeId === routeId);
  }, [routes, routeId]);
}

/**
 * Hook to get all routes with optional filtering
 *
 * @param options - Filter options
 * @returns Filtered array of ProcessedRoute
 *
 * @example
 * ```tsx
 * // Get all east-west routes
 * const ewRoutes = useAllRoutes({ directionAxis: 'east-west' });
 *
 * // Search for routes by name
 * const searchResults = useAllRoutes({ searchQuery: 'zephyr' });
 * ```
 */
export function useAllRoutes(options?: {
  directionAxis?: DirectionAxis;
  searchQuery?: string;
}): ProcessedRoute[] {
  const { routes } = useGTFSDataContext();

  return useMemo(() => {
    let filtered = routes;

    // Filter by direction axis
    if (options?.directionAxis) {
      filtered = filtered.filter(r => r.directionAxis === options.directionAxis);
    }

    // Search by name
    if (options?.searchQuery) {
      const query = options.searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.routeName.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [routes, options?.directionAxis, options?.searchQuery]);
}

// ============================================================================
// Schedule-Specific Hooks
// ============================================================================

/**
 * Hook to get all schedules for a specific route
 *
 * @param routeId - The route_id to get schedules for
 * @returns Array of ProcessedSchedule for this route
 *
 * @example
 * ```tsx
 * const schedules = useRouteSchedules('96');
 * console.log(`${schedules.length} trips for this route`);
 * ```
 */
export function useRouteSchedules(routeId: string): ProcessedSchedule[] {
  const { schedules } = useGTFSDataContext();

  return useMemo(() => {
    return schedules.get(routeId) || [];
  }, [schedules, routeId]);
}

/**
 * Hook to get a specific schedule for a route/direction
 *
 * @param routeId - The route_id to get schedule for
 * @param direction - The direction (trip_headsign value or 'northbound'/'southbound'/'eastbound'/'westbound')
 * @param tripIndex - Optional index if multiple trips match (defaults to 0)
 * @returns ProcessedSchedule or undefined if not found
 *
 * @example
 * ```tsx
 * // Get westbound California Zephyr schedule
 * const schedule = useRouteSchedule('96', 'Emeryville');
 *
 * if (!schedule) return <div>No schedule found</div>;
 *
 * return (
 *   <div>
 *     {schedule.stops.map(stop => (
 *       <div key={stop.stopId}>
 *         {stop.stopName} - {stop.arrivalTime}
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useRouteSchedule(
  routeId: string,
  direction: string,
  tripIndex: number = 0
): ProcessedSchedule | undefined {
  const { schedules } = useGTFSDataContext();

  return useMemo(() => {
    const routeSchedules = schedules.get(routeId) || [];

    // Try to match by trip_headsign first
    let matchingSchedules = routeSchedules.filter(s =>
      s.direction.toLowerCase().includes(direction.toLowerCase())
    );

    // If no matches, try matching by direction type
    if (matchingSchedules.length === 0) {
      const directionLower = direction.toLowerCase();

      // For generic direction matching, look at the first and last stops
      matchingSchedules = routeSchedules.filter(s => {
        const firstStop = s.stops[0];
        const lastStop = s.stops[s.stops.length - 1];

        if (!firstStop || !lastStop) return false;

        // Calculate rough bearing between first and last stop
        const latDiff = lastStop.coordinates[0] - firstStop.coordinates[0];
        const lonDiff = lastStop.coordinates[1] - firstStop.coordinates[1];

        if (directionLower === 'northbound') return latDiff > 0;
        if (directionLower === 'southbound') return latDiff < 0;
        if (directionLower === 'eastbound') return lonDiff > 0;
        if (directionLower === 'westbound') return lonDiff < 0;

        return false;
      });
    }

    // Return the requested trip index, or undefined if not found
    return matchingSchedules[tripIndex];
  }, [schedules, routeId, direction, tripIndex]);
}

/**
 * Hook to get all unique train numbers for a route
 *
 * @param routeId - The route_id to get train numbers for
 * @returns Array of train numbers (as strings)
 *
 * @example
 * ```tsx
 * const trainNumbers = useRouteTrainNumbers('96');
 * // Returns: ['5', '6']
 * ```
 */
export function useRouteTrainNumbers(routeId: string): string[] {
  const route = useRoute(routeId);
  return route?.routeNumbers || [];
}

/**
 * Hook to get schedules filtered by operating days
 *
 * @param routeId - The route_id to filter
 * @param date - Date to check (defaults to today)
 * @returns Array of schedules operating on the given date
 *
 * @example
 * ```tsx
 * const today = new Date();
 * const todaysSchedules = useSchedulesForDate('96', today);
 * ```
 */
export function useSchedulesForDate(
  routeId: string,
  date: Date = new Date()
): ProcessedSchedule[] {
  const { schedules } = useGTFSDataContext();

  return useMemo(() => {
    const routeSchedules = schedules.get(routeId) || [];
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const dayNames: (keyof ProcessedSchedule['operatingDays'])[] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];

    const dayName = dayNames[dayOfWeek];

    // Filter schedules that operate on this day of the week
    return routeSchedules.filter(schedule => {
      // Check if operates on this day of the week
      if (!schedule.operatingDays[dayName]) {
        return false;
      }

      // Check if date is within service period
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      if (dateStr < schedule.startDate || dateStr > schedule.endDate) {
        return false;
      }

      return true;
    });
  }, [schedules, routeId, date]);
}

// ============================================================================
// Stop-Specific Hooks
// ============================================================================

/**
 * Hook to get a specific stop by ID
 *
 * @param stopId - The stop_id to look up (3-letter code)
 * @returns GTFSStop or undefined if not found
 *
 * @example
 * ```tsx
 * const chicagoStation = useStop('CHI');
 * if (!chicagoStation) return null;
 *
 * return (
 *   <div>
 *     {chicagoStation.stop_name}
 *     ({chicagoStation.stop_lat}, {chicagoStation.stop_lon})
 *   </div>
 * );
 * ```
 */
export function useStop(stopId: string): GTFSStop | undefined {
  const { stops } = useGTFSDataContext();

  return useMemo(() => {
    return stops.get(stopId);
  }, [stops, stopId]);
}

/**
 * Hook to get all stops for a specific route
 *
 * @param routeId - The route_id to get stops for
 * @returns Array of unique GTFSStop for this route
 *
 * @example
 * ```tsx
 * const routeStops = useRouteStops('96');
 * return (
 *   <ul>
 *     {routeStops.map(stop => (
 *       <li key={stop.stop_id}>{stop.stop_name}</li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useRouteStops(routeId: string): GTFSStop[] {
  const { schedules, stops } = useGTFSDataContext();

  return useMemo(() => {
    const routeSchedules = schedules.get(routeId) || [];

    if (routeSchedules.length === 0) {
      return [];
    }

    // Get all unique stop IDs from the first schedule
    // (All trips for a route typically have the same stops)
    const firstSchedule = routeSchedules[0];
    const uniqueStopIds = new Set(firstSchedule.stops.map(s => s.stopId));

    // Convert to GTFSStop array
    return Array.from(uniqueStopIds)
      .map(stopId => stops.get(stopId))
      .filter((stop): stop is GTFSStop => stop !== undefined);
  }, [schedules, stops, routeId]);
}

/**
 * Hook to search stops by name
 *
 * @param searchQuery - Search string to match against stop names
 * @returns Array of matching GTFSStop
 *
 * @example
 * ```tsx
 * const results = useStopSearch('chicago');
 * // Returns all stops with "chicago" in the name
 * ```
 */
export function useStopSearch(searchQuery: string): GTFSStop[] {
  const { stops } = useGTFSDataContext();

  return useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) {
      return [];
    }

    const query = searchQuery.toLowerCase();
    const allStops = Array.from(stops.values());

    return allStops.filter(stop =>
      stop.stop_name.toLowerCase().includes(query) ||
      stop.stop_id.toLowerCase().includes(query)
    );
  }, [stops, searchQuery]);
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get loading and error state
 *
 * @returns Object with loading and error state
 *
 * @example
 * ```tsx
 * const { loading, error } = useGTFSLoadingState();
 *
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 * ```
 */
export function useGTFSLoadingState() {
  const { loading, error } = useGTFSDataContext();
  return { loading, error };
}

/**
 * Hook to refresh GTFS data
 *
 * @returns Function to trigger data refresh
 *
 * @example
 * ```tsx
 * const refresh = useGTFSRefresh();
 *
 * return (
 *   <button onClick={refresh}>
 *     Refresh Data
 *   </button>
 * );
 * ```
 */
export function useGTFSRefresh() {
  const { refresh } = useGTFSDataContext();
  return refresh;
}

/**
 * Hook to get GTFS data statistics
 *
 * @returns Object with counts and statistics
 *
 * @example
 * ```tsx
 * const stats = useGTFSStats();
 * console.log(`${stats.routeCount} routes, ${stats.stopCount} stops`);
 * ```
 */
export function useGTFSStats() {
  const { routes, schedules, stops } = useGTFSDataContext();

  return useMemo(() => {
    const totalSchedules = Array.from(schedules.values()).reduce(
      (sum, scheduleArray) => sum + scheduleArray.length,
      0
    );

    return {
      routeCount: routes.length,
      stopCount: stops.size,
      scheduleCount: totalSchedules,
      routesWithSchedules: schedules.size,
    };
  }, [routes, schedules, stops]);
}
