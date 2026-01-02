import { useState, useEffect } from 'react';
import { FeatureCollection } from 'geojson';

// Contiguous US state FIPS codes (excluding Alaska and Hawaii)
const CONTIGUOUS_STATES = [
  '01', '04', '05', '06', '08', '09', '10', '12', '13', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34',
  '35', '36', '37', '38', '39', '40', '41', '42', '44', '45', '46', '47', '48', '49',
  '50', '51', '53', '54', '55', '56'
];

export const useUSStates = () => {
  const [statesData, setStatesData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        // Fetch US states GeoJSON from public source
        // Using 20m (low resolution) for better performance
        const response = await fetch(
          'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'
        );

        if (!response.ok) {
          throw new Error('Failed to fetch states data');
        }

        const topoData = await response.json();

        // Convert TopoJSON to GeoJSON
        // We need to use topojson-client library or do it manually
        // For now, let's use a direct GeoJSON source instead
        const geoResponse = await fetch(
          'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'
        );

        if (!geoResponse.ok) {
          throw new Error('Failed to fetch GeoJSON data');
        }

        const geoData: FeatureCollection = await geoResponse.json();

        // Filter to only contiguous US states
        const contiguousStates: FeatureCollection = {
          ...geoData,
          features: geoData.features.filter((feature: any) => {
            const stateName = feature.properties?.name;
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
