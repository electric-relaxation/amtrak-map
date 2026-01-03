import { useState, useEffect } from 'react';
import { FeatureCollection } from 'geojson';

export const useUSStates = () => {
  const [statesData, setStatesData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        // Fetch US states GeoJSON from public source
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
