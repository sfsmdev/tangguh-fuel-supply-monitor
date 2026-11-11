import { ClientRecord } from './Client';
import { StorageConfig } from './StorageConfig';

export interface BunkeringRecord {
  id: string;
  date: string; // YYYY-MM-DD
  contractor: string; // Dynamic Client Name from ClientRecord
  vesselName: string;
  volume: number; // Liters (L)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  flowRate: number; // L/Hr
}

export interface SoundingRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  liters: number;
  draftFwd?: number | null;
  draftAft?: number | null;
  remarks?: string;
  docName?: string | null;
  docDataUrl?: string | null;
}

export type TopupStatus = 'Planned' | 'Loading' | 'In Transit' | 'Discharging' | 'Completed';

export interface TopupRecord {
  id: string;
  vessel: string;
  volume: number; // Liters (L)
  loadPort: string;
  dischPort: string;
  etd: string;
  eta: string;
  atd?: string;
  ata?: string;
  status: TopupStatus;
}

export interface ForecastDispatch {
  id: string;
  date: string; // YYYY-MM-DD
  client: string; // Dynamic Client Name from ClientRecord
  vessel: string;
  volume: number; // Liters (L)
}

export interface ForecastTopup {
  id: string;
  date: string; // YYYY-MM-DD
  vessel: string;
  floatingVolume: number; // Liters (L)
  shoreVolume: number; // Liters (L)
}

export interface FuelPriceRecord {
  id?: string;
  pricePerLiter: number;
  currency: string; // e.g. 'IDR'
  fuelType: string; // e.g. 'Biofuel B50'
  effectiveDate: string; // YYYY-MM-DD
  notes?: string;
  updatedBy: string; // 'Admin'
  updatedAt: string; // ISO string
}

export type PertaminaPeriodType = 'Periode I' | 'Periode II';

export interface FuelPricePeriodRecord {
  id: string; // 'rate_YYYY_MM_P1' | 'rate_YYYY_MM_P2' | UUID
  year: number; // e.g. 2026
  month: number; // 1 - 12
  period: PertaminaPeriodType; // 'Periode I' (1-14) | 'Periode II' (15-end)
  startDate: string; // YYYY-MM-DD (e.g. '2026-11-01')
  endDate: string; // YYYY-MM-DD (e.g. '2026-11-14')
  pricePerLiter: number; // 0 if not yet inputted
  currency: string; // 'IDR' | 'USD'
  fuelType: string; // 'Biofuel B50'
  notes?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface AppOperationalState {
  storageConfig: StorageConfig;
  clients: ClientRecord[]; // Clean empty array by default
  bunkerings: BunkeringRecord[];
  soundings: SoundingRecord[];
  topups: TopupRecord[];
  forecastDispatches: ForecastDispatch[];
  forecastTopups: ForecastTopup[];
  shoreTankDailyRobs: Record<string, number>;
  fuelPrice?: FuelPriceRecord;
  fuelPricePeriods?: FuelPricePeriodRecord[];
}

