import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { loadAllGTFSData } from '../utils/gtfsLoader';
import {
  processRoutes,
  processSchedules,
  validateProcessedRoutes,
  validateProcessedTrips,
  buildStopIndex,
} from '../utils/gtfsProcessor';
import { applyRouteMerges } from '../utils/routeMerger';
import type {
  ProcessedRoute,
  ProcessedTrip,
  GTFSStop,
  GTFSData,
  RouteCategory,
} from '../types';
import routeCategoriesData from '../data/route-categories.txt?raw';

// ============================================================================
// Route Categories Helper
// ============================================================================

function parseRouteCategories(): Map<string, RouteCategory> {
  const categories = new Map<string, RouteCategory>();
  const lines = routeCategoriesData.split('\n');

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length >= 6) {
      const routeId = parts[0];
      const category = parts[5] as RouteCategory;
      if (routeId && category) {
        categories.set(routeId, category);
      }
    }
  }

  return categories;
}

function applyCategoriesToRoutes(routes: ProcessedRoute[]): ProcessedRoute[] {
  const categories = parseRouteCategories();

  return routes.map(route => ({
    ...route,
    category: categories.get(route.routeId),
  }));
}

// ============================================================================
// Context Types
// ============================================================================

interface GTFSDataContextType {
  // Processed data
  routes: ProcessedRoute[];
  schedules: Map<string, ProcessedTrip[]>;
  stops: Map<string, GTFSStop>;

  // Raw GTFS data (for advanced use cases)
  rawData: GTFSData | null;

  // State
  loading: boolean;
  error: string | null;

  // Utility
  refresh: () => Promise<void>;
}

// ============================================================================
// Context Creation
// ============================================================================

const GTFSDataContext = createContext<GTFSDataContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface GTFSDataProviderProps {
  children: ReactNode;
  /** Whether to load shapes.txt (16MB file) - defaults to false */
  loadShapes?: boolean;
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Custom error component */
  errorComponent?: (error: string, retry: () => void) => ReactNode;
}

export function GTFSDataProvider({
  children,
  loadShapes = true,
  loadingComponent,
  errorComponent,
}: GTFSDataProviderProps) {
  const [routes, setRoutes] = useState<ProcessedRoute[]>([]);
  const [schedules, setSchedules] = useState<Map<string, ProcessedTrip[]>>(new Map());
  const [stops, setStops] = useState<Map<string, GTFSStop>>(new Map());
  const [rawData, setRawData] = useState<GTFSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('GTFSDataProvider: Loading GTFS data...');
      const startTime = performance.now();

      // Load raw GTFS data
      const data = await loadAllGTFSData({
        filterToAmtrakTrains: true,
        loadShapes,
        loadStopTimes: true,
      });

      setRawData(data);

      // Build stop index
      const stopIndex = buildStopIndex(data.stops);
      setStops(stopIndex);

      // Process routes
      console.log('GTFSDataProvider: Processing routes...');
      const processedRoutes = processRoutes(
        data.routes,
        data.trips,
        data.shapes,
        data.stops,
        data.stopTimes
      );

      // Apply route categories
      const routesWithCategories = applyCategoriesToRoutes(processedRoutes);
      validateProcessedRoutes(routesWithCategories);

      // Process schedules
      console.log('GTFSDataProvider: Processing schedules...');
      const ProcessedTrips = processSchedules(
        data.trips,
        data.stopTimes,
        data.stops,
        data.calendar
      );

      // Merge duplicate routes (e.g., Illinois Zephyr + Carl Sandburg)
      console.log('GTFSDataProvider: Merging duplicate routes...');
      const mergedRoutes = applyRouteMerges(routesWithCategories, ProcessedTrips);
      setRoutes(mergedRoutes);

      validateProcessedTrips(ProcessedTrips);
      setSchedules(ProcessedTrips);

      const endTime = performance.now();
      console.log(
        `GTFSDataProvider: Data loaded and processed in ${((endTime - startTime) / 1000).toFixed(2)}s`
      );
      console.log(`GTFSDataProvider: ${processedRoutes.length} routes, ${data.stops.length} stops`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading GTFS data';
      console.error('GTFSDataProvider: Failed to load GTFS data:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadShapes]); // Reload if loadShapes changes

  // Loading state
  if (loading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="flex items-center justify-center w-full h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Loading Route Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Loading Amtrak routes and schedules...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    if (errorComponent) {
      return <>{errorComponent(error, loadData)}</>;
    }

    return (
      <div className="flex items-center justify-center w-full h-screen bg-white dark:bg-gray-900">
        <div className="text-center max-w-md p-8">
          <div className="mb-4 text-red-600 dark:text-red-400">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Failed to Load Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Provide data to children
  const contextValue: GTFSDataContextType = {
    routes,
    schedules,
    stops,
    rawData,
    loading,
    error,
    refresh: loadData,
  };

  return (
    <GTFSDataContext.Provider value={contextValue}>
      {children}
    </GTFSDataContext.Provider>
  );
}

// ============================================================================
// Hook to access context
// ============================================================================

/**
 * Hook to access GTFS data context
 * @throws Error if used outside of GTFSDataProvider
 */
export function useGTFSDataContext(): GTFSDataContextType {
  const context = useContext(GTFSDataContext);
  if (!context) {
    throw new Error('useGTFSDataContext must be used within GTFSDataProvider');
  }
  return context;
}
