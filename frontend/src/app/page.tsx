'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { TopHeader } from '@/components/layout/TopHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { ForecastView } from '@/components/forecast/ForecastView';
import { DispatchView } from '@/components/dispatch/DispatchView';
import { SoundingView } from '@/components/sounding/SoundingView';
import { TopupView } from '@/components/topup/TopupView';
import { SettingsView } from '@/components/settings/SettingsView';
import { ClientManagementModal } from '@/components/clients/ClientManagementModal';
import { OperationalModals } from '@/components/modals/OperationalModals';

export default function HomePage() {
  const { currentUser, activeView, isHydrated, hydrate } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs font-mono">
        Initializing Tangguh Fuel Supply Monitoring System...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginScreen />
        <OperationalModals />
      </>
    );
  }

  const allowedViews = currentUser.allowedViews || ['dashboardView'];
  const effectiveView = allowedViews.includes(activeView)
    ? activeView
    : 'dashboardView';

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <TopHeader
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          {effectiveView === 'dashboardView' && <DashboardView />}
          {effectiveView === 'forecastView' && <ForecastView />}
          {effectiveView === 'dispatchView' && <DispatchView />}
          {effectiveView === 'soundingView' && <SoundingView />}
          {effectiveView === 'topupView' && <TopupView />}
          {effectiveView === 'settingsView' && <SettingsView />}
        </main>
      </div>

      {/* Centralized Admin Client Management CRUD Modal */}
      <ClientManagementModal />

      {/* All Operational & Confirmation Modals */}
      <OperationalModals />
    </div>
  );
}

