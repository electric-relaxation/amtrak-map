import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '../types';

const STORAGE_KEY = 'amtrak-map-settings';

type EastWestDirection = 'eastbound' | 'westbound';
type NorthSouthDirection = 'northbound' | 'southbound';

interface StoredSettings {
  selectedDate: string; // ISO date string
  globalEastWestDirection: EastWestDirection;
  globalNorthSouthDirection: NorthSouthDirection;
}

function getDefaultSettings(): AppSettings {
  return {
    selectedDate: new Date(),
    globalEastWestDirection: 'westbound',
    globalNorthSouthDirection: 'southbound',
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

  const resetToDefaults = useCallback(() => {
    setSettings(getDefaultSettings());
  }, []);

  return {
    settings,
    setSelectedDate,
    setEastWestDirection,
    setNorthSouthDirection,
    resetToDefaults,
  };
}
