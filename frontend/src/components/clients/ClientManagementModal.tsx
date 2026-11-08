'use client';

import React, { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { CLIENT_COLOR_PRESETS, ClientRecord, calculateSummary, formatNumber } from '@backend/index';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ShieldAlert,
  Building2,
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

  // In-place editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');

  const addInputRef = useRef<HTMLInputElement>(null);

  if (!isClientModalOpen) return null;

  const isAdmin = Boolean(currentUser?.canManageClients);
  const summary = calculateSummary(state);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    const created = addClient(newClientName, selectedColor);
    if (created) {
      setNewClientName('');
      const nextIdx = (state.clients.length + 1) % CLIENT_COLOR_PRESETS.length;
      setSelectedColor(CLIENT_COLOR_PRESETS[nextIdx].color);
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
                Manage Clients (Master Data)
              </h3>
              <p className="text-[11px] text-slate-500">
                Single source of truth synchronized across Forecast Matrix, Dispatches & Dashboards
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
          {!isAdmin ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-xs text-amber-800">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                Only Administrators have permission to add, rename, or delete clients.
              </span>
            </div>
          ) : (
            /* Add Client Form */
            <form
              onSubmit={handleAddSubmit}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
            >
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Add New Client
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  ref={addInputRef}
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Enter client / contractor name (e.g. CLIENT ALPHA)"
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

              {/* Color Swatch Selector */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-500">
                  Badge Color:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CLIENT_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => setSelectedColor(preset.color)}
                      className={`w-5 h-5 rounded-full transition flex items-center justify-center ${
                        preset.dotClass
                      } ${
                        selectedColor === preset.color
                          ? 'ring-2 ring-offset-2 ring-slate-800 scale-110'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      title={preset.label}
                    />
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* Client List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Registered Clients ({state.clients.length})
              </h4>
              {state.clients.length > 0 && (
                <span className="text-[11px] text-slate-400">
                  Click edit to rename in-place
                </span>
              )}
            </div>

            {state.clients.length === 0 ? (
              <div className="p-8 rounded-xl border-2 border-dashed border-slate-200 text-center space-y-2.5 bg-slate-50/50">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-slate-600">
                  No clients available. Click &apos;Add Client&apos; to create one.
                </div>
                {isAdmin && (
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
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden">
                {state.clients.map((client) => {
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
                          <div className="flex items-center gap-1">
                            {CLIENT_COLOR_PRESETS.map((p) => (
                              <button
                                key={p.color}
                                type="button"
                                onClick={() => setEditingColor(p.color)}
                                className={`w-4 h-4 rounded-full ${
                                  p.dotClass
                                } ${
                                  editingColor === p.color
                                    ? 'ring-2 ring-offset-1 ring-slate-800'
                                    : 'opacity-60'
                                }`}
                                title={p.label}
                              />
                            ))}
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
                              className={`w-3 h-3 rounded-full shrink-0 ${client.dotClass}`}
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

                          {isAdmin && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEditing(client)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-sky-700 hover:bg-sky-50 border border-transparent hover:border-sky-200 transition"
                                title={`Rename ${client.name}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(client)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                                title={`Delete ${client.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
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

