'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { formatNumber } from '@backend/index';
import { Ship, Plus, Pencil, Trash2, CheckCircle2, ArrowDownToLine } from 'lucide-react';

export function TopupView() {
  const {
    state,
    currentUser,
    setTopupModal,
    receiveTopup,
    deleteTopup,
    openConfirm,
  } = useAppStore();

  const canEdit = Boolean(
    currentUser?.canEditOperations ??
      (currentUser?.roleCode === 'admin' ||
        currentUser?.roleCode === 'fuel_coordinator' ||
        currentUser?.roleCode === 'staff' ||
        currentUser?.canEdit)
  );
  const canDelete = Boolean(
    currentUser?.canDeleteOperations ??
      (currentUser?.roleCode === 'admin' ||
        currentUser?.roleCode === 'fuel_coordinator' ||
        currentUser?.canDelete)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Discharging':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'In Transit':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Loading':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Cargo Top-Up Inbound Plan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Supply tanker replenishment voyages, port schedules, and completed cargo transfers
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() =>
              setTopupModal({
                isOpen: true,
                editItem: null,
                defaultStatus: 'Planned',
              })
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Inbound Cargo Voyage</span>
          </button>
        )}
      </div>

      {/* Top-up Voyages Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Ship className="w-4 h-4 text-emerald-600" />
            <span>Inbound Replenishment Voyages</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {state.topups.length} voyages
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3.5">Performing Vessel</th>
                <th className="p-3.5 text-right">Cargo Volume</th>
                <th className="p-3.5">Route (Load → Disch)</th>
                <th className="p-3.5">ETD / ETA</th>
                <th className="p-3.5">ATD / ATA</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Reception Action</th>
                {canEdit && <th className="p-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.topups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <Ship className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="text-xs font-semibold text-slate-500">
                      No inbound cargo replenishment voyages recorded yet.
                    </div>
                  </td>
                </tr>
              ) : (
                state.topups.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-bold text-slate-900">
                      {t.vessel}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                      +{formatNumber(t.volume)} L
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-800">
                        {t.loadPort}
                      </span>{' '}
                      →{' '}
                      <span className="font-semibold text-slate-800">
                        {t.dischPort}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">
                      <div>ETD: {t.etd?.replace('T', ' ') || '--'}</div>
                      <div>ETA: {t.eta?.replace('T', ' ') || '--'}</div>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">
                      <div>ATD: {t.atd?.replace('T', ' ') || '--'}</div>
                      <div>ATA: {t.ata?.replace('T', ' ') || '--'}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(
                          t.status
                        )}`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {t.status === 'Completed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>In Storage</span>
                        </span>
                      ) : canEdit ? (
                        <button
                          type="button"
                          onClick={() =>
                            openConfirm(
                              'Receive Cargo Top-Up into Storage',
                              `Confirm receiving +${formatNumber(
                                t.volume
                              )} L from ${t.vessel} into Floating Storage? This will mark the voyage as Completed and immediately add +${formatNumber(
                                t.volume
                              )} L to Current Book ROB.`,
                              () => receiveTopup(t.id),
                              'Receive Top-Up'
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition"
                          title="Mark voyage Completed and add volume to Floating Storage Book ROB"
                        >
                          <ArrowDownToLine className="w-3 h-3" />
                          <span>Receive Top Up</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">
                          Pending
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setTopupModal({ isOpen: true, editItem: t })
                            }
                            className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50"
                            title="Edit Voyage"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                openConfirm(
                                  'Delete Cargo Top-Up Voyage',
                                  `Are you sure you want to delete voyage for ${t.vessel} (${formatNumber(
                                    t.volume
                                  )} L)?`,
                                  () => deleteTopup(t.id),
                                  'Delete'
                                )
                              }
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                              title="Delete Voyage"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

