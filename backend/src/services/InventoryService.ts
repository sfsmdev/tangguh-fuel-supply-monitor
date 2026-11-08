import {
  AppOperationalState,
  BunkeringRecord,
  ForecastDispatch,
  ForecastTopup,
  SoundingRecord,
  TopupRecord,
} from '../models/Inventory';
import { StorageConfig } from '../models/StorageConfig';
import { calculateFlowRate, getWITIsoDateTime } from './CalculationEngine';

export class InventoryService {
  static saveBunkering(
    state: AppOperationalState,
    payload: Omit<BunkeringRecord, 'id' | 'flowRate'> & { id?: string }
  ): AppOperationalState {
    const flowRate = calculateFlowRate(
      Number(payload.volume) || 0,
      payload.startTime,
      payload.endTime
    );

    if (payload.id) {
      return {
        ...state,
        bunkerings: state.bunkerings.map((b) =>
          b.id === payload.id
            ? {
                ...b,
                date: payload.date,
                contractor: payload.contractor,
                vesselName: payload.vesselName,
                volume: Number(payload.volume) || 0,
                startTime: payload.startTime,
                endTime: payload.endTime,
                flowRate,
              }
            : b
        ),
      };
    }

    const newItem: BunkeringRecord = {
      id: `bnk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: payload.date,
      contractor: payload.contractor,
      vesselName: payload.vesselName,
      volume: Number(payload.volume) || 0,
      startTime: payload.startTime,
      endTime: payload.endTime,
      flowRate,
    };

    return {
      ...state,
      bunkerings: [newItem, ...state.bunkerings],
    };
  }

  static deleteBunkering(
    state: AppOperationalState,
    id: string
  ): AppOperationalState {
    return {
      ...state,
      bunkerings: state.bunkerings.filter((b) => b.id !== id),
    };
  }

  static saveSounding(
    state: AppOperationalState,
    payload: Omit<SoundingRecord, 'id'> & { id?: string }
  ): AppOperationalState {
    if (payload.id) {
      return {
        ...state,
        soundings: state.soundings.map((s) =>
          s.id === payload.id
            ? {
                ...s,
                ...payload,
                id: payload.id,
                liters: Number(payload.liters) || 0,
              }
            : s
        ),
      };
    }

    const newItem: SoundingRecord = {
      ...payload,
      id: `snd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      liters: Number(payload.liters) || 0,
    };

    return {
      ...state,
      soundings: [newItem, ...state.soundings],
    };
  }

  static deleteSounding(
    state: AppOperationalState,
    id: string
  ): AppOperationalState {
    return {
      ...state,
      soundings: state.soundings.filter((s) => s.id !== id),
    };
  }

  static saveTopup(
    state: AppOperationalState,
    payload: Omit<TopupRecord, 'id'> & { id?: string }
  ): AppOperationalState {
    if (payload.id) {
      return {
        ...state,
        topups: state.topups.map((t) =>
          t.id === payload.id
            ? {
                ...t,
                ...payload,
                id: payload.id,
                volume: Number(payload.volume) || 0,
              }
            : t
        ),
      };
    }

    const newItem: TopupRecord = {
      ...payload,
      id: `top_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      volume: Number(payload.volume) || 0,
    };

    return {
      ...state,
      topups: [newItem, ...state.topups],
    };
  }

  static receiveTopup(
    state: AppOperationalState,
    id: string
  ): AppOperationalState {
    const nowDt = getWITIsoDateTime();
    return {
      ...state,
      topups: state.topups.map((t) =>
        t.id === id
          ? {
              ...t,
              status: 'Completed',
              ata: t.ata || nowDt,
            }
          : t
      ),
    };
  }

  static deleteTopup(
    state: AppOperationalState,
    id: string
  ): AppOperationalState {
    return {
      ...state,
      topups: state.topups.filter((t) => t.id !== id),
    };
  }

  static saveForecastDispatch(
    state: AppOperationalState,
    payload: Omit<ForecastDispatch, 'id'> & { id?: string }
  ): AppOperationalState {
    if (payload.id) {
      return {
        ...state,
        forecastDispatches: state.forecastDispatches.map((fd) =>
          fd.id === payload.id
            ? {
                ...fd,
                date: payload.date,
                client: payload.client,
                vessel: payload.vessel,
                volume: Number(payload.volume) || 0,
              }
            : fd
        ),
      };
    }

    const newItem: ForecastDispatch = {
      id: `fcd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: payload.date,
      client: payload.client,
      vessel: payload.vessel,
      volume: Number(payload.volume) || 0,
    };

    return {
      ...state,
      forecastDispatches: [...state.forecastDispatches, newItem],
    };
  }

  static deleteForecastDispatch(
    state: AppOperationalState,
    id: string
  ): AppOperationalState {
    return {
      ...state,
      forecastDispatches: state.forecastDispatches.filter((fd) => fd.id !== id),
    };
  }

  static saveForecastTopup(
    state: AppOperationalState,
    payload: Omit<ForecastTopup, 'id'> & { id?: string }
  ): AppOperationalState {
    if (payload.id) {
      return {
        ...state,
        forecastTopups: state.forecastTopups.map((ft) =>
          ft.id === payload.id
            ? {
                ...ft,
                date: payload.date,
                vessel: payload.vessel,
                floatingVolume: Number(payload.floatingVolume) || 0,
                shoreVolume: Number(payload.shoreVolume) || 0,
              }
            : ft
        ),
      };
    }

    const newItem: ForecastTopup = {
      id: `fct_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: payload.date,
      vessel: payload.vessel,
      floatingVolume: Number(payload.floatingVolume) || 0,
      shoreVolume: Number(payload.shoreVolume) || 0,
    };

    return {
      ...state,
      forecastTopups: [...state.forecastTopups, newItem],
    };
  }

  static deleteForecastTopup(
    state: AppOperationalState,
    id: string
  ): AppOperationalState {
    return {
      ...state,
      forecastTopups: state.forecastTopups.filter((ft) => ft.id !== id),
    };
  }

  static updateStorageConfig(
    state: AppOperationalState,
    updates: Partial<StorageConfig>
  ): AppOperationalState {
    return {
      ...state,
      storageConfig: {
        ...state.storageConfig,
        ...updates,
      },
    };
  }
}
