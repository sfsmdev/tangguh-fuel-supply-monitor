import {
  AppOperationalState,
  FuelPricePeriodRecord,
  FuelPriceRecord,
  PertaminaPeriodType,
} from '../models/Inventory';
import { ClientRecord, resolveClientColorStyle } from '../models/Client';
import { DEFAULT_STORAGE_CONFIG } from '../models/StorageConfig';
import { generatePeriodId, getPeriodDateRange } from '../utils/periodUtils';

export const DEFAULT_FUEL_PRICE: FuelPriceRecord = {
  id: 'current',
  pricePerLiter: 0,
  currency: 'IDR',
  fuelType: 'Biofuel B50',
  effectiveDate: '',
  notes: '',
  updatedBy: '',
  updatedAt: '',
};

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
    fuelPrice: { ...DEFAULT_FUEL_PRICE },
    fuelPricePeriods: [],
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

  // Client names are always stored in UPPERCASE for system-wide consistency
  const toUpperName = (n: unknown): string =>
    String(n || '').trim().replace(/\s+/g, ' ').toUpperCase();

  const clients: ClientRecord[] = [];
  (Array.isArray(raw.clients) ? raw.clients : []).forEach((c) => {
    if (!c) return;
    const upper = toUpperName(c.name);
    if (!upper || clients.some((x) => x.name === upper)) return;
    clients.push({ ...c, name: upper });
  });
  const bunkerings = (Array.isArray(raw.bunkerings) ? raw.bunkerings : []).map(
    (b) => ({ ...b, contractor: toUpperName(b?.contractor) })
  );
  const soundings = Array.isArray(raw.soundings) ? raw.soundings : [];
  const topups = Array.isArray(raw.topups) ? raw.topups : [];
  const forecastDispatches = (
    Array.isArray(raw.forecastDispatches) ? raw.forecastDispatches : []
  ).map((fd) => ({ ...fd, client: toUpperName(fd?.client) }));
  const forecastTopups = Array.isArray(raw.forecastTopups)
    ? raw.forecastTopups
    : [];
  const shoreTankDailyRobs =
    raw.shoreTankDailyRobs && typeof raw.shoreTankDailyRobs === 'object'
      ? raw.shoreTankDailyRobs
      : {};

  const rawPrice =
    raw.fuelPrice && typeof raw.fuelPrice === 'object' ? raw.fuelPrice : null;
  const fuelPrice: FuelPriceRecord = {
    ...DEFAULT_FUEL_PRICE,
    ...(rawPrice || {}),
    pricePerLiter: Math.max(
      0,
      Number(rawPrice?.pricePerLiter ?? DEFAULT_FUEL_PRICE.pricePerLiter) || 0
    ),
    currency:
      String(rawPrice?.currency || DEFAULT_FUEL_PRICE.currency).trim() || 'IDR',
    fuelType:
      String(rawPrice?.fuelType || DEFAULT_FUEL_PRICE.fuelType).trim() ||
      'Biofuel B50',
    effectiveDate: String(
      rawPrice?.effectiveDate ?? DEFAULT_FUEL_PRICE.effectiveDate
    ).trim(),
    notes: String(rawPrice?.notes ?? DEFAULT_FUEL_PRICE.notes ?? '').trim(),
    updatedBy: String(
      rawPrice?.updatedBy ?? DEFAULT_FUEL_PRICE.updatedBy ?? ''
    ).trim(),
    updatedAt: String(
      rawPrice?.updatedAt ?? DEFAULT_FUEL_PRICE.updatedAt ?? ''
    ).trim(),
  };

  const rawPeriods = Array.isArray(raw.fuelPricePeriods)
    ? raw.fuelPricePeriods
    : [];
  const fuelPricePeriods: FuelPricePeriodRecord[] = rawPeriods
    .filter((p) => p && typeof p === 'object')
    .map((p) => {
      const year = Number(p.year) || new Date().getFullYear();
      const month = Math.max(1, Math.min(12, Number(p.month) || 1));
      const period: PertaminaPeriodType =
        p.period === 'Periode II' ? 'Periode II' : 'Periode I';
      const range = getPeriodDateRange(year, month, period);
      return {
        id: String(p.id || generatePeriodId(year, month, period)),
        year,
        month,
        period,
        startDate: String(p.startDate || range.startDate).trim(),
        endDate: String(p.endDate || range.endDate).trim(),
        pricePerLiter: Math.max(0, Number(p.pricePerLiter) || 0),
        currency: String(p.currency || 'IDR').trim().toUpperCase(),
        fuelType: String(p.fuelType || 'Biofuel B50').trim(),
        notes: String(p.notes || '').trim(),
        updatedBy: String(p.updatedBy || '').trim(),
        updatedAt: String(p.updatedAt || '').trim(),
      };
    });

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
    fuelPrice,
    fuelPricePeriods,
  };
}
