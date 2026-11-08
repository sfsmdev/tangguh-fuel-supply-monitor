'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  FloatingTimelineDay,
  formatNumber,
  ShoreTimelineDay,
} from '@backend/index';
import { TrendingUp } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function FloatingForecastChart({
  vesselName,
  timeline,
  safetyThreshold = 300000,
}: {
  vesselName: string;
  timeline: FloatingTimelineDay[];
  safetyThreshold?: number;
}) {
  const labels = timeline.map((t) => t.dayLabel);
  const robData = timeline.map((t) => t.closingRob);
  const thresholdData = timeline.map(() => safetyThreshold);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sky-600" />
          <span>{vesselName} — Projected ROB Trajectory (Liters)</span>
        </h3>
        <div className="flex items-center gap-4 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1.5 text-sky-700">
            <span className="w-3 h-1 bg-sky-600 rounded-full" />
            <span>Projected Ending ROB (L)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-rose-600">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-rose-500" />
            <span>
              Warning Threshold ({formatNumber(safetyThreshold)} L)
            </span>
          </span>
        </div>
      </div>

      <div className="h-64">
        <Line
          data={{
            labels,
            datasets: [
              {
                label: 'Projected ROB (L)',
                data: robData,
                borderColor: '#0284C7',
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                borderWidth: 2.5,
                pointRadius: 3,
                fill: true,
                tension: 0.25,
              },
              {
                label: 'Safety Threshold (300k L)',
                data: thresholdData,
                borderColor: '#F43F5E',
                borderWidth: 1.5,
                borderDash: [6, 4],
                pointRadius: 0,
                fill: false,
              },
            ],
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
              },
            },
          }}
        />
      </div>
    </div>
  );
}

export function ShoreForecastChart({
  shoreName,
  timeline,
}: {
  shoreName: string;
  timeline: ShoreTimelineDay[];
}) {
  const labels = timeline.map((t) => t.dayLabel);
  const robData = timeline.map((t) => t.dynamicRobL);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>{shoreName} — Cumulative Carry-Over ROB Projection (Liters)</span>
        </h3>
      </div>

      <div className="h-60">
        <Line
          data={{
            labels,
            datasets: [
              {
                label: 'Running ROB (L)',
                data: robData,
                borderColor: '#059669',
                backgroundColor: 'rgba(5, 150, 105, 0.1)',
                borderWidth: 2.5,
                pointRadius: 3,
                fill: true,
                tension: 0.2,
              },
            ],
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
              },
            },
          }}
        />
      </div>
    </div>
  );
}

