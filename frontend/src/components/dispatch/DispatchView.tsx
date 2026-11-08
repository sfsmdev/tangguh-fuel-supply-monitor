'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { formatNumber } from '@backend/index';
import {
  Fuel,
  Search,
  Upload,
  Plus,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';

export function DispatchView() {
  const {
    state,
    currentUser,
    setDispatchModal,
    setBulkImportModalOpen,
    setClientModalOpen,
    deleteBunkering,
    openConfirm,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('ALL');

  const canEdit = Boolean(currentUser?.canEdit);
  const canDelete = Boolean(currentUser?.canDelete);
  const isAdmin = Boolean(currentUser?.canManageClients);

  const filteredDispatches = [...state.bunkerings]
    .filter((b) => {
      const matchesVessel = (b.vesselName || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesClient =
        clientFilter === 'ALL' ||
        (b.contractor || '').toLowerCase() === clientFilter.toLowerCase();
      return matchesVessel && matchesClient;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getClientBadge = (clientName: string) => {
    const found = state.clients.find(
      (c) => c.name.toLowerCase() === (clientName || '').toLowerCase()
    );
    return found
      ? found.badgeClass
      : 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Daily Bunker Dispatch Log
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Vessel fuel distributions, transfer durations, and automated pumping flow rates
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setClientModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Clients</span>
            </button>
          )}

          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => setBulkImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Bulk Import (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setDispatchModal({ isOpen: true, editItem: null })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Bunker Dispatch</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vessel name..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Clients ({state.clients.length})</option>
            {state.clients.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Total Logs:{' '}
          <span className="font-bold text-slate-800">
            {filteredDispatches.length}
          </span>
        </div>
      </div>

      {/* Dispatch Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Client</th>
                <th className="p-3.5">Receiving Vessel</th>
                <th className="p-3.5 text-right">Dispatched Volume</th>
                <th className="p-3.5 text-center">Transfer Window</th>
                <th className="p-3.5 text-right">Flow Rate</th>
                {canEdit && <th className="p-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDispatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    <Fuel className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="text-xs font-semibold text-slate-500">
                      No bunker dispatch records found.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDispatches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-mono text-slate-800">{b.date}</td>
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${getClientBadge(
                          b.contractor
                        )}`}
                      >
                        {b.contractor}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">
                      {b.vesselName}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-amber-700">
                      {formatNumber(b.volume)} L
                    </td>
                    <td className="p-3.5 text-center font-mono text-slate-600">
                      {b.startTime} – {b.endTime}
                    </td>
                    <td className="p-3.5 text-right font-mono font-semibold text-sky-700">
                      {formatNumber(b.flowRate)} L/Hr
                    </td>
                    {canEdit && (
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setDispatchModal({ isOpen: true, editItem: b })
                            }
                            className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50"
                            title="Edit Dispatch"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                openConfirm(
                                  'Delete Bunker Dispatch',
                                  `Are you sure you want to delete dispatch record for ${b.vesselName} (${formatNumber(
                                    b.volume
                                  )} L)?`,
                                  () => deleteBunkering(b.id),
                                  'Delete'
                                )
                              }
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                              title="Delete Dispatch"
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

