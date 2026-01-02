import { MapContainer, GeoJSON } from 'react-leaflet';
import { LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './USMap.css';
import { useUSStates } from '../hooks/useUSStates';
import { useDarkMode } from '../hooks/useDarkMode';

const USMap = () => {
  const { statesData, loading, error } = useUSStates();
  const isDark = useDarkMode();

  // Geographic center of continental US
  const center: [number, number] = [39.8, -98.5];
  const zoom = 4.6;

  // Bounds for continental US only
  const bounds: LatLngBoundsExpression = [
    [28.0, -124.0], // Southwest
    [49.0, -68.0],  // Northeast
  ];

  // Style for state borders - responsive to dark mode
  const stateStyle = {
    fillColor: isDark ? '#202020' : '#e6e6e6',
    fillOpacity: 1,
    color: isDark ? '#505050' : '#a0a0a0',
    weight: 0.7,
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-red-600 dark:text-red-400">Error loading map: {error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-white dark:bg-gray-900">
      <MapContainer
        center={center}
        zoom={zoom}
        zoomSnap={0.1}
        scrollWheelZoom={false}
        maxBounds={bounds}
        maxBoundsViscosity={1.0}
        className="w-full h-full us-map"
        dragging={false}
        doubleClickZoom={false}
        boxZoom={false}
        zoomControl={false}
      >
        {/* Render only contiguous US states - no tiles, no water, no other countries */}
        {statesData && (
          <GeoJSON
            data={statesData}
            style={stateStyle}
            key={isDark ? 'dark' : 'light'} // Force re-render on theme change
          />
        )}
      </MapContainer>
    </div>
  );
};

export default USMap;
