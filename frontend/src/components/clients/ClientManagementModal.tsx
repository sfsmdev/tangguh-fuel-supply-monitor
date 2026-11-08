'use client';

import React, { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  CLIENT_COLOR_PRESETS,
  ClientRecord,
  calculateSummary,
  formatNumber,
  resolveClientColorStyle,
} from '@backend/index';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ShieldAlert,
  Building2,
  Search,
} from 'lucide-react';

export function ClientManagementModal() {
  const {
    state,
    currentUser,
    isClientModalOpen,
    setClientModalOpen,
    addClient,
    updateClient,
    deleteClient,
    openConfirm,
  } = useAppStore();

  const [newClientName, setNewClientName] = useState('');
  const [selectedColor, setSelectedColor] = useState(
    CLIENT_COLOR_PRESETS[0].color
  );
  const [searchFilter, setSearchFilter] = useState('');

  // In-place editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');

  const addInputRef = useRef<HTMLInputElement>(null);

  if (!isClientModalOpen) return null;

  const canManage = Boolean(
    currentUser?.canManageClients ||
      currentUser?.canEdit ||
      currentUser?.canEditForecast ||
      currentUser?.canEditOperations
  );
  const canRemove = Boolean(
    currentUser?.canManageClients ||
      currentUser?.canDelete ||
      currentUser?.canDeleteForecast ||
      currentUser?.canDeleteOperations
  );
  const summary = calculateSummary(state);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    const created = addClient(newClientName, selectedColor);
    if (created) {
      setNewClientName('');
      const nextStyle = resolveClientColorStyle(state.clients.length + 1);
      setSelectedColor(nextStyle.color);
    }
  };

  const startEditing = (client: ClientRecord) => {
    setEditingId(client.id);
    setEditingName(client.name);
    setEditingColor(client.color);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
    setEditingColor('');
  };

  const saveEditing = (clientId: string) => {
    if (!editingName.trim()) return;
    const updated = updateClient(clientId, editingName, editingColor);
    if (updated) {
      cancelEditing();
    }
  };

  const handleDeleteClick = (client: ClientRecord) => {
    openConfirm(
      'Delete Client',
      `Are you sure you want to delete client "${client.name}"? This will remove the client from the master list and active forecast matrix rows.`,
      () => {
        deleteClient(client.id);
        if (editingId === client.id) {
          cancelEditing();
        }
      },
      'Delete Client'
    );
  };

  const filteredClients = state.clients.filter((c) =>
    c.name.toLowerCase().includes(searchFilter.trim().toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-700 text-white flex items-center justify-center shadow-sm">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Manage Clients (Unlimited Master List)
              </h3>
              <p className="text-[11px] text-slate-500">
                Add unlimited contractors/clients synchronized across Forecast Matrix, Dispatches &amp; Dashboards
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setClientModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {!canManage ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-xs text-amber-800">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                Only Administrators and Operational Staff have permission to add or rename clients.
              </span>
            </div>
          ) : (
            /* Add Client Form (Single or Batch Unlimited) */
            <form
              onSubmit={handleAddSubmit}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Add New Client(s) — Unlimited
                </label>
                <span className="text-[10px] font-medium text-slate-500">
                  Tip: Separate with commas to add multiple at once
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  ref={addInputRef}
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. JGC, SAIPEM, PETROSEA, ENI, MEDCO, INPEX..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-900"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-sm transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Client</span>
                </button>
              </div>

              {/* Color Swatch Selector + Custom Hex Color Picker */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500">
                  Badge Color:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CLIENT_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => setSelectedColor(preset.color)}
                      style={{ backgroundColor: preset.color }}
                      className={`w-5 h-5 rounded-full transition flex items-center justify-center ${
                        selectedColor.toUpperCase() ===
                        preset.color.toUpperCase()
                          ? 'ring-2 ring-offset-2 ring-slate-800 scale-110'
                          : 'opacity-75 hover:opacity-100'
                      }`}
                      title={preset.label}
                    />
                  ))}
                  <label
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-slate-300 bg-white text-[10px] font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                    title="Pick any custom color"
                  >
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="w-3.5 h-3.5 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <span>Custom</span>
                  </label>
                </div>
              </div>
            </form>
          )}

          {/* Client List */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Registered Clients ({state.clients.length} — Unlimited Capacity)
              </h4>
              {state.clients.length > 4 && (
                <div className="relative w-full sm:w-52">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filter clients..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}
            </div>

            {state.clients.length === 0 ? (
              <div className="p-8 rounded-xl border-2 border-dashed border-slate-200 text-center space-y-2.5 bg-slate-50/50">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-slate-600">
                  No clients available. Click &apos;Add Client&apos; to create as many clients as needed.
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => addInputRef.current?.focus()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Client</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden max-h-72 overflow-y-auto">
                {filteredClients.map((client) => {
                  const isEditingThis = editingId === client.id;
                  const totalDispatched =
                    summary.clientTotals[client.name] || 0;

                  return (
                    <div
                      key={client.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                    >
                      {isEditingThis ? (
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveEditing(client.id);
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            autoFocus
                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-sky-400 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                          <div className="flex items-center gap-1 flex-wrap">
                            {CLIENT_COLOR_PRESETS.slice(0, 8).map((p) => (
                              <button
                                key={p.color}
                                type="button"
                                onClick={() => setEditingColor(p.color)}
                                style={{ backgroundColor: p.color }}
                                className={`w-4 h-4 rounded-full ${
                                  editingColor.toUpperCase() ===
                                  p.color.toUpperCase()
                                    ? 'ring-2 ring-offset-1 ring-slate-800'
                                    : 'opacity-60'
                                }`}
                                title={p.label}
                              />
                            ))}
                            <input
                              type="color"
                              value={editingColor || '#0284C7'}
                              onChange={(e) => setEditingColor(e.target.value)}
                              className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                              title="Custom color"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => saveEditing(client.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                              title="Save changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: client.color }}
                            />
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {client.name}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${client.badgeClass}`}
                            >
                              {formatNumber(totalDispatched)} L dispatched
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => startEditing(client)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-sky-700 hover:bg-sky-50 border border-transparent hover:border-sky-200 transition"
                                title={`Rename ${client.name}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            )}
                            {canRemove && (
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(client)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                                title={`Delete ${client.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setClientModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

