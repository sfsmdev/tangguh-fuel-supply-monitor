'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  calculateBookRobAtDate,
  calculateSummary,
  formatNumber,
} from '@backend/index';
import {
  Gauge,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Calculator,
} from 'lucide-react';

export function SoundingView() {
  const {
    state,
    currentUser,
    setSoundingModal,
    setDocPreviewModal,
    deleteSounding,
    openConfirm,
  } = useAppStore();

  const summary = calculateSummary(state);
  const canEdit = Boolean(currentUser?.canEdit);
  const canDelete = Boolean(currentUser?.canDelete);

  const sortedSoundings = [...state.soundings].sort(
    (a, b) =>
      new Date(`${b.date}T${b.time || '00:00'}`).getTime() -
      new Date(`${a.date}T${a.time || '00:00'}`).getTime()
  );

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Closing ROB & Physical Sounding
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tank dip measurements, vessel draft readings, and book inventory variance reconciliation
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setSoundingModal({ isOpen: true, editItem: null })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Physical Sounding</span>
          </button>
        )}
      </div>

      {/* Reconciliation Formula Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white rounded-2xl p-5 shadow-md border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-300 mb-3">
          <Calculator className="w-4 h-4" />
          <span>Live Inventory Reconciliation Formula</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700">
            <div className="text-[10px] font-bold uppercase text-slate-400">
              Calculated Book ROB
            </div>
            <div className="text-base font-mono font-bold text-sky-200 mt-1">
              {formatNumber(summary.bookRob)} L
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              (Opening + Top-Ups) - Dispatches
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700">
            <div className="text-[10px] font-bold uppercase text-slate-400">
              Latest Physical Sounding
            </div>
            <div className="text-base font-mono font-bold text-white mt-1">
              {summary.latestSounding !== null
                ? `${formatNumber(summary.latestSounding)} L`
                : 'No Record'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Chief Officer Dip Tape Measurement
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700">
            <div className="text-[10px] font-bold uppercase text-slate-400">
              Net Inventory Variance
            </div>
            <div
              className={`text-base font-mono font-bold mt-1 ${
                summary.variance === null
                  ? 'text-slate-400'
                  : summary.variance >= 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {summary.variance === null
                ? '-- L'
                : `${summary.variance > 0 ? '+' : ''}${formatNumber(
                    summary.variance
                  )} L`}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Physical Sounding - Book ROB
            </div>
          </div>
        </div>
      </div>

      {/* Soundings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-sky-600" />
            <span>Physical Sounding History</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {sortedSoundings.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3.5">Date & Time (WIT)</th>
                <th className="p-3.5 text-right">Physical Sounding (L)</th>
                <th className="p-3.5 text-right">Theoretical Book ROB</th>
                <th className="p-3.5 text-right">Variance (Diff)</th>
                <th className="p-3.5 text-center">Vessel Draft (Fwd / Aft)</th>
                <th className="p-3.5">Remarks</th>
                <th className="p-3.5 text-center">Sounding Sheet</th>
                {canEdit && <th className="p-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSoundings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <Gauge className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="text-xs font-semibold text-slate-500">
                      No physical sounding measurements recorded yet.
                    </div>
                  </td>
                </tr>
              ) : (
                sortedSoundings.map((s) => {
                  const historicalBookRob = calculateBookRobAtDate(
                    state,
                    s.date,
                    s.time
                  );
                  const rowVariance = Number(s.liters) - historicalBookRob;
                  const varSign = rowVariance >= 0 ? '+' : '';
                  const varBadgeClass =
                    rowVariance >= 0
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border-rose-200';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-mono text-slate-900 font-bold">
                        {s.date} <span className="text-slate-500">{s.time}</span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-extrabold text-sky-800">
                        {formatNumber(s.liters)} L
                      </td>
                      <td
                        className="p-3.5 text-right font-mono font-semibold text-slate-600"
                        title={`Book ROB calculated as of ${s.date} ${s.time}`}
                      >
                        {formatNumber(historicalBookRob)} L
                      </td>
                      <td className="p-3.5 text-right">
                        <span
                          className={`inline-block font-mono font-bold px-2 py-0.5 rounded-full text-[11px] border ${varBadgeClass}`}
                        >
                          {varSign}
                          {formatNumber(rowVariance)} L (
                          {rowVariance >= 0 ? 'Gain' : 'Loss'})
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono">
                        {s.draftFwd ?? '--'} m / {s.draftAft ?? '--'} m
                      </td>
                    <td className="p-3.5 text-slate-600 max-w-xs truncate">
                      {s.remarks || '-'}
                    </td>
                    <td className="p-3.5 text-center">
                      {s.docDataUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setDocPreviewModal({
                              isOpen: true,
                              title: s.docName || 'Sounding Sheet',
                              dataUrl: s.docDataUrl || '',
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-[11px] border border-sky-200"
                        >
                          <FileText className="w-3 h-3" />
                          <span>View Sheet</span>
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setSoundingModal({ isOpen: true, editItem: s })
                            }
                            className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50"
                            title="Edit Sounding"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                openConfirm(
                                  'Delete Physical Sounding',
                                  `Delete sounding record from ${s.date} ${s.time} (${formatNumber(
                                    s.liters
                                  )} L)?`,
                                  () => deleteSounding(s.id),
                                  'Delete'
                                )
                              }
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                              title="Delete Sounding"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

