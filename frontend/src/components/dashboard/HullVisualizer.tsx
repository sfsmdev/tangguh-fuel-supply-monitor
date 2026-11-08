'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { calculateSummary, formatNumber } from '@backend/index';

export function HullVisualizer() {
  const { state } = useAppStore();
  const summary = calculateSummary(state);

  const capacity = Math.max(
    1,
    Number(state.storageConfig.totalCapacity) || 5000000
  );
  const deadstock = Math.max(0, Number(state.storageConfig.deadstock) || 0);
  const currentRob = Math.max(0, summary.bookRob);
  const usableRob = Math.max(0, currentRob - deadstock);

  const fillPct = Math.min(100, Math.max(0, (currentRob / capacity) * 100));
  const deadstockPct = Math.min(100, Math.max(0, (deadstock / capacity) * 100));

  const latestSoundingObj = summary.latestSoundingObj;
  const fwdDraft =
    latestSoundingObj?.draftFwd !== undefined &&
    latestSoundingObj?.draftFwd !== null
      ? `${latestSoundingObj.draftFwd} m`
      : '-- m';
  const aftDraft =
    latestSoundingObj?.draftAft !== undefined &&
    latestSoundingObj?.draftAft !== null
      ? `${latestSoundingObj.draftAft} m`
      : '-- m';

  return (
    <div className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-water text-sky-500" />
            <span>Floating Storage Tanker Hull Cross-Section</span>
          </h2>
          <p className="text-xs text-slate-500">
            Dynamic B50 liquid level relative to total storage capacity.
          </p>
        </div>
        <span className="font-mono text-sm font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
          {fillPct.toFixed(1)}%
        </span>
      </div>

      {/* Hull Simulation Diagram */}
      <div className="bg-gradient-to-b from-sky-50 to-slate-100 border border-slate-200 rounded-xl p-4 sm:p-6 my-2 relative overflow-hidden flex flex-col items-center">
        {/* Superstructure / Wheelhouse Deck Structure */}
        <div className="flex flex-col items-end w-full max-w-md pr-10">
          <div className="w-1.5 h-3 bg-slate-500 rounded-t mr-7" />
          <div className="w-8 h-1 bg-slate-600 rounded mr-4" />
          <div className="bg-slate-700 text-white text-[9px] font-mono font-bold px-3 py-1 rounded-t border-b border-slate-600 flex items-center space-x-1 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>BRIDGE / ACCOM</span>
          </div>
          <div className="w-28 h-6 bg-slate-300 border-x border-slate-400 flex items-center justify-around px-2">
            <div className="w-2 h-2 rounded bg-sky-200 border border-slate-500" />
            <div className="w-2 h-2 rounded bg-sky-200 border border-slate-500" />
            <div className="w-2 h-2 rounded bg-sky-200 border border-slate-500" />
          </div>
        </div>

        {/* Main Hull Tank Container */}
        <div className="w-full max-w-md relative">
          {/* Deck Line */}
          <div className="w-full h-3 bg-slate-800 rounded-t-sm flex items-center justify-between px-3 text-[9px] font-mono text-slate-300">
            <span>{state.storageConfig.vesselName}</span>
            <span>STORAGE CARGO TANK</span>
          </div>

          {/* Hull Tank Cross Section Polygon */}
          <div className="w-full h-44 sm:h-52 bg-slate-800 p-2 hull-mask relative shadow-inner">
            {/* Internal Tank Chamber */}
            <div className="w-full h-full bg-slate-900 relative rounded-b-xl overflow-hidden flex flex-col justify-end">
              {/* Waterline Grid & Level Markers */}
              <div className="absolute inset-0 grid grid-rows-4 pointer-events-none z-10 border-dashed border-slate-700/60 opacity-60">
                <div className="border-b border-slate-700/60 flex items-end justify-between px-2 text-[9px] font-mono text-slate-400">
                  <span>75%</span>
                  <span>HIGH LVL</span>
                </div>
                <div className="border-b border-slate-700/60 flex items-end justify-between px-2 text-[9px] font-mono text-slate-400">
                  <span>50%</span>
                  <span>MID TANK</span>
                </div>
                <div className="border-b border-slate-700/60 flex items-end justify-between px-2 text-[9px] font-mono text-slate-400">
                  <span>25%</span>
                  <span>LOW LVL</span>
                </div>
                <div className="flex items-end justify-between px-2 text-[9px] font-mono text-amber-400">
                  <span>DEADSTOCK</span>
                  <span>BASE</span>
                </div>
              </div>

              {/* Deadstock Visual Floor */}
              <div
                style={{ height: `${deadstockPct}%` }}
                className="absolute bottom-0 inset-x-0 bg-rose-500/20 border-t border-rose-500/40 z-10 pointer-events-none flex items-center justify-center"
              >
                <span className="text-[9px] font-mono text-rose-300 bg-rose-950/80 px-1 rounded">
                  Deadstock
                </span>
              </div>

              {/* Liquid Fuel Fill Body */}
              <div
                style={{ height: `${fillPct}%` }}
                className="w-full bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 transition-all duration-700 ease-out relative liquid-wave"
              >
                <div className="absolute -top-1.5 inset-x-0 h-2 bg-amber-300/60 rounded-full blur-[1px]" />
                <div className="absolute top-1 right-2 text-[10px] font-mono font-bold text-amber-950/80">
                  {formatNumber(currentRob)} L
                </div>
              </div>
            </div>
          </div>

          {/* Keel / Baseline Reference */}
          <div className="w-2/5 h-1.5 bg-slate-600 mx-auto rounded-b" />

          {/* Waterline Draft Indicators Left & Right */}
          <div className="absolute -left-6 bottom-4 text-[9px] font-mono text-slate-500 flex flex-col items-center">
            <span>FWD</span>
            <span>{fwdDraft}</span>
          </div>
          <div className="absolute -right-6 bottom-4 text-[9px] font-mono text-slate-500 flex flex-col items-center">
            <span>AFT</span>
            <span>{aftDraft}</span>
          </div>
        </div>
      </div>

      {/* Hull Footer Metrics */}
      <div className="grid grid-cols-2 gap-3 pt-2 text-center text-xs">
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-slate-500 block text-[10px] font-semibold uppercase">
            Total Capacity
          </span>
          <span className="font-mono font-bold text-slate-800">
            {formatNumber(capacity)} L
          </span>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-slate-500 block text-[10px] font-semibold uppercase">
            Usable ROB
          </span>
          <span className="font-mono font-bold text-emerald-600">
            {formatNumber(usableRob)} L
          </span>
        </div>
      </div>
    </div>
  );
}
