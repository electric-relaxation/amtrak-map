import {
  useGTFSData,
  useAllRoutes,
  useRoute,
  useRouteSchedule,
  useStop,
  useGTFSStats,
} from '../hooks/useGTFSData';
import { parseGTFSTime } from '../utils/gtfsLoader';
import { determineDirectionAxis, simplifyShape } from '../utils/gtfsProcessor';

/**
 * Test component to verify GTFS data loading via hooks
 * This component displays GTFS data statistics and samples
 */
const GTFSTest = () => {
  const { routes, rawData } = useGTFSData();
  const stats = useGTFSStats();
  const allRoutes = useAllRoutes();

  // Get a sample route and its data
  const sampleRoute = useRoute(routes[0]?.routeId || '');
  const sampleSchedule = useRouteSchedule(
    routes[0]?.routeId || '',
    routes[0]?.directionOptions[0] || ''
  );
  const sampleStop = useStop('CHI');

  // Raw data samples (if available)
  const rawRoute = rawData?.routes[0];
  const sampleCalendar = rawData?.calendar[0];

  // Calculate services operating today
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayName = dayNames[dayOfWeek];
  const servicesOperatingToday = rawData?.calendar.filter(cal => {
    const dayKey = todayName as keyof typeof cal;
    return cal[dayKey] === 1 || cal[dayKey] === '1';
  }).length || 0;

  // Test time parsing
  const testTime = parseGTFSTime('25:30:00');

  // Test shape simplification
  const testCoordinates: [number, number][] = [
    [40.0, -100.0],
    [40.1, -100.1],
    [40.2, -100.2],
    [40.3, -100.3],
  ];
  const simplifiedCoordinates = simplifyShape(testCoordinates, 0.05);
  const directionAxis = determineDirectionAxis(testCoordinates);

  return (
    <div className="p-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-bold mb-6">GTFS Data Loaded via Context & Hooks</h1>

      {/* Statistics */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <div className="text-3xl font-bold text-blue-600">{stats.routeCount}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Routes (useGTFSStats)</div>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <div className="text-3xl font-bold text-green-600">{stats.stopCount}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Stops (via Context)</div>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <div className="text-3xl font-bold text-purple-600">{stats.routesWithSchedules}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Routes w/ Schedules</div>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <div className="text-3xl font-bold text-orange-600">{stats.scheduleCount}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Schedules</div>
        </div>
      </div>

      {/* Sample Data */}
      <div className="space-y-6">
        {/* Hook Usage Examples */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Hook Usage Examples</h2>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded font-mono text-sm space-y-1">
            <div>✅ useGTFSData() - Access full context</div>
            <div>✅ useAllRoutes() - Get all {allRoutes.length} routes</div>
            <div>✅ useRoute(id) - Get specific route</div>
            <div>✅ useRouteSchedule(id, dir) - Get schedule for route/direction</div>
            <div>✅ useStop(id) - Get station by code</div>
            <div>✅ useGTFSStats() - Get data statistics</div>
          </div>
        </section>

        {sampleRoute && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Sample Route (via useRoute hook)</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded font-mono text-sm">
              <div><strong>Name:</strong> {sampleRoute.routeName}</div>
              <div><strong>ID:</strong> {sampleRoute.routeId}</div>
              <div><strong>Direction Axis:</strong> {sampleRoute.directionAxis}</div>
              <div><strong>Direction Options:</strong> {sampleRoute.directionOptions.join(', ')}</div>
              <div><strong>Train Numbers:</strong> {sampleRoute.routeNumbers.slice(0, 5).join(', ')}</div>
            </div>
          </section>
        )}

        {sampleStop && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Sample Station (via useStop hook)</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded font-mono text-sm">
              <div><strong>Code:</strong> {sampleStop.stop_id}</div>
              <div><strong>Name:</strong> {sampleStop.stop_name}</div>
              <div><strong>Location:</strong> {sampleStop.stop_lat.toFixed(6)}, {sampleStop.stop_lon.toFixed(6)}</div>
              <div><strong>Timezone:</strong> {sampleStop.stop_timezone}</div>
            </div>
          </section>
        )}

        {rawRoute && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Raw GTFS Route (from context)</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded font-mono text-sm">
              <div><strong>ID:</strong> {rawRoute.route_id}</div>
              <div><strong>Name:</strong> {rawRoute.route_long_name}</div>
              <div><strong>URL:</strong> <a href={rawRoute.route_url} className="text-blue-600 dark:text-blue-400" target="_blank" rel="noopener noreferrer">{rawRoute.route_url}</a></div>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-2">GTFS Time Parsing Test</h2>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded font-mono text-sm">
            <div><strong>Input:</strong> "25:30:00"</div>
            <div><strong>Normalized Hours:</strong> {testTime.hours}</div>
            <div><strong>Minutes:</strong> {testTime.minutes}</div>
            <div><strong>Day Offset:</strong> {testTime.dayOffset} (next day)</div>
            <div><strong>Total Minutes:</strong> {testTime.totalMinutes}</div>
          </div>
        </section>

        {sampleCalendar && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Service Calendar</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded font-mono text-sm">
              <div><strong>Total Service Patterns:</strong> {rawData?.calendar.length || 0}</div>
              <div><strong>Operating Today:</strong> {servicesOperatingToday}</div>
              <div className="mt-2">
                <div><strong>Sample Calendar Entry:</strong></div>
                <div>Service ID: {sampleCalendar.service_id}</div>
                <div>
                  Days: {sampleCalendar.monday ? 'M' : '-'}
                  {sampleCalendar.tuesday ? 'T' : '-'}
                  {sampleCalendar.wednesday ? 'W' : '-'}
                  {sampleCalendar.thursday ? 'T' : '-'}
                  {sampleCalendar.friday ? 'F' : '-'}
                  {sampleCalendar.saturday ? 'S' : '-'}
                  {sampleCalendar.sunday ? 'S' : '-'}
                </div>
                <div>Valid: {sampleCalendar.start_date} to {sampleCalendar.end_date}</div>
              </div>
            </div>
          </section>
        )}

        {/* Schedule Sample via Hook */}
        {sampleSchedule && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Sample Schedule (via useRouteSchedule hook)</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded font-mono text-sm">
              <div><strong>Train #:</strong> {sampleSchedule.trainNumber}</div>
              <div><strong>Direction:</strong> {sampleSchedule.direction}</div>
              <div><strong>Stops:</strong> {sampleSchedule.stops.length} stops</div>
              <div className="mt-2">
                <div><strong>First Stop:</strong> {sampleSchedule.stops[0].stopName} at {sampleSchedule.stops[0].departureTime} (Day {sampleSchedule.stops[0].dayOffset})</div>
                <div><strong>Last Stop:</strong> {sampleSchedule.stops[sampleSchedule.stops.length - 1].stopName} at {sampleSchedule.stops[sampleSchedule.stops.length - 1].arrivalTime} (Day {sampleSchedule.stops[sampleSchedule.stops.length - 1].dayOffset})</div>
              </div>
              <div className="mt-2">
                <strong>Operating Days:</strong>{' '}
                {Object.entries(sampleSchedule.operatingDays)
                  .filter(([_, operates]) => operates)
                  .map(([day]) => day.substring(0, 3))
                  .join(', ')}
              </div>
            </div>
          </section>
        )}

        {/* Processing Tests */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Processing Utilities Test</h2>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded font-mono text-sm space-y-2">
            <div>
              <strong>Direction Axis Detection:</strong> {directionAxis}
              <div className="text-xs text-gray-600 dark:text-gray-400 ml-4">
                Test coordinates: {testCoordinates.map(c => `(${c[0]}, ${c[1]})`).join(' → ')}
              </div>
            </div>
            <div>
              <strong>Shape Simplification:</strong>
              <div className="text-xs text-gray-600 dark:text-gray-400 ml-4">
                Original: {testCoordinates.length} points → Simplified: {simplifiedCoordinates.length} points
              </div>
            </div>
          </div>
        </section>

        {/* Routes via Hook */}
        <section>
          <h2 className="text-lg font-semibold mb-2">All Routes (via useAllRoutes hook)</h2>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
            <ul className="space-y-2 text-sm">
              {allRoutes.slice(0, 10).map(route => (
                <li key={route.routeId} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                  <div><strong>{route.routeName}</strong></div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {route.directionAxis} • {route.directionOptions.join(' / ')} • {route.routeNumbers.length} train(s)
                  </div>
                </li>
              ))}
            </ul>
            {allRoutes.length > 10 && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                ...and {allRoutes.length - 10} more routes
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Context Info */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>✓ GTFS Data Context Active:</strong> All data is loaded via <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">GTFSDataProvider</code> and accessed through custom hooks.
          The provider handles loading states, error handling, and data caching automatically.
        </p>
      </div>

      {/* Note about shapes */}
      <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Note:</strong> Shapes data (16MB) was not loaded.
          To load shapes, pass <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">loadShapes={'{true}'}</code> to GTFSDataProvider.
        </p>
      </div>
    </div>
  );
};

export default GTFSTest;
