export interface StorageConfig {
  vesselName: string;
  totalCapacity: number;
  deadstock: number;
  initialOpeningRob: number;
  shoreTankName: string;
  shoreTankInitialRob: number;
}

export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  vesselName: 'SPOB TRANS BILGIT',
  totalCapacity: 5000000,
  deadstock: 0,
  initialOpeningRob: 0,
  shoreTankName: 'SHORE TANK COMBO',
  shoreTankInitialRob: 0,
};

