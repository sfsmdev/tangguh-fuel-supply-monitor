'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAppStore } from '@/store/useAppStore';
import {
  BunkeringRecord,
  calculateFlowRate,
  formatNumber,
  getWITIsoDate,
  getWITIsoDateTime,
  getWITIsoTime,
  RBAC_USERS,
  TopupStatus,
} from '@backend/index';
import {
  X,
  Plus,
  Users,
  Fuel,
  Ship,
  Pencil,
  Trash2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

export function OperationalModals() {
  const store = useAppStore();
  const {
    state,
    currentUser,
    isSwitchUserModalOpen,
    setSwitchUserModalOpen,
    isQuickRobModalOpen,
    setQuickRobModalOpen,
    isBulkImportModalOpen,
    setBulkImportModalOpen,
    dispatchModal,
    setDispatchModal,
    soundingModal,
    setSoundingModal,
    topupModal,
    setTopupModal,
    docPreviewModal,
    setDocPreviewModal,
    forecastDispatchModal,
    setForecastDispatchModal,
    forecastTopupModal,
    setForecastTopupModal,
    floatingChooserModal,
    setFloatingChooserModal,
    recordManageModal,
    setRecordManageModal,
    setClientModalOpen,
    confirmDialog,
    closeConfirm,
    toasts,
    removeToast,
  } = store;

  const isAdmin = Boolean(currentUser?.canManageClients);
  const canDelete = Boolean(currentUser?.canDelete);

  // --- 1. SWITCH USER STATE ---
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // --- 2. QUICK OPENING ROB STATE ---
  const [quickRobVal, setQuickRobVal] = useState('');
  useEffect(() => {
    if (isQuickRobModalOpen) {
      setQuickRobVal(String(state.storageConfig.initialOpeningRob || 0));
    }
  }, [isQuickRobModalOpen, state.storageConfig.initialOpeningRob]);

  // --- 3. DAILY BUNKER DISPATCH FORM STATE ---
  const [dispDate, setDispDate] = useState('');
  const [dispClient, setDispClient] = useState('');
  const [dispVessel, setDispVessel] = useState('');
  const [dispVolume, setDispVolume] = useState('');
  const [dispStart, setDispStart] = useState('08:00');
  const [dispEnd, setDispEnd] = useState('10:00');

  useEffect(() => {
    if (dispatchModal.isOpen) {
      const item = dispatchModal.editItem;
      if (item) {
        setDispDate(item.date);
        setDispClient(item.contractor);
        setDispVessel(item.vesselName);
        setDispVolume(String(item.volume));
        setDispStart(item.startTime);
        setDispEnd(item.endTime);
      } else {
        setDispDate(getWITIsoDate());
        setDispClient(state.clients[0]?.name || '');
        setDispVessel('');
        setDispVolume('');
        setDispStart('08:00');
        setDispEnd('10:00');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatchModal]);

  // Keep dispClient synchronized when clients are added/renamed/deleted while modal is open
  useEffect(() => {
    if (!dispatchModal.isOpen) return;
    if (state.clients.length === 0) {
      setDispClient('');
    } else if (!state.clients.some((c) => c.name === dispClient)) {
      setDispClient(state.clients[state.clients.length - 1].name);
    }
  }, [state.clients, dispatchModal.isOpen, dispClient]);

  const previewFlowRate = calculateFlowRate(
    Number(dispVolume) || 0,
    dispStart,
    dispEnd
  );

  // --- 4. BULK EXCEL IMPORT STATE ---
  const [pendingImportRows, setPendingImportRows] = useState<
    Omit<BunkeringRecord, 'id'>[]
  >([]);
  const [importFileName, setImportFileName] = useState('');

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);
        const parsed: Omit<BunkeringRecord, 'id'>[] = rows
          .map((r) => {
            const date = String(r.Date || r.date || getWITIsoDate());
            const contractor = String(
              r.Client ||
                r.Contractor ||
                r.client ||
                state.clients[0]?.name ||
                'UNASSIGNED'
            );
            const vesselName = String(
              r.Vessel || r['Receiving Vessel'] || r.vesselName || 'VESSEL'
            );
            const volume = Number(r.Volume || r['Volume (L)'] || r.volume || 0);
            const startTime = String(r['Start Time'] || r.startTime || '08:00');
            const endTime = String(r['End Time'] || r.endTime || '10:00');
            return {
              date,
              contractor,
              vesselName,
              volume,
              startTime,
              endTime,
              flowRate: calculateFlowRate(volume, startTime, endTime),
            };
          })
          .filter((item) => item.volume > 0);
        setPendingImportRows(parsed);
      } catch {
        store.showToast('Failed to parse Excel file.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- 5. SOUNDING FORM STATE ---
  const [sndDate, setSndDate] = useState('');
  const [sndTime, setSndTime] = useState('');
  const [sndLiters, setSndLiters] = useState('');
  const [sndFwd, setSndFwd] = useState('');
  const [sndAft, setSndAft] = useState('');
  const [sndRemarks, setSndRemarks] = useState('');
  const [sndDocName, setSndDocName] = useState<string | null>(null);
  const [sndDocDataUrl, setSndDocDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (soundingModal.isOpen) {
      const item = soundingModal.editItem;
      if (item) {
        setSndDate(item.date);
        setSndTime(item.time);
        setSndLiters(String(item.liters));
        setSndFwd(item.draftFwd !== null && item.draftFwd !== undefined ? String(item.draftFwd) : '');
        setSndAft(item.draftAft !== null && item.draftAft !== undefined ? String(item.draftAft) : '');
        setSndRemarks(item.remarks || '');
        setSndDocName(item.docName || null);
        setSndDocDataUrl(item.docDataUrl || null);
      } else {
        setSndDate(getWITIsoDate());
        setSndTime(getWITIsoTime());
        setSndLiters('');
        setSndFwd('');
        setSndAft('');
        setSndRemarks('');
        setSndDocName(null);
        setSndDocDataUrl(null);
      }
    }
  }, [soundingModal]);

  // --- 6. TOPUP FORM STATE ---
  const [topVessel, setTopVessel] = useState('');
  const [topVolume, setTopVolume] = useState('');
  const [topLoadPort, setTopLoadPort] = useState('Balikpapan');
  const [topDischPort, setTopDischPort] = useState('Tangguh Offshore');
  const [topEtd, setTopEtd] = useState('');
  const [topEta, setTopEta] = useState('');
  const [topAtd, setTopAtd] = useState('');
  const [topAta, setTopAta] = useState('');
  const [topStatus, setTopStatus] = useState<TopupStatus>('Planned');

  useEffect(() => {
    if (topupModal.isOpen) {
      const item = topupModal.editItem;
      if (item) {
        setTopVessel(item.vessel);
        setTopVolume(String(item.volume));
        setTopLoadPort(item.loadPort);
        setTopDischPort(item.dischPort);
        setTopEtd(item.etd);
        setTopEta(item.eta);
        setTopAtd(item.atd || '');
        setTopAta(item.ata || '');
        setTopStatus(item.status);
      } else {
        const dt = getWITIsoDateTime();
        const initialStatus = topupModal.defaultStatus || 'Planned';
        setTopVessel('');
        setTopVolume('');
        setTopLoadPort('Balikpapan');
        setTopDischPort('Tangguh Offshore');
        setTopEtd(dt);
        setTopEta(dt);
        setTopAtd(initialStatus === 'Completed' ? dt : '');
        setTopAta(initialStatus === 'Completed' ? dt : '');
        setTopStatus(initialStatus);
      }
    }
  }, [topupModal]);

  // --- 7. FORECAST DISTRIBUTION FORM STATE ---
  const [fcDispDate, setFcDispDate] = useState('');
  const [fcDispClient, setFcDispClient] = useState('');
  const [fcDispVessel, setFcDispVessel] = useState('');
  const [fcDispVolume, setFcDispVolume] = useState('');

  useEffect(() => {
    if (forecastDispatchModal.isOpen) {
      const item = forecastDispatchModal.editItem;
      if (item) {
        setFcDispDate(item.date);
        setFcDispClient(item.client);
        setFcDispVessel(item.vessel);
        setFcDispVolume(String(item.volume));
      } else {
        setFcDispDate(forecastDispatchModal.defaultDate || getWITIsoDate());
        setFcDispClient(
          forecastDispatchModal.defaultClient || state.clients[0]?.name || ''
        );
        setFcDispVessel('');
        setFcDispVolume('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecastDispatchModal]);

  // Keep fcDispClient synchronized when clients are added/renamed/deleted while modal is open
  useEffect(() => {
    if (!forecastDispatchModal.isOpen) return;
    if (state.clients.length === 0) {
      setFcDispClient('');
    } else if (!state.clients.some((c) => c.name === fcDispClient)) {
      setFcDispClient(state.clients[state.clients.length - 1].name);
    }
  }, [state.clients, forecastDispatchModal.isOpen, fcDispClient]);

  // --- 8. FORECAST TOP-UP FORM STATE ---
  const [fcTopDate, setFcTopDate] = useState('');
  const [fcTopVessel, setFcTopVessel] = useState('');
  const [fcTopTarget, setFcTopTarget] = useState<'floating' | 'shore' | 'both'>(
    'floating'
  );
  const [fcTopFloatingVol, setFcTopFloatingVol] = useState('');
  const [fcTopShoreVol, setFcTopShoreVol] = useState('');

  useEffect(() => {
    if (forecastTopupModal.isOpen) {
      const item = forecastTopupModal.editItem;
      if (item) {
        setFcTopDate(item.date);
        setFcTopVessel(item.vessel);
        const hasF = Number(item.floatingVolume) > 0;
        const hasS = Number(item.shoreVolume) > 0;
        setFcTopTarget(
          hasF && hasS ? 'both' : hasS ? 'shore' : 'floating'
        );
        setFcTopFloatingVol(String(item.floatingVolume || ''));
        setFcTopShoreVol(String(item.shoreVolume || ''));
      } else {
        setFcTopDate(forecastTopupModal.defaultDate || getWITIsoDate());
        setFcTopVessel('');
        setFcTopTarget(forecastTopupModal.defaultTarget || 'floating');
        setFcTopFloatingVol('');
        setFcTopShoreVol('');
      }
    }
  }, [forecastTopupModal]);

  return (
    <>
      {/* 1. SWITCH USER / AUTHENTICATE MODAL */}
      {isSwitchUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src="/logos/samudera-logo.png"
                  alt="Samudera Indonesia"
                  className="h-7 max-w-[120px] object-contain"
                />
                <span className="text-xs font-bold text-slate-600">
                  | Switch Account
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSwitchUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (store.login(loginUser, loginPass)) {
                  setLoginUser('');
                  setLoginPass('');
                }
              }}
              className="p-5 space-y-4"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Authenticate User
                </h3>
                <p className="text-xs text-slate-500">
                  Sign in with an authorized marine bunkering account.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="e.g. admin, management, staff, jgc..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-sky-800 hover:bg-sky-900 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-right-to-bracket" />
                <span>Authenticate &amp; Switch</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. QUICK EDIT INITIAL OPENING ROB MODAL */}
      {isQuickRobModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Adjust Initial Opening ROB
              </h3>
              <button
                type="button"
                onClick={() => setQuickRobModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                store.updateStorageConfig({
                  initialOpeningRob: Math.max(0, Number(quickRobVal) || 0),
                });
                setQuickRobModalOpen(false);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Initial Opening Stock (Liters)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={quickRobVal}
                  onChange={(e) => setQuickRobVal(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickRobModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-700 hover:bg-sky-800"
                >
                  Save ROB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. DAILY BUNKER DISPATCH ENTRY/EDIT MODAL */}
      {dispatchModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {dispatchModal.editItem
                  ? 'Edit Bunker Dispatch Log'
                  : 'New Bunker Dispatch Log'}
              </h3>
              <button
                type="button"
                onClick={() =>
                  setDispatchModal({ isOpen: false, editItem: null })
                }
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!dispClient) {
                  store.showToast('Please select a valid client.', 'error');
                  return;
                }
                store.saveBunkering({
                  id: dispatchModal.editItem?.id,
                  date: dispDate,
                  contractor: dispClient,
                  vesselName: dispVessel.trim(),
                  volume: Number(dispVolume) || 0,
                  startTime: dispStart,
                  endTime: dispEnd,
                });
                setDispatchModal({ isOpen: false, editItem: null });
              }}
              className="p-5 space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dispatch Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dispDate}
                    onChange={(e) => setDispDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Client
                    </label>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setClientModalOpen(true)}
                        className="text-[10px] font-bold text-sky-700 hover:underline"
                      >
                        + Manage Clients
                      </button>
                    )}
                  </div>

                  {state.clients.length === 0 ? (
                    <div className="p-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 text-[11px] text-amber-800 space-y-1">
                      <div>
                        No clients available. Click &apos;Add Client&apos; to
                        create one.
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setClientModalOpen(true)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-sky-700 text-white text-[10px] font-bold"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Client</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <select
                      required
                      value={dispClient}
                      onChange={(e) => setDispClient(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold text-slate-800"
                    >
                      {state.clients.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Receiving Vessel Name
                </label>
                <input
                  type="text"
                  required
                  value={dispVessel}
                  onChange={(e) => setDispVessel(e.target.value)}
                  placeholder="e.g. TB HIGHLIGHT / CB PACIFIC"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dispatched Volume (Liters)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={dispVolume}
                  onChange={(e) => setDispVolume(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Pumping Time
                  </label>
                  <input
                    type="time"
                    required
                    value={dispStart}
                    onChange={(e) => setDispStart(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Complete Time
                  </label>
                  <input
                    type="time"
                    required
                    value={dispEnd}
                    onChange={(e) => setDispEnd(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-sky-900">
                  Calculated Flow Rate:
                </span>
                <span className="font-mono font-bold text-sky-800">
                  {formatNumber(previewFlowRate)} L/Hr
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setDispatchModal({ isOpen: false, editItem: null })
                  }
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={state.clients.length === 0}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50"
                >
                  Save Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. BULK IMPORT EXCEL MODAL */}
      {isBulkImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Import Daily Bunker Dispatches (.xlsx)
              </h3>
              <button
                type="button"
                onClick={() => {
                  setBulkImportModalOpen(false);
                  setPendingImportRows([]);
                  setImportFileName('');
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <label className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-sky-500 cursor-pointer block transition">
                <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-700">
                  Click to choose Excel (.xlsx) file
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Columns: Date, Client, Vessel, Volume, Start Time, End Time
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
              </label>

              {importFileName && (
                <div className="text-xs bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <span className="truncate font-semibold">
                    {importFileName}
                  </span>
                  <span className="font-mono font-bold">
                    {pendingImportRows.length} valid rows
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkImportModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pendingImportRows.length === 0}
                  onClick={() => {
                    store.bulkImportBunkerings(pendingImportRows);
                    setBulkImportModalOpen(false);
                    setPendingImportRows([]);
                    setImportFileName('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50"
                >
                  Import Rows
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. PHYSICAL SOUNDING RECORD MODAL */}
      {soundingModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {soundingModal.editItem
                  ? 'Edit Physical Tank Sounding'
                  : 'Record Physical Tank Sounding'}
              </h3>
              <button
                type="button"
                onClick={() =>
                  setSoundingModal({ isOpen: false, editItem: null })
                }
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                store.saveSounding({
                  id: soundingModal.editItem?.id,
                  date: sndDate,
                  time: sndTime,
                  liters: Number(sndLiters) || 0,
                  draftFwd: sndFwd ? Number(sndFwd) : null,
                  draftAft: sndAft ? Number(sndAft) : null,
                  remarks: sndRemarks.trim(),
                  docName: sndDocName,
                  docDataUrl: sndDocDataUrl,
                });
                setSoundingModal({ isOpen: false, editItem: null });
              }}
              className="p-5 space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sounding Date
                  </label>
                  <input
                    type="date"
                    required
                    value={sndDate}
                    onChange={(e) => setSndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sounding Time (WIT)
                  </label>
                  <input
                    type="time"
                    required
                    value={sndTime}
                    onChange={(e) => setSndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Physical Sounding Volume (Liters)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={sndLiters}
                  onChange={(e) => setSndLiters(e.target.value)}
                  placeholder="Enter total physical sounding in Liters"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Forward Draft (m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={sndFwd}
                    onChange={(e) => setSndFwd(e.target.value)}
                    placeholder="e.g. 4.25"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Aft Draft (m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={sndAft}
                    onChange={(e) => setSndAft(e.target.value)}
                    placeholder="e.g. 4.80"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Attach Chief Officer Sounding Sheet (Optional)
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setSndDocName(f.name);
                    const reader = new FileReader();
                    reader.onload = (ev) =>
                      setSndDocDataUrl(String(ev.target?.result || ''));
                    reader.readAsDataURL(f);
                  }}
                  className="w-full text-xs text-slate-500"
                />
                {sndDocName && (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded">
                    <span className="truncate">{sndDocName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSndDocName(null);
                        setSndDocDataUrl(null);
                      }}
                      className="text-rose-600 font-bold"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Operational Remarks
                </label>
                <textarea
                  rows={2}
                  value={sndRemarks}
                  onChange={(e) => setSndRemarks(e.target.value)}
                  placeholder="e.g. Calm sea state, water cut 0 cm..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setSoundingModal({ isOpen: false, editItem: null })
                  }
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-700 hover:bg-sky-800"
                >
                  Save Sounding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. INBOUND CARGO TOP-UP PLAN MODAL */}
      {topupModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {topupModal.editItem
                  ? 'Edit Inbound Cargo Voyage'
                  : 'Add Inbound Cargo Voyage'}
              </h3>
              <button
                type="button"
                onClick={() => setTopupModal({ isOpen: false, editItem: null })}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                store.saveTopup({
                  id: topupModal.editItem?.id,
                  vessel: topVessel.trim(),
                  volume: Number(topVolume) || 0,
                  loadPort: topLoadPort.trim(),
                  dischPort: topDischPort.trim(),
                  etd: topEtd,
                  eta: topEta,
                  atd: topAtd || undefined,
                  ata: topAta || undefined,
                  status: topStatus,
                });
                setTopupModal({ isOpen: false, editItem: null });
              }}
              className="p-5 space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Performing Vessel
                  </label>
                  <input
                    type="text"
                    required
                    value={topVessel}
                    onChange={(e) => setTopVessel(e.target.value)}
                    placeholder="e.g. MT PACIFIC VOYAGER"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cargo Volume (Liters)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={topVolume}
                    onChange={(e) => setTopVolume(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Loading Port
                  </label>
                  <input
                    type="text"
                    required
                    value={topLoadPort}
                    onChange={(e) => setTopLoadPort(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Discharge Port
                  </label>
                  <input
                    type="text"
                    required
                    value={topDischPort}
                    onChange={(e) => setTopDischPort(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Planned ETD
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={topEtd}
                    onChange={(e) => setTopEtd(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Planned ETA
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={topEta}
                    onChange={(e) => setTopEta(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Actual ATD (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={topAtd}
                    onChange={(e) => setTopAtd(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Actual ATA (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={topAta}
                    onChange={(e) => setTopAta(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Voyage Status
                </label>
                <select
                  value={topStatus}
                  onChange={(e) => setTopStatus(e.target.value as TopupStatus)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold"
                >
                  <option value="Planned">Planned</option>
                  <option value="Loading">Loading</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Discharging">Discharging</option>
                  <option value="Completed">
                    Completed (Adds to Live Book ROB)
                  </option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setTopupModal({ isOpen: false, editItem: null })
                  }
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-700 hover:bg-sky-800"
                >
                  Save Voyage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DOCUMENT PREVIEW MODAL */}
      {docPreviewModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {docPreviewModal.title}
              </h3>
              <button
                type="button"
                onClick={() =>
                  setDocPreviewModal({ isOpen: false, title: '', dataUrl: '' })
                }
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto flex items-center justify-center bg-slate-100">
              {docPreviewModal.dataUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={docPreviewModal.dataUrl}
                  className="w-full h-[65vh] rounded border"
                />
              ) : (
                <img
                  src={docPreviewModal.dataUrl}
                  alt={docPreviewModal.title}
                  className="max-h-[65vh] object-contain rounded shadow"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. FORECAST DISTRIBUTION MODAL (FLOATING STORAGE) */}
      {forecastDispatchModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {forecastDispatchModal.editItem
                  ? `Edit Distribution Plan (${state.storageConfig.vesselName})`
                  : `Add Distribution Plan (${state.storageConfig.vesselName})`}
              </h3>
              <button
                type="button"
                onClick={() =>
                  setForecastDispatchModal({ isOpen: false, editItem: null })
                }
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!fcDispClient) {
                  store.showToast('Please select a client.', 'error');
                  return;
                }
                store.saveForecastDispatch({
                  id: forecastDispatchModal.editItem?.id,
                  date: fcDispDate,
                  client: fcDispClient,
                  vessel: fcDispVessel.trim(),
                  volume: Number(fcDispVolume) || 0,
                });
                setForecastDispatchModal({ isOpen: false, editItem: null });
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Planned Date
                </label>
                <input
                  type="date"
                  required
                  value={fcDispDate}
                  onChange={(e) => setFcDispDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Client / Contractor
                  </label>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setClientModalOpen(true)}
                      className="text-[10px] font-bold text-sky-700 hover:underline flex items-center gap-1"
                    >
                      <Users className="w-3 h-3" />
                      <span>Manage Clients</span>
                    </button>
                  )}
                </div>

                {state.clients.length === 0 ? (
                  <div className="p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 text-xs text-amber-900 space-y-2">
                    <div>
                      No clients available. Click &apos;Add Client&apos; to
                      create one.
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setClientModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Client</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <select
                    required
                    value={fcDispClient}
                    onChange={(e) => setFcDispClient(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold text-slate-900"
                  >
                    {state.clients.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Receiving Vessel / Unit Name
                </label>
                <input
                  type="text"
                  required
                  value={fcDispVessel}
                  onChange={(e) => setFcDispVessel(e.target.value)}
                  placeholder="e.g. TB HIGHLIGHT / CB PACIFIC"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Planned Distribution Volume (Liters)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={fcDispVolume}
                  onChange={(e) => setFcDispVolume(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setForecastDispatchModal({ isOpen: false, editItem: null })
                  }
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={state.clients.length === 0}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                >
                  Save Distribution Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. FORECAST TOP-UP MODAL (DUAL STORAGE) */}
      {forecastTopupModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {forecastTopupModal.editItem
                  ? 'Edit Top-Up Plan (Dual Storage)'
                  : 'Add Top-Up Plan (Dual Storage)'}
              </h3>
              <button
                type="button"
                onClick={() =>
                  setForecastTopupModal({ isOpen: false, editItem: null })
                }
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fVol =
                  fcTopTarget === 'floating' || fcTopTarget === 'both'
                    ? Number(fcTopFloatingVol) || 0
                    : 0;
                const sVol =
                  fcTopTarget === 'shore' || fcTopTarget === 'both'
                    ? Number(fcTopShoreVol) || 0
                    : 0;
                store.saveForecastTopup({
                  id: forecastTopupModal.editItem?.id,
                  date: fcTopDate,
                  vessel: fcTopVessel.trim(),
                  floatingVolume: fVol,
                  shoreVolume: sVol,
                });
                setForecastTopupModal({ isOpen: false, editItem: null });
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Planned Top-Up Date
                </label>
                <input
                  type="date"
                  required
                  value={fcTopDate}
                  onChange={(e) => setFcTopDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supply Tanker / Carrier Name
                </label>
                <input
                  type="text"
                  required
                  value={fcTopVessel}
                  onChange={(e) => setFcTopVessel(e.target.value)}
                  placeholder="e.g. MT PACIFIC VOYAGER"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Storage Facility
                </label>
                <select
                  value={fcTopTarget}
                  onChange={(e) =>
                    setFcTopTarget(
                      e.target.value as 'floating' | 'shore' | 'both'
                    )
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold"
                >
                  <option value="floating">
                    Floating Storage Only ({state.storageConfig.vesselName})
                  </option>
                  <option value="shore">
                    Onshore Tank Only ({state.storageConfig.shoreTankName})
                  </option>
                  <option value="both">
                    Split / Dual Allocation (Floating + Shore Tank)
                  </option>
                </select>
              </div>

              {(fcTopTarget === 'floating' || fcTopTarget === 'both') && (
                <div>
                  <label className="block text-xs font-bold text-teal-800 mb-1">
                    {state.storageConfig.vesselName} Top-Up Volume (Liters)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={fcTopFloatingVol}
                    onChange={(e) => setFcTopFloatingVol(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300"
                  />
                </div>
              )}

              {(fcTopTarget === 'shore' || fcTopTarget === 'both') && (
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">
                    {state.storageConfig.shoreTankName} Top-Up Volume (Liters)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={fcTopShoreVol}
                    onChange={(e) => setFcTopShoreVol(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setForecastTopupModal({ isOpen: false, editItem: null })
                  }
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800"
                >
                  Save Top-Up Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. FLOATING STORAGE INTERACTIVE ACTION CHOOSER MODAL */}
      {floatingChooserModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Select Forecast Action
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Date:{' '}
                  <span className="font-bold text-sky-700">
                    {floatingChooserModal.date}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFloatingChooserModal({ isOpen: false, date: '' })
                }
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600">
                Choose the forecast operation to record for{' '}
                <span className="font-bold text-slate-900">
                  {state.storageConfig.vesselName}
                </span>
                :
              </p>

              <button
                type="button"
                onClick={() => {
                  const dt = floatingChooserModal.date;
                  const cli =
                    floatingChooserModal.preselectedClient ||
                    state.clients[0]?.name ||
                    '';
                  setFloatingChooserModal({ isOpen: false, date: '' });
                  setForecastDispatchModal({
                    isOpen: true,
                    editItem: null,
                    defaultDate: dt,
                    defaultClient: cli,
                  });
                }}
                className="w-full p-3.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-left transition flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <Fuel className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-950">
                    Add Client Distribution
                  </div>
                  <div className="text-[11px] text-amber-800">
                    Schedule fuel dispatch to a client vessel
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const dt = floatingChooserModal.date;
                  setFloatingChooserModal({ isOpen: false, date: '' });
                  setForecastTopupModal({
                    isOpen: true,
                    editItem: null,
                    defaultDate: dt,
                    defaultTarget: 'floating',
                  });
                }}
                className="w-full p-3.5 rounded-xl border border-teal-300 bg-teal-50 hover:bg-teal-100 text-left transition flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
                  <Ship className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-teal-950">
                    Add Inbound Top-Up
                  </div>
                  <div className="text-[11px] text-teal-800">
                    Schedule cargo replenishment for storage
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. RECORD MANAGE MODAL (EDIT / DELETE / ADD ANOTHER) */}
      {recordManageModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Manage Scheduled Record
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Date: {recordManageModal.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setRecordManageModal({
                    isOpen: false,
                    type: 'dispatch',
                    id: '',
                    date: '',
                  })
                }
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {recordManageModal.type === 'dispatch' ? (
                (() => {
                  const item = state.forecastDispatches.find(
                    (d) => d.id === recordManageModal.id
                  );
                  if (!item) return null;
                  return (
                    <>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div>
                          <span className="text-slate-500">Client:</span>{' '}
                          <span className="font-bold text-slate-900">
                            {item.client}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Vessel:</span>{' '}
                          <span className="font-bold text-slate-900">
                            {item.vessel}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Volume:</span>{' '}
                          <span className="font-mono font-bold text-amber-700">
                            {formatNumber(item.volume)} L
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRecordManageModal({
                              isOpen: false,
                              type: 'dispatch',
                              id: '',
                              date: '',
                            });
                            setForecastDispatchModal({
                              isOpen: true,
                              editItem: item,
                            });
                          }}
                          className="py-2.5 px-3 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              const idToDelete = item.id;
                              setRecordManageModal({
                                isOpen: false,
                                type: 'dispatch',
                                id: '',
                                date: '',
                              });
                              store.openConfirm(
                                'Delete Scheduled Distribution',
                                `Remove ${item.vessel} (${formatNumber(
                                  item.volume
                                )} L) on ${item.date}?`,
                                () => store.deleteForecastDispatch(idToDelete),
                                'Delete'
                              );
                            }}
                            className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const dt = recordManageModal.date;
                          const cli =
                            recordManageModal.clientHint || item.client;
                          setRecordManageModal({
                            isOpen: false,
                            type: 'dispatch',
                            id: '',
                            date: '',
                          });
                          setForecastDispatchModal({
                            isOpen: true,
                            editItem: null,
                            defaultDate: dt,
                            defaultClient: cli,
                          });
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                      >
                        + Add Another Distribution on {recordManageModal.date}
                      </button>
                    </>
                  );
                })()
              ) : (
                (() => {
                  const item = state.forecastTopups.find(
                    (t) => t.id === recordManageModal.id
                  );
                  if (!item) return null;
                  return (
                    <>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div>
                          <span className="text-slate-500">Vessel:</span>{' '}
                          <span className="font-bold text-slate-900">
                            {item.vessel}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Floating Vol:</span>{' '}
                          <span className="font-mono font-bold text-teal-700">
                            +{formatNumber(item.floatingVolume)} L
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Shore Vol:</span>{' '}
                          <span className="font-mono font-bold text-emerald-700">
                            +{formatNumber(item.shoreVolume)} L
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRecordManageModal({
                              isOpen: false,
                              type: 'topup',
                              id: '',
                              date: '',
                            });
                            setForecastTopupModal({
                              isOpen: true,
                              editItem: item,
                            });
                          }}
                          className="py-2.5 px-3 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              const idToDelete = item.id;
                              setRecordManageModal({
                                isOpen: false,
                                type: 'topup',
                                id: '',
                                date: '',
                              });
                              store.openConfirm(
                                'Delete Scheduled Top-Up',
                                `Remove scheduled top-up for ${item.vessel} on ${item.date}?`,
                                () => store.deleteForecastTopup(idToDelete),
                                'Delete'
                              );
                            }}
                            className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const dt = recordManageModal.date;
                          setRecordManageModal({
                            isOpen: false,
                            type: 'topup',
                            id: '',
                            date: '',
                          });
                          setForecastTopupModal({
                            isOpen: true,
                            editItem: null,
                            defaultDate: dt,
                            defaultTarget: 'floating',
                          });
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                      >
                        + Add Another Top-Up on {recordManageModal.date}
                      </button>
                    </>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* 12. CUSTOM CONFIRMATION MODAL */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeConfirm}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDialog.onConfirm) {
                    confirmDialog.onConfirm();
                  }
                  closeConfirm();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
              >
                {confirmDialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. TOAST NOTIFICATIONS CONTAINER */}
      <div className="fixed bottom-5 right-5 z-[70] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const bg =
            t.type === 'success'
              ? 'bg-emerald-800 text-white border-emerald-700'
              : t.type === 'error'
              ? 'bg-rose-800 text-white border-rose-700'
              : t.type === 'warning'
              ? 'bg-amber-700 text-white border-amber-600'
              : 'bg-slate-900 text-white border-slate-700';

          return (
            <div
              key={t.id}
              onClick={() => removeToast(t.id)}
              className={`pointer-events-auto px-4 py-3 rounded-xl border shadow-xl text-xs font-semibold flex items-center gap-2.5 cursor-pointer transition ${bg}`}
            >
              {t.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              ) : t.type === 'error' || t.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-sky-300 shrink-0" />
              )}
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

