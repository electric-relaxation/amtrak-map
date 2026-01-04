import { ReactNode, useMemo, useRef } from 'react';
import Map, { Source, Layer, MapRef } from 'react-map-gl/maplibre';
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
  const mapRef = useRef<MapRef | null>(null);

  // Initial view state centered on continental US
  const initialViewState = {
    // longitude: -96,
    // latitude: 38.5,
    // zoom: 3.8,
    bounds: [
      [-125, 24],    // Southwest [lng, lat]
      [-66.5, 51], // Northeast [lng, lat]
    ] as [[number, number], [number, number]],
    fitBoundsOptions: { padding: 16 },
  };

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
      <div className="w-full h-full bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-red-600 dark:text-red-400">Error loading map: {error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Map
        initialViewState={initialViewState}
        style={{ width: '100vw', height: '100%' }}
        mapStyle={mapStyle}
        // maxBounds={initialViewState.bounds}
        // renderWorldCopies={false}
        // minZoom={2}
        maxZoom={10}
        scrollZoom={true}
        dragPan={true}
        dragRotate={false}
        touchZoomRotate={true}
        touchPitch={false}
        doubleClickZoom={true}
        keyboard={false}
        attributionControl={false}
        
        ref={mapRef}
        onLoad={() => {
          const map = mapRef.current?.getMap();
          map?.touchZoomRotate.disableRotation();

          // TODO: make this phone only
          map?.setMinZoom(map?.getZoom());
          // console.log(`onLoad.zoom: ${map?.getZoom()}`);
        }}
        // trackResize={true}
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
