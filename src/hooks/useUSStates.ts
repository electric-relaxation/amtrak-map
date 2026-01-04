import { FeatureCollection } from 'geojson';
import usStatesData from '../data/us-states-contiguous.json';

/**
 * Hook to provide US state boundary data for map rendering.
 * Uses pre-processed local GeoJSON containing only contiguous US states
 * (excludes Alaska, Hawaii, Puerto Rico).
 *
 * Data source: Natural Earth 1:10m admin boundaries with lakes cut out.
 */
export const useUSStates = () => {
  // Data is imported statically - no loading or error states needed
  return {
    statesData: usStatesData as FeatureCollection,
    loading: false,
    error: null,
  };
};
