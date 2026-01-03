import { useState } from 'react';
import { useGTFSData, useRoute, useRouteSchedule } from '../hooks/useGTFSData';
import {
  getTrainPositionAtTime,
  calculateRouteSegmentColors,
  getSunlightInfo,
} from '../utils/sunlight';

/**
 * Test component to verify sunlight calculations with GTFS data
 * This component demonstrates sunlight calculation functions
 */
const SunlightTest = () => {
  const { routes, rawData } = useGTFSData();
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [testTime, setTestTime] = useState<Date>(new Date());

  // Get route and schedule data
  const route = useRoute(selectedRouteId || routes[0]?.routeId || '');
  const schedule = useRouteSchedule(
    selectedRouteId || routes[0]?.routeId || '',
    route?.directionOptions[0] || ''
  );

  // Get shape coordinates if available
  const shapeCoords = schedule?.shapeId && rawData?.shapes
    ? rawData.shapes
        .filter(s => s.shape_id === schedule.shapeId)
        .sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence)
        .map(s => [s.shape_pt_lat, s.shape_pt_lon] as [number, number])
    : undefined;

  // Calculate train position at test time
  const trainPosition = schedule
    ? getTrainPositionAtTime(schedule, testTime, selectedDate)
    : null;

  // Calculate route segments
  const segments = route && schedule
    ? calculateRouteSegmentColors(route, schedule, selectedDate, shapeCoords, 200)
    : [];

  // Debug logging
  if (route && schedule) {
    if (segments.length === 0) {
      console.warn('No segments calculated despite having route and schedule', {
        routeId: route.routeId,
        stopCount: schedule.stops.length,
        shapeCoordCount: shapeCoords?.length || 0,
      });
    } else {
      console.log('Segments calculated:', {
        count: segments.length,
        phases: {
          day: segments.filter(s => s.sunlightPhase === 'day').length,
          night: segments.filter(s => s.sunlightPhase === 'night').length,
          dawn: segments.filter(s => s.sunlightPhase === 'dawn').length,
          dusk: segments.filter(s => s.sunlightPhase === 'dusk').length,
        },
        sampleSegments: segments.slice(0, 3).map(s => ({
          phase: s.sunlightPhase,
          intensity: s.sunlightIntensity
        }))
      });
    }
  }

  // Get sunlight info at train position
  const sunlightInfo = trainPosition
    ? getSunlightInfo([trainPosition.lat, trainPosition.lng], testTime)
    : null;

  // Count segments by phase
  const phaseCount = {
    day: segments.filter(s => s.sunlightPhase === 'day').length,
    night: segments.filter(s => s.sunlightPhase === 'night').length,
    dawn: segments.filter(s => s.sunlightPhase === 'dawn').length,
    dusk: segments.filter(s => s.sunlightPhase === 'dusk').length,
  };

  const handleRouteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRouteId(e.target.value);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(e.target.value));
    setTestTime(new Date(e.target.value));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(':');
    const newTime = new Date(selectedDate);
    newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    setTestTime(newTime);
  };

  return (
    <div className="p-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-bold mb-6">Sunlight Calculation Test</h1>

      {/* Controls */}
      <div className="mb-8 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Select Route</label>
          <select
            value={selectedRouteId || routes[0]?.routeId || ''}
            onChange={handleRouteChange}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
          >
            {routes.slice(0, 10).map(r => (
              <option key={r.routeId} value={r.routeId}>
                {r.routeName}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Travel Date</label>
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={handleDateChange}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Test Time</label>
            <input
              type="time"
              value={testTime.toTimeString().slice(0, 5)}
              onChange={handleTimeChange}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-6">
        {/* Route Info */}
        {route && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Route Information</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded font-mono text-sm">
              <div><strong>Name:</strong> {route.routeName}</div>
              <div><strong>ID:</strong> {route.routeId}</div>
              <div><strong>Direction Axis:</strong> {route.directionAxis}</div>
            </div>
          </section>
        )}

        {/* Schedule Info */}
        {schedule && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Schedule Information</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded font-mono text-sm">
              <div><strong>Train #:</strong> {schedule.trainNumber}</div>
              <div><strong>Direction:</strong> {schedule.direction}</div>
              <div><strong>Stops:</strong> {schedule.stops.length}</div>
              <div><strong>First Stop:</strong> {schedule.stops[0]?.stopName} at {schedule.stops[0]?.departureTime}</div>
              <div><strong>Last Stop:</strong> {schedule.stops[schedule.stops.length - 1]?.stopName} at {schedule.stops[schedule.stops.length - 1]?.arrivalTime}</div>
              <div><strong>Shape Coords:</strong> {shapeCoords?.length || 0} points {shapeCoords ? '(using shape data)' : '(using stop coords)'}</div>
            </div>
          </section>
        )}

        {/* Train Position */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Train Position at {testTime.toLocaleTimeString()}</h2>
          {trainPosition ? (
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded font-mono text-sm">
              <div><strong>Latitude:</strong> {trainPosition.lat.toFixed(6)}</div>
              <div><strong>Longitude:</strong> {trainPosition.lng.toFixed(6)}</div>
              <div><strong>Between Stops:</strong> {trainPosition.nearestStops[0]} → {trainPosition.nearestStops[1]}</div>
            </div>
          ) : (
            <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded text-sm">
              Train is not in transit at this time (either hasn't departed or has already arrived)
            </div>
          )}
        </section>

        {/* Sunlight Info */}
        {sunlightInfo && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Sunlight at Train Position</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded font-mono text-sm space-y-2">
              <div>
                <strong>Phase:</strong>{' '}
                <span
                  className={
                    sunlightInfo.phase === 'day' ? 'text-yellow-600 dark:text-yellow-400' :
                    sunlightInfo.phase === 'night' ? 'text-blue-600 dark:text-blue-400' :
                    sunlightInfo.phase === 'dawn' ? 'text-orange-600 dark:text-orange-400' :
                    'text-purple-600 dark:text-purple-400'
                  }
                >
                  {sunlightInfo.phase.toUpperCase()}
                </span>
              </div>
              <div><strong>Intensity:</strong> {(sunlightInfo.intensity * 100).toFixed(1)}%</div>
              <div className="mt-2 text-xs">
                <div><strong>Sunrise:</strong> {sunlightInfo.sunTimes.sunrise.toLocaleTimeString()}</div>
                <div><strong>Sunset:</strong> {sunlightInfo.sunTimes.sunset.toLocaleTimeString()}</div>
                <div><strong>Dawn:</strong> {sunlightInfo.sunTimes.dawn.toLocaleTimeString()}</div>
                <div><strong>Dusk:</strong> {sunlightInfo.sunTimes.dusk.toLocaleTimeString()}</div>
              </div>
            </div>
          </section>
        )}

        {/* Route Segments */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Route Sunlight Segments</h2>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded font-mono text-sm space-y-2">
            <div><strong>Total Segments:</strong> {segments.length}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              <div className="text-yellow-600 dark:text-yellow-400">
                <strong>Day:</strong> {phaseCount.day} ({segments.length > 0 ? ((phaseCount.day / segments.length) * 100).toFixed(1) : 0}%)
              </div>
              <div className="text-blue-600 dark:text-blue-400">
                <strong>Night:</strong> {phaseCount.night} ({segments.length > 0 ? ((phaseCount.night / segments.length) * 100).toFixed(1) : 0}%)
              </div>
              <div className="text-orange-600 dark:text-orange-400">
                <strong>Dawn:</strong> {phaseCount.dawn} ({segments.length > 0 ? ((phaseCount.dawn / segments.length) * 100).toFixed(1) : 0}%)
              </div>
              <div className="text-purple-600 dark:text-purple-400">
                <strong>Dusk:</strong> {phaseCount.dusk} ({segments.length > 0 ? ((phaseCount.dusk / segments.length) * 100).toFixed(1) : 0}%)
              </div>
            </div>

            {segments.length > 0 && (
              <div className="mt-4">
                <strong>Sample Segments (first 5):</strong>
                <div className="mt-2 space-y-1 text-xs">
                  {segments.slice(0, 5).map((seg, idx) => (
                    <div key={idx} className="border-b border-gray-200 dark:border-gray-700 pb-1">
                      <div>Segment {idx + 1}: {seg.sunlightPhase} (intensity: {(seg.sunlightIntensity * 100).toFixed(1)}%)</div>
                      <div className="text-gray-600 dark:text-gray-400">
                        From [{seg.startCoord[0].toFixed(4)}, {seg.startCoord[1].toFixed(4)}] to [{seg.endCoord[0].toFixed(4)}, {seg.endCoord[1].toFixed(4)}]
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Visual Representation */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Sunlight Gradient Visualization</h2>
          {segments.length > 0 ? (
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
              <div
                className="flex rounded overflow-hidden border border-gray-400 dark:border-gray-500 shadow-sm bg-white dark:bg-gray-700"
                style={{ height: '32px' }}
              >
                {segments.map((seg, idx) => {
                  const getColorWithOpacity = () => {
                    const opacity = 0.5 + seg.sunlightIntensity * 0.5; // Range: 0.5 to 1.0

                    switch (seg.sunlightPhase) {
                      case 'day':
                        return `rgba(234, 179, 8, ${opacity})`; // Yellow
                      case 'night':
                        return `rgba(37, 99, 235, ${opacity})`; // Blue
                      case 'dawn':
                        return `rgba(249, 115, 22, ${opacity})`; // Orange
                      case 'dusk':
                        return `rgba(168, 85, 247, ${opacity})`; // Purple
                      default:
                        return `rgba(156, 163, 175, ${opacity})`; // Gray
                    }
                  };

                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        backgroundColor: getColorWithOpacity(),
                        minWidth: '2px',
                        height: '100%',
                      }}
                      title={`${seg.sunlightPhase} - ${(seg.sunlightIntensity * 100).toFixed(0)}%`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs mt-2 text-gray-600 dark:text-gray-400">
                <span>{schedule?.stops[0]?.stopName || 'Start'}</span>
                <span>{schedule?.stops[schedule.stops.length - 1]?.stopName || 'End'}</span>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Using {shapeCoords ? `${shapeCoords.length} shape points` : `${schedule?.stops.length || 0} stop coordinates (shape data not loaded)`}
              </div>
            </div>
          ) : (
            <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded text-sm">
              <p><strong>No segments calculated.</strong></p>
              <p className="mt-1 text-xs">
                Debug info:
                <br />- Route selected: {route ? 'Yes' : 'No'}
                <br />- Schedule available: {schedule ? 'Yes' : 'No'}
                <br />- Number of stops: {schedule?.stops.length || 0}
                <br />- Shape coords: {shapeCoords ? `${shapeCoords.length} points` : 'Not loaded'}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Info */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>✓ Sunlight Calculations Active:</strong> This component tests the sunlight utilities with real GTFS data.
          It calculates the train's position at a specific time, determines sunlight phases along the route, and visualizes
          the gradient from day to night.
        </p>
      </div>
    </div>
  );
};

export default SunlightTest;
