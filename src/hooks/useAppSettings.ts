import { useState, useEffect, useCallback } from 'react';
import type { AppSettings, CategoryVisibility } from '../types';

const STORAGE_KEY = 'amtrak-map-settings';

type EastWestDirection = 'eastbound' | 'westbound';
type NorthSouthDirection = 'northbound' | 'southbound';
type VisibleCategory = keyof CategoryVisibility;

interface StoredSettings {
  selectedDate: string; // ISO date string
  globalEastWestDirection: EastWestDirection;
  globalNorthSouthDirection: NorthSouthDirection;
  categoryVisibility?: CategoryVisibility;
}

function getDefaultCategoryVisibility(): CategoryVisibility {
  return {
    'Long-Distance': true,
    'State-Supported': true,
    'Northeast Corridor': true,
  };
}

function getDefaultSettings(): AppSettings {
  return {
    selectedDate: new Date(),
    globalEastWestDirection: 'westbound',
    globalNorthSouthDirection: 'southbound',
    categoryVisibility: getDefaultCategoryVisibility(),
  };
}

function loadSettingsFromStorage(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: StoredSettings = JSON.parse(stored);
      return {
        selectedDate: new Date(parsed.selectedDate),
        globalEastWestDirection: parsed.globalEastWestDirection,
        globalNorthSouthDirection: parsed.globalNorthSouthDirection,
        categoryVisibility: parsed.categoryVisibility ?? getDefaultCategoryVisibility(),
      };
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage:', e);
  }
  return getDefaultSettings();
}

function saveSettingsToStorage(settings: AppSettings): void {
  try {
    const toStore: StoredSettings = {
      selectedDate: settings.selectedDate.toISOString(),
      globalEastWestDirection: settings.globalEastWestDirection,
      globalNorthSouthDirection: settings.globalNorthSouthDirection,
      categoryVisibility: settings.categoryVisibility,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (e) {
    console.warn('Failed to save settings to localStorage:', e);
  }
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettingsFromStorage);

  // Save to localStorage whenever settings change
  useEffect(() => {
    saveSettingsToStorage(settings);
  }, [settings]);

  const setSelectedDate = useCallback((date: Date) => {
    setSettings(prev => ({ ...prev, selectedDate: date }));
  }, []);

  const setEastWestDirection = useCallback((direction: EastWestDirection) => {
    setSettings(prev => ({ ...prev, globalEastWestDirection: direction }));
  }, []);

  const setNorthSouthDirection = useCallback((direction: NorthSouthDirection) => {
    setSettings(prev => ({ ...prev, globalNorthSouthDirection: direction }));
  }, []);

  const toggleCategoryVisibility = useCallback((category: VisibleCategory) => {
    setSettings(prev => ({
      ...prev,
      categoryVisibility: {
        ...prev.categoryVisibility,
        [category]: !prev.categoryVisibility[category],
      },
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(getDefaultSettings());
  }, []);

  return {
    settings,
    setSelectedDate,
    setEastWestDirection,
    setNorthSouthDirection,
    toggleCategoryVisibility,
    resetToDefaults,
  };
}
