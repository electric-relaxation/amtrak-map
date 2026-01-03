import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { LineLayerSpecification, ExpressionSpecification } from 'maplibre-gl';
import { calculateRouteSegmentColors } from '../utils/sunlight';
import { useGTFSData } from '../hooks/useGTFSData';
import type { ProcessedRoute, ProcessedSchedule, SunlightPhase } from '../types';

interface RouteLayerProps {
  route: ProcessedRoute;
  schedule: ProcessedSchedule;
  selectedDate: Date;
  isVisible?: boolean;
}

/**
 * Get color based on sunlight phase and intensity
 */
function getSunlightColor(phase: SunlightPhase, intensity: number): string {
  const clampedIntensity = Math.max(0, Math.min(1, intensity));

  switch (phase) {
    case 'night':
      return 'rgba(0, 77, 153, 1)';

    case 'dawn': {
      const dawnRed = 255;
      const dawnGreen = Math.floor(100 + (149 - 100) * clampedIntensity);
      const dawnBlue = 0;
      return `rgb(${dawnRed}, ${dawnGreen}, ${dawnBlue})`;
    }

    case 'dusk': {
      const duskRed = Math.floor(168 + (255 - 168) * clampedIntensity);
      const duskGreen = Math.floor(85 + (100 - 85) * clampedIntensity);
      const duskBlue = Math.floor(247 - 247 * clampedIntensity);
      return `rgb(${duskRed}, ${duskGreen}, ${duskBlue})`;
    }

    case 'day': {
      const dayRed = Math.floor(200 + (255 - 200) * clampedIntensity);
      const dayGreen = Math.floor(180 + (215 - 180) * clampedIntensity);
      const dayBlue = 0;
      return `rgb(${dayRed}, ${dayGreen}, ${dayBlue})`;
    }

    default:
      return 'rgb(128, 128, 128)';
  }
}

/**
 * RouteLayer component
 * Renders a single train route on the map with sunlight-based gradient coloring using MapLibre
 */
const RouteLayer = ({ route, schedule, selectedDate, isVisible = true }: RouteLayerProps) => {
  const { rawData } = useGTFSData();

  // Get actual shape coordinates from GTFS data
  const shapeCoords = useMemo(() => {
    if (!schedule.shapeId || !rawData?.shapes) {
      return undefined;
    }

    return rawData.shapes
      .filter(s => s.shape_id === schedule.shapeId)
      .sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence)
      .map(s => [s.shape_pt_lat, s.shape_pt_lon] as [number, number]);
  }, [schedule.shapeId, rawData?.shapes]);

  // Calculate sunlight segments
  const segments = useMemo(() =>
    calculateRouteSegmentColors(route, schedule, selectedDate, shapeCoords, 100),
    [route, schedule, selectedDate, shapeCoords]
  );

  // Create GeoJSON LineString from the segments
  const geojsonData = useMemo(() => {
    if (segments.length === 0) return null;

    // Build coordinates array from all segment points
    const coordinates: [number, number][] = [
      [segments[0].startCoord[1], segments[0].startCoord[0]] // [lng, lat] for GeoJSON
    ];

    for (const segment of segments) {
      coordinates.push([segment.endCoord[1], segment.endCoord[0]]);
    }

    return {
      type: 'Feature' as const,
      properties: {
        routeId: route.routeId,
        routeName: route.routeName,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates,
      },
    };
  }, [segments, route.routeId, route.routeName]);

  // Build the line-gradient expression for MapLibre
  const lineGradient = useMemo((): ExpressionSpecification | undefined => {
    if (segments.length === 0) return undefined;

    // Build gradient stops: position (0-1) and color
    const stops: (number | string)[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const position = i / segments.length;
      const color = getSunlightColor(segment.sunlightPhase, segment.sunlightIntensity);

      stops.push(position);
      stops.push(color);
    }

    // Add final position
    const lastSegment = segments[segments.length - 1];
    stops.push(1);
    stops.push(getSunlightColor(lastSegment.sunlightPhase, lastSegment.sunlightIntensity));

    return [
      'interpolate',
      ['linear'],
      ['line-progress'],
      ...stops
    ] as ExpressionSpecification;
  }, [segments]);

  // Layer style for the route line
  const lineLayer: LineLayerSpecification = useMemo(() => ({
    id: `route-${route.routeId}`,
    type: 'line',
    source: `route-source-${route.routeId}`,
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-width': 2.5,
      'line-opacity': isVisible ? 0.9 : 0,
      ...(lineGradient ? { 'line-gradient': lineGradient } : { 'line-color': '#888888' }),
    },
  }), [route.routeId, isVisible, lineGradient]);

  if (!isVisible || !schedule || schedule.stops.length < 2 || !geojsonData) {
    return null;
  }

  return (
    <Source
      id={`route-source-${route.routeId}`}
      type="geojson"
      data={geojsonData}
      lineMetrics={true} // Required for line-gradient
    >
      <Layer {...lineLayer} />
    </Source>
  );
};

export default RouteLayer;
