import { AppOperationalState } from '../models/Inventory';
import { DEFAULT_STORAGE_CONFIG } from '../models/StorageConfig';

/**
 * Clean Initial Operational State
 * Starts with a clean empty array for client master data (no hardcoded clients).
 */
export function createCleanInitialState(): AppOperationalState {
  return {
    storageConfig: { ...DEFAULT_STORAGE_CONFIG },
    clients: [], // Strictly empty array by default
    bunkerings: [],
    soundings: [],
    topups: [],
    forecastDispatches: [],
    forecastTopups: [],
    shoreTankDailyRobs: {},
  };
}

export function sanitizeOperationalState(
  raw: Partial<AppOperationalState> | null | undefined
): AppOperationalState {
  const base = createCleanInitialState();
  if (!raw || typeof raw !== 'object') return base;

  const storageConfig = {
    ...base.storageConfig,
    ...(raw.storageConfig || {}),
  };

  if (
    !storageConfig.vesselName ||
    storageConfig.vesselName === 'MT TANGGUH ENERGY I'
  ) {
    storageConfig.vesselName = 'SPOB TRANS BILGIT';
  }

  return {
    storageConfig,
    clients: Array.isArray(raw.clients) ? raw.clients : [],
    bunkerings: Array.isArray(raw.bunkerings) ? raw.bunkerings : [],
    soundings: Array.isArray(raw.soundings) ? raw.soundings : [],
    topups: Array.isArray(raw.topups) ? raw.topups : [],
    forecastDispatches: Array.isArray(raw.forecastDispatches)
      ? raw.forecastDispatches
      : [],
    forecastTopups: Array.isArray(raw.forecastTopups) ? raw.forecastTopups : [],
    shoreTankDailyRobs:
      raw.shoreTankDailyRobs && typeof raw.shoreTankDailyRobs === 'object'
        ? raw.shoreTankDailyRobs
        : {},
  };
}
