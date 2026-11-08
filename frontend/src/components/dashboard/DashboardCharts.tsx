'use client';

import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { useAppStore } from '@/store/useAppStore';
import {
  calculateSummary,
  formatNumber,
  getNowWIT,
} from '@backend/index';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler
);

export function ContractorDistributionCard() {
  const { state, currentUser, setClientModalOpen } = useAppStore();
  const summary = calculateSummary(state);
  const canManageClients = Boolean(
    currentUser?.canManageClients || currentUser?.canEdit
  );

  const clientValues = state.clients.map(
    (c) => summary.clientTotals[c.name] || 0
  );
  const totalClientDispatched = clientValues.reduce((a, b) => a + b, 0);

  const doughnutData = {
    labels: state.clients.map((c) => c.name),
    datasets: [
      {
        data: clientValues,
        backgroundColor: state.clients.map((c) => c.color),
        borderWidth: 2,
        borderColor: '#FFFFFF',
        hoverOffset: 6,
      },
    ],
  };

  return (
    <div className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-chart-pie text-sky-500" />
            <span>Cumulative Contractor Share</span>
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {state.clients.length} Contractors
            </span>
            {canManageClients && (
              <button
                type="button"
                onClick={() => setClientModalOpen(true)}
                className="text-[11px] font-bold text-sky-700 hover:text-sky-900"
              >
                <i className="fa-solid fa-users-gear mr-1" />
                Manage
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Exclusive bunker dispatch volume distribution.
        </p>

        {/* Doughnut Chart Container */}
        <div className="relative h-52 sm:h-56 mt-4 flex items-center justify-center">
          {state.clients.length > 0 && totalClientDispatched > 0 ? (
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                  legend: { display: false },
                },
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 text-slate-400 text-xs text-center p-4">
              {state.clients.length === 0 ? (
                <>
                  <i className="fa-solid fa-users text-3xl mb-2 text-slate-300" />
                  <span>
                    No clients available. Click &apos;Add Client&apos; to create
                    one.
                  </span>
                  {canManageClients && (
                    <button
                      type="button"
                      onClick={() => setClientModalOpen(true)}
                      className="mt-3 px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-xs transition"
                    >
                      + Add Client
                    </button>
                  )}
                </>
              ) : (
                <>
                  <i className="fa-solid fa-gas-pump text-3xl mb-2 text-slate-300" />
                  <span>No B50 bunker dispatches recorded yet.</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Legend Table (Scrollable for Unlimited Clients) */}
      <div className="space-y-2 mt-4 pt-3 border-t border-slate-100 max-h-52 overflow-y-auto pr-1">
        {state.clients.map((client) => {
          const vol = summary.clientTotals[client.name] || 0;
          const pct =
            totalClientDispatched > 0
              ? ((vol / totalClientDispatched) * 100).toFixed(0)
              : '0';
          return (
            <div
              key={client.id}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: client.color }}
                />
                <span className="font-bold text-slate-700 truncate">
                  {client.name}
                </span>
              </div>
              <span className="font-mono font-bold text-slate-900 shrink-0">
                {formatNumber(vol)} L ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DispatchTrendlineCard() {
  const { state } = useAppStore();

  // Build 14-day historical window in WIT
  const days: { iso: string; label: string }[] = [];
  const now = getNowWIT();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;
    const label = `${String(d.getDate()).padStart(2, '0')}/${String(
      d.getMonth() + 1
    ).padStart(2, '0')}`;
    days.push({ iso, label });
  }

  const datasets = state.clients.map((client) => ({
    label: client.name,
    data: days.map((day) =>
      state.bunkerings
        .filter(
          (b) =>
            b.date === day.iso &&
            (b.contractor || '').toLowerCase() === client.name.toLowerCase()
        )
        .reduce((acc, item) => acc + (Number(item.volume) || 0), 0)
    ),
    borderColor: client.color,
    backgroundColor: `${client.color}1A`,
    fill: true,
    tension: 0.3,
    borderWidth: 2,
  }));

  const hasTrendData = state.bunkerings.some((b) =>
    days.some((d) => d.iso === b.date)
  );

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-chart-line text-sky-500" />
            <span>Daily Bunkering Dispatch Trend</span>
          </h2>
          <p className="text-xs text-slate-500">
            Daily fuel consumption volume per client vessel.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs max-h-20 overflow-y-auto">
          {state.clients.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 font-semibold text-slate-600"
            >
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: c.color }}
              />
              <span>{c.name}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="h-64 relative">
        <Line
          data={{
            labels: days.map((d) => d.label),
            datasets,
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: '#E2E8F0' },
                ticks: {
                  font: { family: 'JetBrains Mono', size: 10 },
                },
              },
              x: {
                grid: { display: false },
                ticks: {
                  font: { family: 'JetBrains Mono', size: 10 },
                },
              },
            },
          }}
        />
        {!hasTrendData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 text-slate-400 text-xs">
            <i className="fa-solid fa-chart-simple text-3xl mb-2 text-slate-300" />
            <span>
              Add daily bunker logs to populate trendline visualization.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
