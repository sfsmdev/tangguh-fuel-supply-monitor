'use client';

import * as XLSX from 'xlsx';
import {
  AppOperationalState,
  calculateSummary,
  formatDateWIT,
  formatNumber,
  formatTimeWIT,
  getNowWIT,
   getWITIsoDate,
} from '@backend/index';

export function exportFullReportToExcel(state: AppOperationalState) {
  const summary = calculateSummary(state);
  const wb = XLSX.utils.book_new();

  // Sheet 1: Executive Summary & Dynamic Client Breakdown
  const clientSummaryRows: (string | number)[][] = [
    ['CLIENT / CONTRACTOR', 'TOTAL DISPATCHED (L)', 'SHARE (%)'],
  ];

  if (state.clients.length === 0) {
    clientSummaryRows.push(['No clients registered', 0, '0.0%']);
  } else {
    state.clients.forEach((c) => {
      const vol = summary.clientTotals[c.name] || 0;
      const pct =
        summary.totalDispatched > 0
          ? ((vol / summary.totalDispatched) * 100).toFixed(1)
          : '0.0';
      clientSummaryRows.push([c.name, vol, `${pct}%`]);
    });
  }

  const summaryData: (string | number)[][] = [
    ['TANGGUH FUEL SUPPLY MONITORING - EXECUTIVE REPORT'],
    ['Generated At (WIT)', `${formatDateWIT(getNowWIT())} ${formatTimeWIT(getNowWIT())}`],
    ['Floating Storage Vessel', state.storageConfig.vesselName],
    ['Total Storage Capacity (L)', state.storageConfig.totalCapacity],
    ['Deadstock Floor (L)', state.storageConfig.deadstock],
    [],
    ['INVENTORY RECONCILIATION', 'VOLUME (L)'],
    ['Initial Opening ROB', summary.initialRob],
    ['Total Completed Cargo Top-Up', summary.totalTopup],
    ['Total Bunker Dispatched', summary.totalDispatched],
    ['Calculated Book ROB', summary.bookRob],
    [
      'Latest Physical Sounding',
      summary.latestSounding !== null ? summary.latestSounding : 'N/A',
    ],
    [
      'Variance (Physical - Book)',
      summary.variance !== null ? summary.variance : 'N/A',
    ],
    [],
    ...clientSummaryRows,
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  // Sheet 2: Client Master List
  const clientsData = [
    ['Client ID', 'Client Name', 'Theme Color', 'Created At', 'Updated At'],
    ...state.clients.map((c) => [
      c.id,
      c.name,
      c.color,
      c.createdAt,
      c.updatedAt,
    ]),
  ];
  const wsClients = XLSX.utils.aoa_to_sheet(clientsData);
  XLSX.utils.book_append_sheet(wb, wsClients, 'Client Master');

  // Sheet 3: Bunker Dispatches
  const dispatchData = [
    [
      'Date',
      'Client / Contractor',
      'Receiving Vessel',
      'Volume (L)',
      'Start Time',
      'End Time',
      'Flow Rate (L/Hr)',
    ],
    ...state.bunkerings.map((b) => [
      b.date,
      b.contractor,
      b.vesselName,
      b.volume,
      b.startTime,
      b.endTime,
      b.flowRate,
    ]),
  ];
  const wsDispatch = XLSX.utils.aoa_to_sheet(dispatchData);
  XLSX.utils.book_append_sheet(wb, wsDispatch, 'Bunker Dispatches');

  // Sheet 4: Physical Soundings
  const soundingData = [
    [
      'Date',
      'Time',
      'Physical Sounding (L)',
      'Draft Fwd (m)',
      'Draft Aft (m)',
      'Remarks',
    ],
    ...state.soundings.map((s) => [
      s.date,
      s.time,
      s.liters,
      s.draftFwd ?? '',
      s.draftAft ?? '',
      s.remarks ?? '',
    ]),
  ];
  const wsSounding = XLSX.utils.aoa_to_sheet(soundingData);
  XLSX.utils.book_append_sheet(wb, wsSounding, 'Physical Soundings');

  // Sheet 5: Cargo Top-Ups
  const topupData = [
    [
      'Performing Vessel',
      'Volume (L)',
      'Loading Port',
      'Discharge Port',
      'ETD',
      'ETA',
      'ATD',
      'ATA',
      'Status',
    ],
    ...state.topups.map((t) => [
      t.vessel,
      t.volume,
      t.loadPort,
      t.dischPort,
      t.etd,
      t.eta,
      t.atd ?? '',
      t.ata ?? '',
      t.status,
    ]),
  ];
  const wsTopup = XLSX.utils.aoa_to_sheet(topupData);
  XLSX.utils.book_append_sheet(wb, wsTopup, 'Cargo Top-Ups');

  XLSX.writeFile(wb, `Tangguh_Fuel_Supply_Report_${getWITIsoDate()}.xlsx`);
}

export function printExecutivePdfReport(state: AppOperationalState) {
  const summary = calculateSummary(state);
  const now = getNowWIT();

  const clientRowsHtml =
    state.clients.length === 0
      ? `<tr><td colspan="3" style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; color: #64748b;">No clients available</td></tr>`
      : state.clients
          .map((c) => {
            const vol = summary.clientTotals[c.name] || 0;
            const pct =
              summary.totalDispatched > 0
                ? ((vol / summary.totalDispatched) * 100).toFixed(1)
                : '0.0';
            return `
            <tr>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: 700;">${c.name}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${formatNumber(vol)} L</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${pct}%</td>
            </tr>
          `;
          })
          .join('');

  const recentDispatches = [...state.bunkerings]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 25);

  const dispatchRowsHtml =
    recentDispatches.length === 0
      ? `<tr><td colspan="5" style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; color: #64748b;">No dispatch records logged</td></tr>`
      : recentDispatches
          .map(
            (b) => `
          <tr>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-family: monospace;">${b.date}</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 700;">${b.contractor}</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">${b.vesselName}</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${formatNumber(b.volume)} L</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${formatNumber(b.flowRate)} L/Hr</td>
          </tr>
        `
          )
          .join('');

  const printWindow = window.open('', '_blank', 'width=960,height=800');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Tangguh Fuel Supply Report - ${getWITIsoDate()}</title>
      <style>
        body { font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; color: #0f172a; padding: 32px; }
        h1 { font-size: 22px; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
        .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; }
        .card-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; }
        .card-val { font-size: 16px; font-weight: 800; font-family: monospace; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px; }
        th { background: #e2e8f0; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
      </style>
    </head>
    <body>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px;">
        <div>
          <h1>Tangguh Fuel Supply Monitoring</h1>
          <div style="font-size: 12px; color: #475569; margin-top: 4px;">Marine & Industrial Fuel Supply • Floating Storage: <strong>${state.storageConfig.vesselName}</strong></div>
        </div>
        <div style="text-align: right; font-size: 12px; font-family: monospace;">
          <strong>Report Date:</strong> ${formatDateWIT(now)} ${formatTimeWIT(now)}
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-label">Initial Opening ROB</div>
          <div class="card-val">${formatNumber(summary.initialRob)} L</div>
        </div>
        <div class="card">
          <div class="card-label">Cargo Top-Up Received</div>
          <div class="card-val" style="color: #047857;">${formatNumber(summary.totalTopup)} L</div>
        </div>
        <div class="card">
          <div class="card-label">Total Dispatched</div>
          <div class="card-val" style="color: #b45309;">${formatNumber(summary.totalDispatched)} L</div>
        </div>
        <div class="card">
          <div class="card-label">Current Book ROB</div>
          <div class="card-val" style="color: #0369a1;">${formatNumber(summary.bookRob)} L</div>
        </div>
      </div>

      <h3 style="font-size: 13px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">Client Distribution Summary</h3>
      <table>
        <thead>
          <tr>
            <th>Client Name</th>
            <th style="text-align: right;">Total Volume (L)</th>
            <th style="text-align: right;">Share (%)</th>
          </tr>
        </thead>
        <tbody>${clientRowsHtml}</tbody>
      </table>

      <h3 style="font-size: 13px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">Recent Bunker Dispatch Logs</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Client</th>
            <th>Vessel Name</th>
            <th style="text-align: right;">Volume (L)</th>
            <th style="text-align: right;">Flow Rate</th>
          </tr>
        </thead>
        <tbody>${dispatchRowsHtml}</tbody>
      </table>
      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

