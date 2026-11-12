'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  formatDateWIT,
  formatNumber,
  formatTimeWIT,
  getPeriodDateRange,
  getPeriodForDate,
  PertaminaPeriodType,
  resolvePeriodRecord,
} from '@backend/index';

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function formatTimestampWIT(isoString?: string): string {
  if (!isoString || !isoString.trim()) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const witDate = new Date(utc + 3600000 * 9);
    return `${formatDateWIT(witDate)} • ${formatTimeWIT(witDate)} WIT`;
  } catch {
    return isoString;
  }
}

export function FuelPriceCard() {
  const { state, currentUser, updateFuelPricePeriod } = useAppStore();
  const isAdmin = currentUser?.roleCode === 'admin';

  // Determine current active period as default
  const todayIso = new Date().toISOString().slice(0, 10);
  const currentPeriodInfo = getPeriodForDate(todayIso);

  // Filter States: Bulan | Tahun | Periode (I atau II)
  const [selectedMonth, setSelectedMonth] = useState<number>(
    currentPeriodInfo.month
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    currentPeriodInfo.year
  );
  const [selectedPeriod, setSelectedPeriod] = useState<PertaminaPeriodType>(
    currentPeriodInfo.period
  );

  // Admin Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalYear, setModalYear] = useState<number>(currentPeriodInfo.year);
  const [modalMonth, setModalMonth] = useState<number>(currentPeriodInfo.month);
  const [modalPeriod, setModalPeriod] = useState<PertaminaPeriodType>(
    currentPeriodInfo.period
  );
  const [editPrice, setEditPrice] = useState<string>('');
  const [editCurrency, setEditCurrency] = useState<string>('IDR');
  const [editFuelType, setEditFuelType] = useState<string>('Biofuel B50');
  const [editNotes, setEditNotes] = useState<string>('');

  // Available Years (e.g. 2024 s/d 2027)
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ];

  // Resolve currently active target record
  const activeRecord = resolvePeriodRecord(
    state.fuelPricePeriods,
    selectedYear,
    selectedMonth,
    selectedPeriod
  );
  const hasPrice = activeRecord.pricePerLiter > 0;

  // Open modal for a specific period (defaults to currently selected filter)
  const handleOpenModal = (
    year = selectedYear,
    month = selectedMonth,
    period: PertaminaPeriodType = selectedPeriod
  ) => {
    const existing = resolvePeriodRecord(
      state.fuelPricePeriods,
      year,
      month,
      period
    );
    setModalYear(year);
    setModalMonth(month);
    setModalPeriod(period);
    setEditPrice(
      existing.pricePerLiter > 0 ? String(existing.pricePerLiter) : ''
    );
    setEditCurrency(existing.currency || 'IDR');
    setEditFuelType(existing.fuelType || 'Biofuel B50');
    setEditNotes(existing.notes || '');
    setIsEditModalOpen(true);
  };

  // Switch modal period or month dynamically
  const onModalPeriodChange = (
    newYear: number,
    newMonth: number,
    newPeriod: PertaminaPeriodType
  ) => {
    setModalYear(newYear);
    setModalMonth(newMonth);
    setModalPeriod(newPeriod);
    const existing = resolvePeriodRecord(
      state.fuelPricePeriods,
      newYear,
      newMonth,
      newPeriod
    );
    setEditPrice(
      existing.pricePerLiter > 0 ? String(existing.pricePerLiter) : ''
    );
    setEditCurrency(existing.currency || 'IDR');
    setEditFuelType(existing.fuelType || 'Biofuel B50');
    setEditNotes(existing.notes || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(editPrice) || 0;
    if (val < 0) return;

    updateFuelPricePeriod({
      year: modalYear,
      month: modalMonth,
      period: modalPeriod,
      pricePerLiter: val,
      currency: editCurrency.trim().toUpperCase() || 'IDR',
      fuelType: editFuelType.trim() || 'Biofuel B50',
      notes: editNotes.trim(),
    });

    // Also update filter view to match the saved period
    setSelectedYear(modalYear);
    setSelectedMonth(modalMonth);
    setSelectedPeriod(modalPeriod);
    setIsEditModalOpen(false);
  };

  // Active period date range for modal preview
  const modalRange = getPeriodDateRange(modalYear, modalMonth, modalPeriod);

  return (
    <>
      <div className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-amber-300 transition">
        {/* Ambient Glow */}
        <div className="absolute -right-3 -top-3 w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-300 group-hover:scale-110 transition pointer-events-none">
          <i className="fa-solid fa-tags text-2xl" />
        </div>

        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Pertamina Purchase Rate
              </h3>
            </div>

            {isAdmin ? (
              <button
                type="button"
                onClick={() =>
                  handleOpenModal(selectedYear, selectedMonth, selectedPeriod)
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition shadow-2xs z-10 cursor-pointer"
                title="Update Pertamina Purchase Rate (Admin Only)"
              >
                <i className="fa-solid fa-pen-to-square text-[11px]" />
                <span>Update Harga</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                <i className="fa-solid fa-lock text-[9px]" />
                <span>View Only</span>
              </span>
            )}
          </div>

          {/* Streamlined Filter Bar: Bulan | Tahun | Periode (I atau II) */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 mb-3 flex flex-wrap items-center justify-between gap-2.5">
            {/* Left: Bulan & Tahun Selectors */}
            <div className="flex items-center gap-2">
              {/* Bulan */}
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Bulan:
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-2.5 py-1 text-xs font-semibold bg-white rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Separator */}
              <span className="text-slate-300 font-bold">|</span>

              {/* Tahun */}
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Tahun:
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-2.5 py-1 text-xs font-semibold bg-white rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: Periode Toggle (Periode I vs Periode II) */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-bold hidden sm:inline">|</span>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Periode:
              </label>
              <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg text-xs font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('Periode I')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    selectedPeriod === 'Periode I'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'hover:text-slate-900 text-slate-600'
                  }`}
                  title="Periode I: Tanggal 1 s/d 14"
                >
                  Periode I (1-14)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('Periode II')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    selectedPeriod === 'Periode II'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'hover:text-slate-900 text-slate-600'
                  }`}
                  title="Periode II: Tanggal 15 s/d Akhir Bulan"
                >
                  Periode II (15-Akhir)
                </button>
              </div>
            </div>
          </div>

          {/* Active Target Period Rate Card View */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px]">
                  {activeRecord.period}
                </span>
                <span className="text-slate-400">•</span>
                <span className="font-semibold text-slate-600 text-xs">
                  {MONTH_NAMES[activeRecord.month - 1]} {activeRecord.year}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {activeRecord.fuelType || 'Biofuel B50'}
              </span>
            </div>

            {/* Main Price Highlight */}
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-xs font-extrabold text-amber-600 font-mono">
                {activeRecord.currency === 'IDR' ? 'Rp' : activeRecord.currency}
              </span>
              <span className="text-3xl font-mono font-black text-slate-900 tracking-tight">
                {formatNumber(activeRecord.pricePerLiter)}
              </span>
              <span className="text-xs font-bold text-slate-500 font-mono">
                / Liter
              </span>
            </div>

            {/* Notes / Status */}
            {activeRecord.notes ? (
              <p className="text-[11px] text-slate-600 font-medium mt-1 line-clamp-1">
                {activeRecord.notes}
              </p>
            ) : !hasPrice ? (
              <p className="text-[11px] text-slate-400 italic mt-1">
                Belum ada data Pertamina Purchase Rate untuk periode ini
              </p>
            ) : null}

            {/* Footer Metadata */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <i className="fa-regular fa-clock text-slate-400 text-[10px]" />
                <span>Update:</span>
                <span className="font-mono font-semibold text-slate-700">
                  {activeRecord.updatedAt
                    ? formatTimestampWIT(activeRecord.updatedAt)
                    : '-'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span>Oleh:</span>
                {activeRecord.updatedBy ? (
                  <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                    {activeRecord.updatedBy}
                  </span>
                ) : (
                  <span className="text-slate-400 font-mono">-</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Edit Modal */}
      {isAdmin && isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <i className="fa-solid fa-tags text-sm" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Update Pertamina Purchase Rate
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Khusus Administrator • Berlaku untuk periode resmi Pertamina
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Period Target Selection */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2.5">
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <i className="fa-solid fa-calendar-days text-amber-600" />
                  <span>Pilih Periode Pertamina</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Bulan
                    </label>
                    <select
                      value={modalMonth}
                      onChange={(e) =>
                        onModalPeriodChange(
                          modalYear,
                          Number(e.target.value),
                          modalPeriod
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={name} value={idx + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tahun
                    </label>
                    <select
                      value={modalYear}
                      onChange={(e) =>
                        onModalPeriodChange(
                          Number(e.target.value),
                          modalMonth,
                          modalPeriod
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Periode Setengah Bulan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onModalPeriodChange(modalYear, modalMonth, 'Periode I')
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                        modalPeriod === 'Periode I'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Periode I (1 - 14)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onModalPeriodChange(modalYear, modalMonth, 'Periode II')
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                        modalPeriod === 'Periode II'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Periode II (15 - Akhir)
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-amber-800 font-semibold bg-white/80 p-2 rounded-lg border border-amber-100 flex items-center justify-between">
                  <span>Periode Berlaku:</span>
                  <span className="font-bold">
                    {modalPeriod} • {MONTH_NAMES[modalMonth - 1]} {modalYear}
                  </span>
                </div>
              </div>

              {/* Price & Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mata Uang
                  </label>
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="IDR">IDR (Rp)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Harga / Liter ({editCurrency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipe / Grade Bahan Bakar
                </label>
                <input
                  type="text"
                  required
                  value={editFuelType}
                  onChange={(e) => setEditFuelType(e.target.value)}
                  placeholder="Biofuel B50"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Contoh: Official Pertamina Marine Fuel Purchase Rate"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
