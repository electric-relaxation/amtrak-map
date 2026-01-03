import { useState } from 'react';
import { GTFSDataProvider } from './contexts/GTFSDataContext';
import USMap from './components/USMap';
import AllRoutesLayer from './components/AllRoutesLayer';
import type { AppSettings } from './types';

function App() {
  // Test date: Use current date for now to ensure it's in the valid GTFS range
  const testDate = new Date();
  const [selectedDate] = useState<Date>(testDate);

  // Global direction settings
  const [globalSettings] = useState<AppSettings>({
    selectedDate: testDate,
    globalEastWestDirection: 'eastbound',
    globalNorthSouthDirection: 'northbound',
  });

  return (
    <GTFSDataProvider>
      <div className="w-full h-screen relative">
        {/* Map with US state boundaries */}
        <USMap>
          {/* Route layers with sunlight coloring */}
          <AllRoutesLayer
            selectedDate={selectedDate}
            globalSettings={globalSettings}
          />
        </USMap>

        {/* Info overlay */}
        <div className="absolute top-4 left-4 z-[1000] bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-sm">
          <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">
            Amtrak Routes - Sunlight Visualization
          </h2>
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <div><strong>Date:</strong> {selectedDate.toLocaleDateString()}</div>
            <div><strong>Time:</strong> {selectedDate.toLocaleTimeString()}</div>
            <div><strong>E-W Direction:</strong> {globalSettings.globalEastWestDirection}</div>
            <div><strong>N-S Direction:</strong> {globalSettings.globalNorthSouthDirection}</div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(255, 215, 0)' }}></div>
                <span>Day</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(255, 149, 0)' }}></div>
                <span>Dawn/Dusk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(37, 99, 235)' }}></div>
                <span>Night</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GTFSDataProvider>
  )
}

export default App
