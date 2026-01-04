import { GTFSDataProvider } from './contexts/GTFSDataContext';
import USMap from './components/USMap';
import AllRoutesLayer from './components/AllRoutesLayer';
import DateControls from './components/DateControls';
import DirectionControls from './components/DirectionControls';
import CategoryControls from './components/CategoryControls';
import ControlPanel from './components/ControlPanel';
import { useAppSettings } from './hooks/useAppSettings';
import { useDarkMode } from './hooks/useDarkMode';
import { useIsMobile } from './hooks/useIsMobile';

function App() {
  const {
    settings,
    setSelectedDate,
    setEastWestDirection,
    setNorthSouthDirection,
    toggleCategoryVisibility,
  } = useAppSettings();
  const isDark = useDarkMode();
  const isMobile = useIsMobile();

  return (
    <GTFSDataProvider>
      <div className="w-full h-full relative">
        {/* Map with US state boundaries */}
        <USMap>
          {/* Route layers with sunlight coloring */}
          <AllRoutesLayer
            selectedDate={settings.selectedDate}
            globalSettings={settings}
          />
        </USMap>

        {/* Title */}
        <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 9999, userSelect: 'none', WebkitUserSelect: 'none' }}>
          <h1 style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 'bold',
            color: isDark ? '#9ca3af' : '#4b5563',
            textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 2px rgba(255,255,255,0.8)',
          }}>
            Amtrak Daylight Map
          </h1>
        </div>

        {/* Control panels container */}
        {isMobile ? (
          /* Mobile: Stack vertically at bottom, full width */
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 10,
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}>
            {/* Settings panel first (on top when stacked) */}
            <ControlPanel title="Settings" isDark={isDark} defaultExpanded={false}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <CategoryControls
                  categoryVisibility={settings.categoryVisibility}
                  onToggle={toggleCategoryVisibility}
                  isDark={isDark}
                />
                <DirectionControls
                  eastWestDirection={settings.globalEastWestDirection}
                  northSouthDirection={settings.globalNorthSouthDirection}
                  onEastWestChange={setEastWestDirection}
                  onNorthSouthChange={setNorthSouthDirection}
                  isDark={isDark}
                />
              </div>
            </ControlPanel>

            {/* Date controls panel */}
            <ControlPanel
              title={settings.selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).replace(',', '')}
              isDark={isDark}
              defaultExpanded={true}
            >
              <DateControls
                selectedDate={settings.selectedDate}
                onDateChange={setSelectedDate}
                isDark={isDark}
              />
            </ControlPanel>
          </div>
        ) : (
          /* Desktop: Side by side at bottom corners */
          <>
            {/* Date controls panel - bottom left */}
            <div style={{
              position: 'fixed',
              bottom: 10,
              left: 10,
              zIndex: 9999,
              width: 340,
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}>
              <ControlPanel
                title={settings.selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).replace(',', '')}
                isDark={isDark}
                defaultExpanded={true}
              >
                <DateControls
                  selectedDate={settings.selectedDate}
                  onDateChange={setSelectedDate}
                  isDark={isDark}
                />
              </ControlPanel>
            </div>

            {/* Settings panel - bottom right */}
            <div style={{
              position: 'fixed',
              bottom: 10,
              right: 10,
              zIndex: 9999,
              width: 280,
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}>
              <ControlPanel title="Settings" isDark={isDark} defaultExpanded={true}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <CategoryControls
                    categoryVisibility={settings.categoryVisibility}
                    onToggle={toggleCategoryVisibility}
                    isDark={isDark}
                  />
                  <DirectionControls
                    eastWestDirection={settings.globalEastWestDirection}
                    northSouthDirection={settings.globalNorthSouthDirection}
                    onEastWestChange={setEastWestDirection}
                    onNorthSouthChange={setNorthSouthDirection}
                    isDark={isDark}
                  />
                </div>
              </ControlPanel>
            </div>
          </>
        )}
      </div>
    </GTFSDataProvider>
  );
}

export default App;
