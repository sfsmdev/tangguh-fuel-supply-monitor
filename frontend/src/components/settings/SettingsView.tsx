'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getWITIsoDate } from '@backend/index';
import {
  exportFullReportToExcel,
  printExecutivePdfReport,
} from '@/lib/exportUtils';
import {
  Settings,
  Users,
  FileSpreadsheet,
  FileText,
  Download,
  Upload,
  Trash2,
  Save,
} from 'lucide-react';

export function SettingsView() {
  const {
    state,
    updateStorageConfig,
    setClientModalOpen,
    restoreFullState,
    resetAllData,
    openConfirm,
    showToast,
  } = useAppStore();

  const [vesselName, setVesselName] = useState(state.storageConfig.vesselName);
  const [totalCapacity, setTotalCapacity] = useState(
    String(state.storageConfig.totalCapacity)
  );
  const [deadstock, setDeadstock] = useState(
    String(state.storageConfig.deadstock)
  );
  const [initialOpeningRob, setInitialOpeningRob] = useState(
    String(state.storageConfig.initialOpeningRob)
  );
  const [shoreTankName, setShoreTankName] = useState(
    state.storageConfig.shoreTankName
  );
  const [shoreTankInitialRob, setShoreTankInitialRob] = useState(
    String(state.storageConfig.shoreTankInitialRob)
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVesselName(state.storageConfig.vesselName);
    setTotalCapacity(String(state.storageConfig.totalCapacity));
    setDeadstock(String(state.storageConfig.deadstock));
    setInitialOpeningRob(String(state.storageConfig.initialOpeningRob));
    setShoreTankName(state.storageConfig.shoreTankName);
    setShoreTankInitialRob(String(state.storageConfig.shoreTankInitialRob));
  }, [state.storageConfig]);

  const handleSaveStorage = (e: React.FormEvent) => {
    e.preventDefault();
    updateStorageConfig({
      vesselName: vesselName.trim() || 'SPOB TRANS BILGIT',
      totalCapacity: Math.max(0, Number(totalCapacity) || 0),
      deadstock: Math.max(0, Number(deadstock) || 0),
      initialOpeningRob: Math.max(0, Number(initialOpeningRob) || 0),
      shoreTankName: shoreTankName.trim() || 'SHORE TANK COMBO',
      shoreTankInitialRob: Math.max(0, Number(shoreTankInitialRob) || 0),
    });
  };

  const handleBackupJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tangguh_Fuel_State_Backup_${getWITIsoDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON database backup downloaded.', 'success');
  };

  const handleRestoreJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || '{}'));
        restoreFullState(parsed);
      } catch {
        showToast('Invalid JSON backup file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Floating Storage & System Configuration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage storage vessel specifications, centralized client master list, and database maintenance
        </p>
      </div>

      {/* Admin Client Management Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Centralized Client Master Management (Full CRUD)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Currently registered clients:{' '}
              <span className="font-mono font-bold text-slate-800">
                {state.clients.length}
              </span>
              . Changes synchronize across Forecast Matrix, Dispatches, and Dashboards.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setClientModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-sm transition shrink-0"
        >
          <Users className="w-4 h-4" />
          <span>Manage Clients</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Storage Vessel Specifications Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-sky-600" />
            <span>Floating Storage & Onshore Tank Specifications</span>
          </h2>

          <form onSubmit={handleSaveStorage} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Floating Storage Vessel Name
                </label>
                <input
                  type="text"
                  required
                  value={vesselName}
                  onChange={(e) => setVesselName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Total Tank Capacity (Liters)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={totalCapacity}
                  onChange={(e) => setTotalCapacity(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unpumpable Deadstock Floor (Liters)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={deadstock}
                  onChange={(e) => setDeadstock(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Initial Opening ROB (Liters)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={initialOpeningRob}
                  onChange={(e) => setInitialOpeningRob(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Onshore Tank Facility Name
                </label>
                <input
                  type="text"
                  required
                  value={shoreTankName}
                  onChange={(e) => setShoreTankName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Onshore Tank Base ROB (Liters)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={shoreTankInitialRob}
                  onChange={(e) => setShoreTankInitialRob(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-xs transition"
              >
                <Save className="w-4 h-4" />
                <span>Save Storage Configuration</span>
              </button>
            </div>
          </form>
        </div>

        {/* Reports & Database Maintenance (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Operational Data Export */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-800">
              Operational Data Export
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => exportFullReportToExcel(state)}
                className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex flex-col items-center gap-1.5 transition"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Export Full Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => printExecutivePdfReport(state)}
                className="p-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold flex flex-col items-center gap-1.5 transition"
              >
                <FileText className="w-5 h-5 text-rose-600" />
                <span>Print PDF Statement</span>
              </button>
            </div>
          </div>

          {/* Database & State Maintenance */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800">
              Database & State Maintenance
            </h2>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleBackupJson}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Backup JSON</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestoreJsonFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Restore JSON</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  openConfirm(
                    'Reset All Operational Data',
                    'Are you sure you want to permanently clear all dispatches, soundings, top-ups, forecast records, and reset the client list to an empty array?',
                    () => resetAllData(),
                    'Reset Database'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset All Records</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

