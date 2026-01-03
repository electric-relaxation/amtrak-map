import { ReactNode, useMemo } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import type { StyleSpecification, FillLayerSpecification, LineLayerSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './USMap.css';
import { useUSStates } from '../hooks/useUSStates';
import { useDarkMode } from '../hooks/useDarkMode';

interface USMapProps {
  children?: ReactNode;
}

const USMap = ({ children }: USMapProps) => {
  const { statesData, loading, error } = useUSStates();
  const isDark = useDarkMode();

  // Initial view state centered on continental US
  const initialViewState = {
    longitude: -96,
    latitude: 38.5,
    zoom: 3.8,
  };

  // Bounds for continental US
  const maxBounds: [[number, number], [number, number]] = [
    [-130.0, 22.0], // Southwest [lng, lat]
    [-60.0, 52.0],  // Northeast [lng, lat]
  ];

  // Create a minimal map style with just a background color
  const mapStyle: StyleSpecification = useMemo(() => ({
    version: 8,
    name: 'US Map',
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': isDark ? '#1b1b1b' : '#e0e0e0',
        },
      },
    ],
  }), [isDark]);

  // Layer style for state fills
  const stateFillLayer: FillLayerSpecification = useMemo(() => ({
    id: 'state-fill',
    type: 'fill',
    source: 'states',
    paint: {
      'fill-color': isDark ? '#202020' : '#e6e6e6',
      'fill-opacity': 1,
    },
  }), [isDark]);

  // Layer style for state borders
  const stateBorderLayer: LineLayerSpecification = useMemo(() => ({
    id: 'state-borders',
    type: 'line',
    source: 'states',
    paint: {
      'line-color': isDark ? '#505050' : '#a0a0a0',
      'line-width': 0.7,
    },
  }), [isDark]);

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
    <div className="w-full h-screen">
      <Map
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        maxBounds={maxBounds}
        scrollZoom={false}
        dragPan={false}
        dragRotate={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        keyboard={false}
        attributionControl={false}
      >
        {/* Render US states as GeoJSON */}
        {statesData && (
          <Source id="states" type="geojson" data={statesData}>
            <Layer {...stateFillLayer} />
            <Layer {...stateBorderLayer} />
          </Source>
        )}

        {/* Render additional map layers (routes, markers, etc.) */}
        {children}
      </Map>
    </div>
  );
};

export default USMap;
