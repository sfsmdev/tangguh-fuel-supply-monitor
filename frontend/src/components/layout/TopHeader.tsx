'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  formatDateWIT,
  formatTimeWIT,
  getNowWIT,
} from '@backend/index';

interface TopHeaderProps {
  onToggleMobileMenu: () => void;
}

export function TopHeader({ onToggleMobileMenu }: TopHeaderProps) {
  const {
    currentUser,
    setClientModalOpen,
    setSwitchUserModalOpen,
  } = useAppStore();

  const [timeStr, setTimeStr] = useState('--:--:-- WIT');
  const [dateStr, setDateStr] = useState('-- --- ----');

  useEffect(() => {
    const tick = () => {
      const d = getNowWIT();
      setTimeStr(formatTimeWIT(d));
      setDateStr(formatDateWIT(d));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Left: Mobile Menu Toggle & App Brand */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="text-slate-600 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition lg:hidden"
            aria-label="Toggle Sidebar"
          >
            <i className="fa-solid fa-bars text-lg" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="h-10 px-2 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs overflow-hidden">
              <img
                src="/logos/bp-tangguh-logo.png"
                alt="BP Tangguh"
                className="h-7 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
                  Tangguh Fuel Supply Monitoring
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  Biofuel B50
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Marine Offshore &amp; Industrial Fuel Supply • Papua Barat
              </p>
            </div>
          </div>
        </div>

        {/* Right: Real-time WIT Clock & User Account Management */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Live WIT (UTC+9) Clock */}
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center space-x-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <div className="text-left font-mono">
              <div className="text-xs font-bold text-slate-900 tracking-tight">
                {timeStr}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">
                {dateStr}
              </div>
            </div>
            <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded uppercase">
              WIT (UTC+9)
            </span>
          </div>

          {/* Real-Time Cloud Sync Pulse Indicator */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold"
            title="Real-time multi-device database synchronized"
          >
            <i
              className="fa-solid fa-arrows-rotate fa-spin text-emerald-600 text-[10px]"
              style={{ animationDuration: '3s' }}
            />
            <span>Live Sync</span>
          </div>

          {/* Manage Clients Button (Admin & Operational Staff) */}
          {(currentUser?.canManageClients || currentUser?.canEdit) && (
            <button
              type="button"
              onClick={() => setClientModalOpen(true)}
              className="bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-1.5 transition shadow-xs"
              title="Manage Unlimited Client Master List"
            >
              <i className="fa-solid fa-users-gear" />
              <span className="hidden md:inline">Manage Clients</span>
            </button>
          )}

          {/* Current User Role Badge & Switch User Button */}
          <div className="flex items-center space-x-2">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900">
                {currentUser?.displayName || 'Administrator'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {currentUser?.roleLabel || 'Full Administrator'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSwitchUserModalOpen(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold px-2.5 py-2 rounded-xl flex items-center space-x-1.5 transition shadow-xs"
              title="Switch Account"
            >
              <i className="fa-solid fa-user-gear text-sky-600" />
              <span className="hidden md:inline">Account</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
