'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { calculateSummary, formatNumber, ViewId } from '@backend/index';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: {
  id: ViewId;
  label: string;
  iconClass: string;
  inactiveIconColor: string;
}[] = [
  {
    id: 'dashboardView',
    label: 'Monitoring Dashboard',
    iconClass: 'fa-solid fa-chart-pie',
    inactiveIconColor: 'text-sky-600',
  },
  {
    id: 'forecastView',
    label: 'Fuel Supply Forecast',
    iconClass: 'fa-solid fa-calendar-days',
    inactiveIconColor: 'text-teal-600',
  },
  {
    id: 'dispatchView',
    label: 'Daily Bunker Dispatch',
    iconClass: 'fa-solid fa-gas-pump',
    inactiveIconColor: 'text-amber-500',
  },
  {
    id: 'soundingView',
    label: 'Closing ROB & Sounding',
    iconClass: 'fa-solid fa-ruler-vertical',
    inactiveIconColor: 'text-emerald-600',
  },
  {
    id: 'topupView',
    label: 'Cargo Top-Up Plan',
    iconClass: 'fa-solid fa-dolly',
    inactiveIconColor: 'text-indigo-500',
  },
  {
    id: 'settingsView',
    label: 'Storage & System Config',
    iconClass: 'fa-solid fa-gear',
    inactiveIconColor: 'text-slate-500',
  },
];

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const {
    state,
    currentUser,
    activeView,
    setActiveView,
    setClientModalOpen,
    openConfirm,
    logout,
  } = useAppStore();

  const summary = calculateSummary(state);
  const allowedViews = currentUser?.allowedViews || [];
  const canManageClients = Boolean(
    currentUser?.canManageClients || currentUser?.roleCode === 'admin'
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-300 ease-in-out fixed inset-y-0 left-0 z-40 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        } lg:shadow-none`}
      >
        {/* Top Section */}
        <div className="p-4 overflow-y-auto">
          {/* Corporate Logo Section */}
          <div className="pb-4 mb-4 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <img
                src="/logos/samudera-logo.png"
                alt="Samudera Indonesia"
                className="h-9 max-w-[150px] object-contain"
              />
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">
              Fuel Logistics Fleet Management
            </div>
          </div>

          {/* Storage Vessel Mini Summary */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <i className="fa-solid fa-ship text-sky-600" />
                <span>{state.storageConfig.vesselName}</span>
              </span>
              {currentUser?.canManageStorage && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('settingsView');
                    onCloseMobile();
                  }}
                  className="text-xs text-sky-600 hover:text-sky-800 p-0.5 rounded"
                  title="Storage Configuration"
                >
                  <i className="fa-solid fa-sliders" />
                </button>
              )}
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Capacity:</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatNumber(state.storageConfig.totalCapacity)} L
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Deadstock:</span>
                <span className="font-mono text-slate-700">
                  {formatNumber(state.storageConfig.deadstock)} L
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            {NAV_ITEMS.filter((item) => allowedViews.includes(item.id)).map(
              (item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveView(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'text-white bg-sky-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <i
                      className={`${item.iconClass} w-5 text-center ${
                        isActive ? 'text-white' : item.inactiveIconColor
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              }
            )}
          </nav>

          {/* Dynamic Clients / Exclusive Contractors Summary Badges (Unlimited) */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Exclusive Contractors ({state.clients.length})
              </p>
              {canManageClients && (
                <button
                  type="button"
                  onClick={() => setClientModalOpen(true)}
                  className="text-[10px] font-bold text-sky-700 hover:text-sky-900 underline"
                >
                  + Add / Manage
                </button>
              )}
            </div>

            {state.clients.length === 0 ? (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1.5">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  No clients available. Click &apos;Add Client&apos; to create
                  one.
                </p>
                {canManageClients && (
                  <button
                    type="button"
                    onClick={() => setClientModalOpen(true)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-[11px] font-bold transition shadow-xs"
                  >
                    + Add Client
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col space-y-1.5 text-xs font-semibold max-h-56 overflow-y-auto pr-0.5">
                {state.clients.map((client) => {
                  const totalVol = summary.clientTotals[client.name] || 0;
                  return (
                    <div
                      key={client.id}
                      className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between ${client.badgeClass}`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: client.color }}
                        />
                        <span className="truncate">{client.name}</span>
                      </span>
                      <span className="font-mono font-bold shrink-0">
                        {formatNumber(totalVol)} L
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom: User & Sign Out */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <div className="text-xs font-bold text-slate-800">
                {currentUser?.displayName || 'Administrator'}
              </div>
              <div className="text-[10px] text-slate-500">
                {currentUser?.roleLabel || 'Full Administrator'}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                openConfirm(
                  'Sign Out Session',
                  'Are you sure you want to sign out and return to the login screen?',
                  () => logout(),
                  'Sign Out'
                )
              }
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition"
              title="Sign Out"
            >
              <i className="fa-solid fa-arrow-right-from-bracket" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
