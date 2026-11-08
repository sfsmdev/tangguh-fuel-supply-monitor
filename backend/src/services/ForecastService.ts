import {
  AppOperationalState,
  ForecastDispatch,
  ForecastTopup,
} from '../models/Inventory';
import { calculateSummary, getNowWIT } from './CalculationEngine';

export interface FloatingTimelineDay {
  iso: string;
  dayLabel: string;
  closingRob: number;
  totalDispatch: number;
  totalTopup: number;
  clientGroups: Record<string, ForecastDispatch[]>;
  topups: ForecastTopup[];
}

export interface ShoreTimelineDay {
  iso: string;
  dayLabel: string;
  totalTopupL: number;
  dynamicRobL: number;
  topups: ForecastTopup[];
}

export interface DlahHorizonMetric {
  horizonDays: number;
  projectedRob: number;
  isWarning: boolean;
}

export interface ForecastSimulationResult {
  liveFloatingRob: number;
  shoreBaselineRobL: number;
  floatingTimeline: FloatingTimelineDay[];
  shoreTimeline: ShoreTimelineDay[];
  dlahMetrics: Record<number, DlahHorizonMetric>;
}

export class ForecastService {
  static simulateForecast(
    state: AppOperationalState,
    horizonDays: number = 14
  ): ForecastSimulationResult {
    const summary = calculateSummary(state);
    const liveFloatingRob = Math.max(0, summary.bookRob);
    const shoreBaselineRobL = Number(state.storageConfig.shoreTankInitialRob) || 0;

    const timelineDates: { iso: string; dayLabel: string; dayIndex: number }[] = [];
    const baseDate = getNowWIT();

    for (let i = 0; i < horizonDays; i++) {
      const d = new Date(baseDate.getTime() + i * 86400000);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(d.getDate()).padStart(2, '0')}`;
      const dayLabel = `${String(d.getDate()).padStart(2, '0')}/${String(
        d.getMonth() + 1
      ).padStart(2, '0')}`;
      timelineDates.push({ iso, dayLabel, dayIndex: i });
    }

    // Group dispatches & topups by date
    const fDispatchesByDate: Record<string, ForecastDispatch[]> = {};
    state.forecastDispatches.forEach((fd) => {
      if (!fDispatchesByDate[fd.date]) fDispatchesByDate[fd.date] = [];
      fDispatchesByDate[fd.date].push(fd);
    });

    const fTopupsByDate: Record<string, ForecastTopup[]> = {};
    state.forecastTopups.forEach((ft) => {
      if (!fTopupsByDate[ft.date]) fTopupsByDate[ft.date] = [];
      fTopupsByDate[ft.date].push(ft);
    });

    // Only count dispatches belonging to registered clients in the master list
    const activeClientNames = new Set(
      state.clients.map((c) => c.name.toLowerCase())
    );

    const floatingTimeline: FloatingTimelineDay[] = [];
    let currentFloatingRunning = liveFloatingRob;

    timelineDates.forEach((td) => {
      const allDayDispatches = fDispatchesByDate[td.iso] || [];
      const dayDispatches = allDayDispatches.filter((d) =>
        activeClientNames.has((d.client || '').toLowerCase())
      );
      const dayTopups = fTopupsByDate[td.iso] || [];

      const totalDayDispatch = dayDispatches.reduce(
        (acc, d) => acc + (Number(d.volume) || 0),
        0
      );
      const totalDayTopup = dayTopups.reduce(
        (acc, t) => acc + (Number(t.floatingVolume) || 0),
        0
      );

      currentFloatingRunning =
        currentFloatingRunning + totalDayTopup - totalDayDispatch;

      const clientGroups: Record<string, ForecastDispatch[]> = {};
      state.clients.forEach((c) => {
        clientGroups[c.name] = dayDispatches.filter(
          (d) => (d.client || '').toLowerCase() === c.name.toLowerCase()
        );
      });

      floatingTimeline.push({
        iso: td.iso,
        dayLabel: td.dayLabel,
        closingRob: currentFloatingRunning,
        totalDispatch: totalDayDispatch,
        totalTopup: totalDayTopup,
        clientGroups,
        topups: dayTopups,
      });
    });

    // Shore Tank Combo cumulative carry-over balance
    const shoreTimeline: ShoreTimelineDay[] = [];
    let currentRunningRobL = shoreBaselineRobL;

    timelineDates.forEach((td) => {
      const dayTopups = fTopupsByDate[td.iso] || [];
      const dayShoreTopupL = dayTopups.reduce(
        (acc, t) => acc + (Number(t.shoreVolume) || 0),
        0
      );
      currentRunningRobL = currentRunningRobL + dayShoreTopupL;

      shoreTimeline.push({
        iso: td.iso,
        dayLabel: td.dayLabel,
        totalTopupL: dayShoreTopupL,
        dynamicRobL: currentRunningRobL,
        topups: dayTopups,
      });
    });

    // Multi-Horizon DLAH Metrics (10, 14, 30, 60, 90 Days)
    const horizons = [10, 14, 30, 60, 90];
    const dlahMetrics: Record<number, DlahHorizonMetric> = {};

    horizons.forEach((h) => {
      let runningRob = liveFloatingRob;
      for (let i = 0; i < h; i++) {
        const d = new Date(baseDate.getTime() + i * 86400000);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(d.getDate()).padStart(2, '0')}`;
        const dispatches = (fDispatchesByDate[iso] || []).filter((item) =>
          activeClientNames.has((item.client || '').toLowerCase())
        );
        const topups = fTopupsByDate[iso] || [];
        const dVol = dispatches.reduce(
          (acc, item) => acc + (Number(item.volume) || 0),
          0
        );
        const tVol = topups.reduce(
          (acc, item) => acc + (Number(item.floatingVolume) || 0),
          0
        );
        runningRob = runningRob + tVol - dVol;
      }

      dlahMetrics[h] = {
        horizonDays: h,
        projectedRob: runningRob,
        isWarning: runningRob <= 300000,
      };
    });

    return {
      liveFloatingRob,
      shoreBaselineRobL,
      floatingTimeline,
      shoreTimeline,
      dlahMetrics,
    };
  }
}

