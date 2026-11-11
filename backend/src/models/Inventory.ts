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
  fuelType: string; // e.g. 'Biofuel B50 Marine Offshore'
  effectiveDate: string; // YYYY-MM-DD
  notes?: string;
  updatedBy: string; // 'Admin'
  updatedAt: string; // ISO string
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
}

