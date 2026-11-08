import { AppOperationalState } from '../models/Inventory';
import { ClientRecord, resolveClientColorStyle } from '../models/Client';
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

  const clients: ClientRecord[] = Array.isArray(raw.clients)
    ? [...raw.clients]
    : [];
  const bunkerings = Array.isArray(raw.bunkerings) ? raw.bunkerings : [];
  const soundings = Array.isArray(raw.soundings) ? raw.soundings : [];
  const topups = Array.isArray(raw.topups) ? raw.topups : [];
  const forecastDispatches = Array.isArray(raw.forecastDispatches)
    ? raw.forecastDispatches
    : [];
  const forecastTopups = Array.isArray(raw.forecastTopups)
    ? raw.forecastTopups
    : [];
  const shoreTankDailyRobs =
    raw.shoreTankDailyRobs && typeof raw.shoreTankDailyRobs === 'object'
      ? raw.shoreTankDailyRobs
      : {};

  // Ensure any contractor/client referenced in bunkerings or forecastDispatches is registered in clients
  const referencedNames = new Set<string>();
  bunkerings.forEach((b) => {
    const name = (b?.contractor || '').trim();
    if (name && name.toUpperCase() !== 'UNASSIGNED') referencedNames.add(name);
  });
  forecastDispatches.forEach((fd) => {
    const name = (fd?.client || '').trim();
    if (name && name.toUpperCase() !== 'UNASSIGNED') referencedNames.add(name);
  });

  const nowIso = new Date().toISOString();
  referencedNames.forEach((refName) => {
    const exists = clients.some(
      (c) => (c?.name || '').toLowerCase() === refName.toLowerCase()
    );
    if (!exists) {
      const style = resolveClientColorStyle(clients.length);
      clients.push({
        id: `cli_auto_${clients.length + 1}_${refName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')}`,
        name: refName.toUpperCase(),
        color: style.color,
        badgeClass: style.badgeClass,
        dotClass: style.dotClass,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }
  });

  return {
    storageConfig,
    clients,
    bunkerings,
    soundings,
    topups,
    forecastDispatches,
    forecastTopups,
    shoreTankDailyRobs,
  };
}
