'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { calculateSummary, formatNumber } from '@backend/index';
import { printExecutivePdfReport } from '@/lib/exportUtils';
import { HullVisualizer } from './HullVisualizer';
import {
  ContractorDistributionCard,
  DispatchTrendlineCard,
} from './DashboardCharts';
import { FuelPriceCard } from './FuelPriceCard';

export function DashboardView() {
  const {
    state,
    currentUser,
    setTopupModal,
    setDispatchModal,
    setQuickRobModalOpen,
  } = useAppStore();

  const summary = calculateSummary(state);
  const canEdit = Boolean(
    currentUser?.canEditOperations || currentUser?.roleCode === 'admin'
  );

  let varianceBadgeText = '--';
  let varianceBadgeClass =
    'font-mono font-bold px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500';
  if (summary.latestSounding !== null && summary.variance !== null) {
    const sign = summary.variance >= 0 ? '+' : '';
    varianceBadgeText = `${sign}${formatNumber(summary.variance)} L (${
      summary.variance >= 0 ? 'Gain' : 'Loss'
    })`;
    varianceBadgeClass =
      summary.variance >= 0
        ? 'font-mono font-bold px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800'
        : 'font-mono font-bold px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800';
  }

  return (
    <section className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Real-Time Fuel Monitoring Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-sky-100 text-sky-800 border border-sky-300">
              Biofuel B50
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Live reconciliation of Floating Storage ROB, Bunker Dispatches, and
            Cargo Reception.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() =>
                  setTopupModal({
                    isOpen: true,
                    editItem: null,
                    defaultStatus: 'Completed',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                title="Record an inbound replenishment directly into storage"
              >
                <i className="fa-solid fa-ship" />
                <span>Entry Cargo Top-Up Received</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setDispatchModal({ isOpen: true, editItem: null })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition"
                title="Record an offshore bunker dispatch directly"
              >
                <i className="fa-solid fa-gas-pump" />
                <span>Entry Total Bunker Dispatched</span>
              </button>

              <button
                type="button"
                onClick={() => setQuickRobModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-semibold border border-sky-200 transition"
              >
                <i className="fa-solid fa-pen-to-square" />
                <span>Edit Initial ROB</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => printExecutivePdfReport(state)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-900 text-xs font-semibold shadow-xs transition"
          >
            <i className="fa-solid fa-file-pdf text-rose-400" />
            <span>Export PDF Summary</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Initial Opening ROB */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-sky-300 transition relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-14 h-14 bg-sky-50 rounded-full flex items-center justify-center text-sky-300 group-hover:scale-110 transition">
            <i className="fa-solid fa-box-archive text-xl" />
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Initial Opening ROB</span>
            {canEdit && (
              <button
                type="button"
                onClick={() => setQuickRobModalOpen(true)}
                className="text-sky-600 hover:text-sky-800 text-xs relative z-10"
                title="Adjust Value"
              >
                <i className="fa-solid fa-pen-to-square" />
              </button>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900 mt-2">
            {formatNumber(summary.initialRob)} L
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Base opening volume baseline
          </div>
        </div>

        {/* Card 2: Total Cargo Top-Up Received */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-300 group-hover:scale-110 transition">
            <i className="fa-solid fa-ship text-xl" />
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Cargo Top-Up Received
          </div>
          <div className="text-xl sm:text-2xl font-mono font-extrabold text-emerald-600 mt-2">
            {formatNumber(summary.totalTopup)} L
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary.completedTopupCount} Completed Voyages
          </div>
        </div>

        {/* Card 3: Bunker Dispatched */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center text-amber-300 group-hover:scale-110 transition">
            <i className="fa-solid fa-gas-pump text-xl" />
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Bunker Dispatched
          </div>
          <div className="text-xl sm:text-2xl font-mono font-extrabold text-amber-600 mt-2">
            {formatNumber(summary.totalDispatched)} L
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Today:{' '}
            <span className="font-bold text-slate-700">
              {formatNumber(summary.todayDispatched)} L
            </span>
          </div>
        </div>

        {/* Card 4: Book ROB vs Physical Sounding & Variance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-14 h-14 bg-sky-50 rounded-full flex items-center justify-center text-sky-400 group-hover:scale-110 transition">
            <i className="fa-solid fa-scale-balanced text-xl" />
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Current Book ROB
          </div>
          <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900 mt-2">
            {formatNumber(summary.bookRob)} L
          </div>
          <div className="flex items-center justify-between text-xs mt-1 border-t border-slate-100 pt-1">
            <span className="text-slate-500 text-[11px]">
              Sounding:{' '}
              <span className="font-mono font-semibold">
                {summary.latestSounding !== null
                  ? `${formatNumber(summary.latestSounding)} L`
                  : 'No records'}
              </span>
            </span>
            <span className={varianceBadgeClass}>{varianceBadgeText}</span>
          </div>
        </div>
      </div>

      {/* Ship Visualizer (7 cols) & Contractor Distribution + Fuel Price (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 flex">
          <HullVisualizer />
        </div>
        <div className="lg:col-span-5 flex flex-col gap-6">
          <FuelPriceCard />
          <ContractorDistributionCard />
        </div>
      </div>

      {/* 14-Day Bunker Dispatch Trendline */}
      <DispatchTrendlineCard />
    </section>
  );
}
