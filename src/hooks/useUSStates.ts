import { useState, useEffect } from 'react';
import { FeatureCollection } from 'geojson';

// ============================================================================
// Dataset Configuration
// ============================================================================

type DatasetType = 'simple' | 'natural-earth';

/**
 * Which dataset to use for US state boundaries.
 * - 'simple': Lower resolution (~200KB), faster load, less coastal detail
 * - 'natural-earth': Higher resolution 1:10m (~2-3MB), slower load, detailed coastlines
 */
const DATASET: DatasetType = 'natural-earth';

const DATASETS = {
  'simple': {
    url: 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json',
    nameProperty: 'name',
  },
  'natural-earth': {
    // Use the "_lakes" version which has Great Lakes already cut out of the polygons
    url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces_lakes.geojson',
    nameProperty: 'name',
    // Natural Earth includes all countries, so we filter to US
    countryFilter: (feature: any) => feature.properties?.admin === 'United States of America',
  },
} as const;

// ============================================================================
// Hook
// ============================================================================

export const useUSStates = () => {
  const [statesData, setStatesData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const config = DATASETS[DATASET];

        // Fetch GeoJSON from configured source
        const geoResponse = await fetch(config.url);

        if (!geoResponse.ok) {
          throw new Error('Failed to fetch GeoJSON data');
        }

        const geoData: FeatureCollection = await geoResponse.json();

        // Filter to only contiguous US states
        const contiguousStates: FeatureCollection = {
          ...geoData,
          features: geoData.features.filter((feature: any) => {
            // For Natural Earth, first filter to US only
            if ('countryFilter' in config && config.countryFilter) {
              if (!config.countryFilter(feature)) {
                return false;
              }
            }

            // Exclude non-contiguous states/territories
            const stateName = feature.properties?.[config.nameProperty];
            return stateName !== 'Alaska' &&
                   stateName !== 'Hawaii' &&
                   stateName !== 'Puerto Rico';
          })
        };

        setStatesData(contiguousStates);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchStates();
  }, []);

  return { statesData, loading, error };
};
