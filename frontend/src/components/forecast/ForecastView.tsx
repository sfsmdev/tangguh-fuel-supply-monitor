'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  ForecastService,
  formatNumber,
  getWITIsoDate,
} from '@backend/index';
import {
  FloatingForecastChart,
  ShoreForecastChart,
} from './ForecastCharts';
import {
  Fuel,
  Ship,
  Users,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Building2,
} from 'lucide-react';

const HORIZON_OPTIONS = [10, 14, 30, 60, 90];

export function ForecastView() {
  const {
    state,
    currentUser,
    forecastHorizonDays,
    setForecastHorizonDays,
    setClientModalOpen,
    setForecastDispatchModal,
    setForecastTopupModal,
    setFloatingChooserModal,
    setRecordManageModal,
    deleteForecastDispatch,
    deleteForecastTopup,
    updateStorageConfig,
    openConfirm,
  } = useAppStore();

  const canEdit = Boolean(currentUser?.canEdit);
  const canDelete = Boolean(currentUser?.canDelete);
  const isAdmin = Boolean(
    currentUser?.canManageClients || currentUser?.canEdit
  );

  const vesselName = state.storageConfig.vesselName || 'SPOB TRANS BILGIT';
  const shoreName = state.storageConfig.shoreTankName || 'SHORE TANK COMBO';

  const [shoreBaseInput, setShoreBaseInput] = useState(
    String(state.storageConfig.shoreTankInitialRob || 0)
  );

  useEffect(() => {
    setShoreBaseInput(String(state.storageConfig.shoreTankInitialRob || 0));
  }, [state.storageConfig.shoreTankInitialRob]);

  const sim = ForecastService.simulateForecast(state, forecastHorizonDays);

  const handleSaveShoreBase = () => {
    const val = Math.max(0, Number(shoreBaseInput) || 0);
    updateStorageConfig({ shoreTankInitialRob: val });
  };

  return (
    <section className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Fuel Supply & Top-Up Forecast Planning
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Dual-storage forecast simulations (
            <span className="font-bold text-slate-700">{vesselName}</span> &{' '}
            <span className="font-bold text-slate-700">{shoreName}</span>) with
            automated DLAH alerts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setClientModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-xs transition"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Clients ({state.clients.length})</span>
            </button>
          )}

          {canEdit && (
            <>
              <button
                type="button"
                onClick={() =>
                  setForecastDispatchModal({
                    isOpen: true,
                    editItem: null,
                    defaultDate: getWITIsoDate(),
                    defaultClient: state.clients[0]?.name || '',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition"
              >
                <Fuel className="w-3.5 h-3.5" />
                <span>Add Distribution Plan</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setForecastTopupModal({
                    isOpen: true,
                    editItem: null,
                    defaultDate: getWITIsoDate(),
                    defaultTarget: 'floating',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition"
              >
                <Ship className="w-3.5 h-3.5" />
                <span>Add Top-Up Plan</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Horizon Switcher & Quick Base Setting */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mr-1">
            Forecast Horizon:
          </span>
          {HORIZON_OPTIONS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setForecastHorizonDays(days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                forecastHorizonDays === days
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Shore Tank Base ROB (L):
            </span>
            <input
              type="number"
              value={shoreBaseInput}
              onChange={(e) => setShoreBaseInput(e.target.value)}
              className="w-32 px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleSaveShoreBase}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition"
            >
              Save Base
            </button>
          </div>
        )}
      </div>

      {/* DLAH Multi-Horizon Summary Cards (10, 14, 30, 60, 90 Days) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {HORIZON_OPTIONS.map((h) => {
          const metric = sim.dlahMetrics[h];
          const isWarn = metric?.isWarning;
          return (
            <div
              key={h}
              className={`bg-white rounded-2xl border p-3.5 shadow-xs ${
                isWarn ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {h}-Day DLAH Projection
              </div>
              <div
                className={`text-base font-mono font-extrabold mt-1 flex items-center gap-1.5 ${
                  isWarn ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                <span>{formatNumber(metric?.projectedRob || 0)} L</span>
                {isWarn && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
              </div>
              <div className="mt-1">
                {isWarn ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>Warning (≤300k L)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Safe (&gt;300k L)</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* STORAGE 1: FLOATING STORAGE MATRIX TABLE ("SPOB TRANS BILGIT") */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Ship className="w-4 h-4 text-sky-700" />
              <span>{vesselName} — Floating Storage Forecast Matrix</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Opening ROB is synchronized with live real-time book inventory:{' '}
              <span className="font-mono font-bold text-sky-800">
                {formatNumber(sim.liveFloatingRob)} L
              </span>
            </p>
          </div>
          {canEdit && (
            <span className="text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              Tip: Click any date or cell to add/edit a Distribution or Top-Up
            </span>
          )}
        </div>

        {/* Horizontal Timeline Scroll Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-mono text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3 sticky left-0 bg-slate-100 z-10 w-52 font-bold border-r border-slate-200 shadow-xs">
                  Client Matrix & Parameter
                </th>
                {sim.floatingTimeline.map((t) => (
                  <th
                    key={t.iso}
                    onClick={() => {
                      if (canEdit) {
                        setFloatingChooserModal({
                          isOpen: true,
                          date: t.iso,
                        });
                      }
                    }}
                    className={`p-2.5 text-center min-w-[145px] font-bold border-r border-slate-200 transition ${
                      canEdit ? 'cursor-pointer hover:bg-sky-100' : ''
                    }`}
                    title={
                      canEdit
                        ? `Click to add Distribution or Top-Up on ${t.iso}`
                        : t.iso
                    }
                  >
                    <div className="text-xs text-sky-800">{t.dayLabel}</div>
                    <div className="text-[9px] font-mono text-slate-500">
                      {t.iso}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 bg-white">
              {/* Dynamically Rendered Client Master Rows */}
              {state.clients.length === 0 ? (
                <tr>
                  <td
                    colSpan={sim.floatingTimeline.length + 1}
                    className="p-6 text-center bg-slate-50/60"
                  >
                    <div className="inline-flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span>
                          No clients available. Click &apos;Add Client&apos; to
                          create one.
                        </span>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setClientModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-xs transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Client</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                state.clients.map((client) => (
                  <tr key={client.id}>
                    <td className="p-2.5 font-bold sticky left-0 bg-white z-10 border-r border-slate-200 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: client.color }}
                        />
                        <span className="truncate">{client.name}</span>
                      </div>
                    </td>

                    {sim.floatingTimeline.map((t) => {
                      const list = t.clientGroups[client.name] || [];
                      return (
                        <td
                          key={`${client.id}_${t.iso}`}
                          onClick={() => {
                            if (canEdit) {
                              setFloatingChooserModal({
                                isOpen: true,
                                date: t.iso,
                                preselectedClient: client.name,
                              });
                            }
                          }}
                          className={`p-2 text-center border-r border-slate-200 align-top transition ${
                            canEdit ? 'cursor-pointer hover:bg-sky-50/60' : ''
                          }`}
                          title={
                            canEdit
                              ? `Click to add or manage for ${client.name} on ${t.iso}`
                              : `${client.name} (${t.iso})`
                          }
                        >
                          {list.length > 0 ? (
                            list.map((d) => (
                              <div
                                key={d.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (canEdit) {
                                    setRecordManageModal({
                                      isOpen: true,
                                      type: 'dispatch',
                                      id: d.id,
                                      date: t.iso,
                                      clientHint: client.name,
                                    });
                                  }
                                }}
                                className={`mb-1 p-1.5 rounded text-[10px] font-medium border ${client.badgeClass} text-left cursor-pointer hover:ring-2 hover:ring-sky-400`}
                                title={`Click to Edit or Delete: ${d.vessel} (${formatNumber(
                                  d.volume
                                )} L)`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold truncate">
                                    {d.vessel}
                                  </span>
                                  {canEdit && (
                                    <Pencil className="w-2.5 h-2.5 opacity-70 shrink-0" />
                                  )}
                                </div>
                                <div className="font-mono">
                                  {formatNumber(d.volume)} L
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-300 text-[11px]">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}

              {/* Top-Up Inbound Row */}
              <tr>
                <td className="p-2.5 font-bold sticky left-0 bg-white z-10 border-r border-slate-200 text-teal-800 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <Ship className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Top-Up Inbound</span>
                  </div>
                </td>
                {sim.floatingTimeline.map((t) => {
                  const floatingTopups = t.topups.filter(
                    (tp) => Number(tp.floatingVolume) > 0
                  );
                  return (
                    <td
                      key={`topup_${t.iso}`}
                      onClick={() => {
                        if (canEdit) {
                          setFloatingChooserModal({
                            isOpen: true,
                            date: t.iso,
                          });
                        }
                      }}
                      className={`p-2 text-center border-r border-slate-200 align-top transition ${
                        canEdit ? 'cursor-pointer hover:bg-teal-50/50' : ''
                      }`}
                    >
                      {floatingTopups.length > 0 ? (
                        floatingTopups.map((tp) => (
                          <div
                            key={tp.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canEdit) {
                                setRecordManageModal({
                                  isOpen: true,
                                  type: 'topup',
                                  id: tp.id,
                                  date: t.iso,
                                });
                              }
                            }}
                            className="mb-1 p-1.5 bg-teal-50 border border-teal-200 rounded text-[10px] text-teal-900 font-medium text-left truncate cursor-pointer hover:ring-2 hover:ring-teal-400"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold truncate text-teal-700">
                                {tp.vessel}
                              </span>
                              {canEdit && (
                                <Pencil className="w-2.5 h-2.5 opacity-70 shrink-0" />
                              )}
                            </div>
                            <div className="font-mono text-teal-800">
                              +{formatNumber(tp.floatingVolume)} L
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-300 text-[11px]">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Projected ROB (L) Summary Row */}
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                <td className="p-3 sticky left-0 bg-slate-50 z-10 border-r border-slate-200 text-sky-900 shadow-xs">
                  Projected ROB (L)
                </td>
                {sim.floatingTimeline.map((t) => {
                  const isWarning = t.closingRob <= 300000;
                  return (
                    <td
                      key={`rob_${t.iso}`}
                      className={`p-2 text-center border-r border-slate-200 align-top ${
                        isWarning ? 'bg-rose-50/70' : ''
                      }`}
                    >
                      <div
                        className={`font-mono text-xs ${
                          isWarning
                            ? 'text-rose-700 font-extrabold'
                            : 'text-slate-900 font-bold'
                        }`}
                      >
                        {formatNumber(t.closingRob)}
                      </div>
                      <div className="mt-1">
                        {isWarning ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                            <span>Warning</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Safe</span>
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Storage Forecast Chart */}
      <FloatingForecastChart
        vesselName={vesselName}
        timeline={sim.floatingTimeline}
      />

      {/* STORAGE 2: SHORE TANK COMBO SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {shoreName} (Onshore Tank Projection)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cumulative Carry-Over Running Balance • Base ROB:{' '}
              <span className="font-mono font-bold text-emerald-700">
                {formatNumber(sim.shoreBaselineRobL)} L
              </span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-mono text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3 sticky left-0 bg-slate-100 z-10 w-52 font-bold border-r border-slate-200 shadow-xs">
                  Onshore Tank Parameter
                </th>
                {sim.shoreTimeline.map((t) => (
                  <th
                    key={`shore_head_${t.iso}`}
                    onClick={() => {
                      if (canEdit) {
                        setForecastTopupModal({
                          isOpen: true,
                          editItem: null,
                          defaultDate: t.iso,
                          defaultTarget: 'shore',
                        });
                      }
                    }}
                    className={`p-2.5 text-center min-w-[140px] font-bold border-r border-slate-200 ${
                      canEdit ? 'cursor-pointer hover:bg-emerald-50' : ''
                    }`}
                  >
                    <div className="text-xs text-emerald-900">{t.dayLabel}</div>
                    <div className="text-[9px] font-mono text-slate-500">
                      {t.iso}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 bg-white">
              {/* Shore Top-Up Row */}
              <tr>
                <td className="p-3 font-bold sticky left-0 bg-white z-10 border-r border-slate-200 text-teal-800 shadow-xs">
                  Top-Up Inbound (L)
                </td>
                {sim.shoreTimeline.map((t) => {
                  const shoreTopups = t.topups.filter(
                    (tp) => Number(tp.shoreVolume) > 0
                  );
                  return (
                    <td
                      key={`shore_tp_${t.iso}`}
                      onClick={() => {
                        if (canEdit) {
                          setForecastTopupModal({
                            isOpen: true,
                            editItem: null,
                            defaultDate: t.iso,
                            defaultTarget: 'shore',
                          });
                        }
                      }}
                      className={`p-2 text-center border-r border-slate-200 align-top ${
                        canEdit ? 'cursor-pointer hover:bg-emerald-50/40' : ''
                      }`}
                    >
                      {shoreTopups.length > 0 ? (
                        shoreTopups.map((tp) => (
                          <div
                            key={tp.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canEdit) {
                                setRecordManageModal({
                                  isOpen: true,
                                  type: 'topup',
                                  id: tp.id,
                                  date: t.iso,
                                });
                              }
                            }}
                            className="mb-1 p-1.5 bg-emerald-50 border border-emerald-200 rounded text-[10px] text-emerald-900 font-medium text-left truncate cursor-pointer hover:ring-2 hover:ring-emerald-400"
                          >
                            <div className="font-bold truncate">
                              {tp.vessel}
                            </div>
                            <div className="font-mono">
                              +{formatNumber(tp.shoreVolume)} L
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-300 text-[11px]">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Shore Running ROB Row */}
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                <td className="p-3 sticky left-0 bg-slate-50 z-10 border-r border-slate-200 text-emerald-900 shadow-xs">
                  Running ROB (L)
                </td>
                {sim.shoreTimeline.map((t) => (
                  <td
                    key={`shore_rob_${t.iso}`}
                    className="p-2.5 text-center border-r border-slate-200 font-mono text-xs text-emerald-800"
                  >
                    {formatNumber(t.dynamicRobL)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Dedicated Base ROB Input Bar below SHORE TANK COMBO table */}
        <div className="p-4 bg-emerald-50/60 border-t border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-emerald-900">
            <span className="font-bold uppercase tracking-wider">
              {shoreName} Baseline ROB:
            </span>
            <span className="font-mono font-extrabold text-emerald-800">
              {formatNumber(sim.shoreBaselineRobL)} L
            </span>
            <span className="text-slate-500 text-[11px] hidden md:inline">
              (Cumulative carry-over starting balance for onshore storage)
            </span>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">
                Base ROB (L):
              </label>
              <input
                type="number"
                min={0}
                value={shoreBaseInput}
                onChange={(e) => setShoreBaseInput(e.target.value)}
                className="w-36 px-3 py-1.5 text-xs font-mono font-bold bg-white rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleSaveShoreBase}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition"
              >
                Update Base
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Shore Tank Forecast Chart */}
      <ShoreForecastChart shoreName={shoreName} timeline={sim.shoreTimeline} />

      {/* Detailed Forecast Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scheduled Forecast Distributions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Fuel className="w-4 h-4 text-amber-500" />
              <span>Scheduled Forecast Distributions ({vesselName})</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              {state.forecastDispatches.length} plans
            </span>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 text-[11px] uppercase">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Vessel</th>
                  <th className="p-3 text-right">Volume (L)</th>
                  {canEdit && <th className="p-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.forecastDispatches.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-6 text-center text-slate-400 text-xs"
                    >
                      No forecast distributions scheduled yet.
                    </td>
                  </tr>
                ) : (
                  [...state.forecastDispatches]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((fd) => (
                      <tr key={fd.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono">{fd.date}</td>
                        <td className="p-3 font-bold text-slate-800">
                          {fd.client}
                        </td>
                        <td className="p-3">{fd.vessel}</td>
                        <td className="p-3 text-right font-mono font-bold text-amber-700">
                          {formatNumber(fd.volume)} L
                        </td>
                        {canEdit && (
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setForecastDispatchModal({
                                    isOpen: true,
                                    editItem: fd,
                                  })
                                }
                                className="p-1 rounded text-sky-600 hover:bg-sky-50"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openConfirm(
                                      'Delete Forecast Distribution',
                                      `Delete scheduled distribution for ${fd.vessel} (${formatNumber(
                                        fd.volume
                                      )} L) on ${fd.date}?`,
                                      () => deleteForecastDispatch(fd.id),
                                      'Delete'
                                    )
                                  }
                                  className="p-1 rounded text-rose-600 hover:bg-rose-50"
                                  title="Delete"
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

        {/* Scheduled Inbound Top-Up Replenishments */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Ship className="w-4 h-4 text-teal-600" />
              <span>Scheduled Forecast Top-Up Replenishments</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              {state.forecastTopups.length} plans
            </span>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 text-[11px] uppercase">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Vessel</th>
                  <th className="p-3 text-right">Floating (L)</th>
                  <th className="p-3 text-right">Shore (L)</th>
                  {canEdit && <th className="p-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.forecastTopups.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-6 text-center text-slate-400 text-xs"
                    >
                      No forecast top-ups scheduled yet.
                    </td>
                  </tr>
                ) : (
                  [...state.forecastTopups]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((ft) => (
                      <tr key={ft.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono">{ft.date}</td>
                        <td className="p-3 font-bold text-slate-800">
                          {ft.vessel}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-teal-700">
                          +{formatNumber(ft.floatingVolume)} L
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">
                          +{formatNumber(ft.shoreVolume)} L
                        </td>
                        {canEdit && (
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setForecastTopupModal({
                                    isOpen: true,
                                    editItem: ft,
                                  })
                                }
                                className="p-1 rounded text-sky-600 hover:bg-sky-50"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openConfirm(
                                      'Delete Forecast Top-Up',
                                      `Delete scheduled top-up for ${ft.vessel} on ${ft.date}?`,
                                      () => deleteForecastTopup(ft.id),
                                      'Delete'
                                    )
                                  }
                                  className="p-1 rounded text-rose-600 hover:bg-rose-50"
                                  title="Delete"
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
      </div>
    </section>
  );
}

