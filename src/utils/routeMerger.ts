import type { ProcessedRoute, ProcessedTrip } from '../types';

// ============================================================================
// Route Merge Configuration
// ============================================================================

/**
 * Configuration for merging multiple routes into one.
 * Routes with identical stops will be merged under the combined name.
 */
export interface RouteMergeGroup {
  /** Route IDs to merge together */
  routeIds: string[];
  /** The combined name for the merged route (e.g., "Illinois Zephyr / Carl Sandburg") */
  mergedName: string;
  /** Which route ID to use as the primary (for URL, color, etc.). If not specified, uses first. */
  primaryRouteId?: string;
}

/**
 * Default merge groups for known duplicate routes.
 * Add new groups here as needed.
 */
export const DEFAULT_MERGE_GROUPS: RouteMergeGroup[] = [
  
  // Illinois Zephyr, Carl Sandburg
  {
    routeIds: ['42957', '72'],
    mergedName: 'Illinois Zephyr / Carl Sandburg',
    primaryRouteId: '42957',
  },

  // Illini, Saluki
  {
    routeIds: ['56', '63'],
    mergedName: 'Illini / Saluki',
    primaryRouteId: '56',
  },
];

// ============================================================================
// Stop Comparison Utilities
// ============================================================================

/**
 * Extract unique stop IDs from a list of trips, ignoring sequence order.
 * Returns a sorted array of stop IDs for comparison.
 */
function getUniqueStopIds(trips: ProcessedTrip[]): string[] {
  const stopIds = new Set<string>();
  for (const trip of trips) {
    for (const stop of trip.stops) {
      stopIds.add(stop.stopId);
    }
  }
  return Array.from(stopIds).sort();
}

/**
 * Check if two sets of trips have identical stops.
 * Ignores the order of stops (since trains run in both directions).
 */
export function haveIdenticalStops(
  tripsA: ProcessedTrip[],
  tripsB: ProcessedTrip[]
): boolean {
  const stopsA = getUniqueStopIds(tripsA);
  const stopsB = getUniqueStopIds(tripsB);

  if (stopsA.length !== stopsB.length) {
    return false;
  }

  return stopsA.every((stop, i) => stop === stopsB[i]);
}

/**
 * Validate that all routes in a merge group have identical stops.
 * Returns true if all routes share the same stops.
 */
export function validateMergeGroup(
  routeIds: string[],
  schedules: Map<string, ProcessedTrip[]>
): boolean {
  if (routeIds.length < 2) {
    return true; // Nothing to merge
  }

  const allTrips = routeIds.map(id => schedules.get(id) || []);

  // Check that all routes have trips
  if (allTrips.some(trips => trips.length === 0)) {
    console.warn('Route merge validation: Some routes have no trips');
    return false;
  }

  // Compare first route's stops with all others
  const referenceTrips = allTrips[0];
  for (let i = 1; i < allTrips.length; i++) {
    if (!haveIdenticalStops(referenceTrips, allTrips[i])) {
      console.warn(
        `Route merge validation failed: Routes ${routeIds[0]} and ${routeIds[i]} have different stops`
      );
      return false;
    }
  }

  return true;
}

// ============================================================================
// Route Merging
// ============================================================================

/**
 * Merge multiple ProcessedRoute objects into one.
 * Combines train numbers, shape IDs, and direction options.
 * Uses the primary route for name, color, URL, etc.
 */
function mergeRouteObjects(
  routes: ProcessedRoute[],
  mergedName: string,
  primaryRouteId?: string
): ProcessedRoute {
  // Find the primary route (or use first)
  const primaryRoute = primaryRouteId
    ? routes.find(r => r.routeId === primaryRouteId) || routes[0]
    : routes[0];

  // Combine all train numbers
  const allTrainNumbers = new Set<string>();
  for (const route of routes) {
    for (const num of route.routeNumbers) {
      allTrainNumbers.add(num);
    }
  }

  // Combine all shape IDs, preferring non-empty shapes
  const allShapeIds = new Set<string>();
  for (const route of routes) {
    for (const shapeId of route.shapeIds) {
      if (shapeId) {
        allShapeIds.add(shapeId);
      }
    }
  }

  // Combine direction options (unique)
  const allDirectionOptions = new Set(
    routes.flatMap(r => r.directionOptions)
  );

  return {
    routeId: primaryRoute.routeId,
    routeName: mergedName,
    routeNumbers: Array.from(allTrainNumbers).sort(),
    directionAxis: primaryRoute.directionAxis,
    directionOptions: Array.from(allDirectionOptions),
    shapeIds: Array.from(allShapeIds),
    color: primaryRoute.color,
    url: primaryRoute.url,
    category: primaryRoute.category,
  };
}

/**
 * Merge schedules from multiple routes into the primary route ID.
 * The schedules from non-primary routes are reassigned to the primary route ID.
 */
function mergeSchedules(
  schedules: Map<string, ProcessedTrip[]>,
  routeIds: string[],
  primaryRouteId: string
): void {
  const mergedTrips: ProcessedTrip[] = [];

  for (const routeId of routeIds) {
    const routeTrips = schedules.get(routeId) || [];
    for (const trip of routeTrips) {
      // Reassign trip to primary route ID
      mergedTrips.push({
        ...trip,
        routeId: primaryRouteId,
      });
    }

    // Remove the original route schedules (except primary)
    if (routeId !== primaryRouteId) {
      schedules.delete(routeId);
    }
  }

  // Set merged trips on primary route
  schedules.set(primaryRouteId, mergedTrips);
}

/**
 * Find the best shape ID from a set of trips.
 * Prefers trips that have a non-empty shape ID.
 */
export function findBestShapeId(trips: ProcessedTrip[]): string | null {
  for (const trip of trips) {
    if (trip.shapeId && trip.shapeId.length > 0) {
      return trip.shapeId;
    }
  }
  return null;
}

// ============================================================================
// Main Merge Function
// ============================================================================

/**
 * Apply route merging based on the provided merge groups.
 *
 * This function:
 * 1. Validates that routes in each group have identical stops
 * 2. Merges the ProcessedRoute objects (combines names, train numbers, shapes)
 * 3. Reassigns schedules to the primary route ID
 * 4. Removes non-primary routes from the routes array
 *
 * @param routes - Array of ProcessedRoute objects (will be modified)
 * @param schedules - Map of route ID to ProcessedTrip array (will be modified)
 * @param mergeGroups - Configuration for which routes to merge
 * @returns The modified routes array
 */
export function applyRouteMerges(
  routes: ProcessedRoute[],
  schedules: Map<string, ProcessedTrip[]>,
  mergeGroups: RouteMergeGroup[] = DEFAULT_MERGE_GROUPS
): ProcessedRoute[] {
  console.log(`Applying ${mergeGroups.length} route merge group(s)...`);

  const routeIndex = new Map(routes.map(r => [r.routeId, r]));
  const routesToRemove = new Set<string>();

  for (const group of mergeGroups) {
    const { routeIds, mergedName, primaryRouteId } = group;

    // Find all routes in this group
    const groupRoutes = routeIds
      .map(id => routeIndex.get(id))
      .filter((r): r is ProcessedRoute => r !== undefined);

    if (groupRoutes.length < 2) {
      console.warn(
        `Merge group "${mergedName}": Found only ${groupRoutes.length} route(s), skipping`
      );
      continue;
    }

    // Validate that routes have identical stops
    if (!validateMergeGroup(routeIds, schedules)) {
      console.warn(
        `Merge group "${mergedName}": Routes have different stops, skipping merge`
      );
      continue;
    }

    // Determine primary route ID
    const primary = primaryRouteId || routeIds[0];

    console.log(
      `Merging routes [${routeIds.join(', ')}] into "${mergedName}" (primary: ${primary})`
    );

    // Merge the route objects
    const mergedRoute = mergeRouteObjects(groupRoutes, mergedName, primary);
    routeIndex.set(primary, mergedRoute);

    // Merge the schedules
    mergeSchedules(schedules, routeIds, primary);

    // Mark non-primary routes for removal
    for (const routeId of routeIds) {
      if (routeId !== primary) {
        routesToRemove.add(routeId);
      }
    }
  }

  // Remove non-primary routes from the array
  const mergedRoutes = routes.filter(r => !routesToRemove.has(r.routeId));

  // Update the merged routes in place
  for (let i = 0; i < mergedRoutes.length; i++) {
    const updated = routeIndex.get(mergedRoutes[i].routeId);
    if (updated) {
      mergedRoutes[i] = updated;
    }
  }

  console.log(
    `Route merging complete: ${routes.length} routes → ${mergedRoutes.length} routes`
  );

  return mergedRoutes;
}
