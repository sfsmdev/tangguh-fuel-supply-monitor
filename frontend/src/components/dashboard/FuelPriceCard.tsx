'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  formatDateWIT,
  formatNumber,
  formatTimeWIT,
  FuelPriceRecord,
} from '@backend/index';

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
  const { state, currentUser, updateFuelPrice } = useAppStore();
  const isAdmin = currentUser?.roleCode === 'admin';

  const rawPrice: FuelPriceRecord | undefined = state.fuelPrice;
  const hasPrice = Boolean(rawPrice && Number(rawPrice.pricePerLiter) > 0);
  const pricePerLiter = hasPrice ? Number(rawPrice?.pricePerLiter) : 0;
  const currency = rawPrice?.currency || 'IDR';
  const fuelType = rawPrice?.fuelType?.trim() || 'Biofuel B50';
  const effectiveDate = rawPrice?.effectiveDate?.trim() || '';
  const notes = rawPrice?.notes?.trim() || '';
  const updatedAt = rawPrice?.updatedAt?.trim() || '';
  const updatedBy = rawPrice?.updatedBy?.trim() || '';

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [editCurrency, setEditCurrency] = useState('IDR');
  const [editFuelType, setEditFuelType] = useState('Biofuel B50');
  const [editEffectiveDate, setEditEffectiveDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const openModal = () => {
    setEditPrice(hasPrice ? String(pricePerLiter) : '');
    setEditCurrency(currency);
    setEditFuelType(fuelType);
    setEditEffectiveDate(
      effectiveDate || new Date().toISOString().slice(0, 10)
    );
    setEditNotes(notes);
    setIsEditModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(editPrice) || 0;
    if (val < 0) return;

    updateFuelPrice({
      pricePerLiter: val,
      currency: editCurrency.trim().toUpperCase() || 'IDR',
      fuelType: editFuelType.trim() || 'Biofuel B50',
      effectiveDate: editEffectiveDate,
      notes: editNotes.trim(),
    });
    setIsEditModalOpen(false);
  };

  return (
    <>
      <div className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-amber-300 transition">
        {/* Background Ambient Glow */}
        <div className="absolute -right-3 -top-3 w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-300 group-hover:scale-110 transition pointer-events-none">
          <i className="fa-solid fa-tags text-2xl" />
        </div>

        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  hasPrice ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'
                }`}
              />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Harga Acuan Minyak
              </h3>
            </div>

            {isAdmin ? (
              <button
                type="button"
                onClick={openModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition shadow-2xs z-10 cursor-pointer"
                title="Update Harga Minyak Terbaru (Admin Only)"
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

          {/* Fuel Type & Effective Date */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 truncate mb-1.5">
            <span>{fuelType}</span>
            {effectiveDate && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Per {effectiveDate}
                </span>
              </>
            )}
          </div>

          {/* Main Price Highlight */}
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xs font-extrabold text-amber-600 font-mono">
              {currency === 'IDR' ? 'Rp' : currency}
            </span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-slate-900 tracking-tight">
              {formatNumber(pricePerLiter)}
            </span>
            <span className="text-xs font-bold text-slate-500 font-mono">
              / Liter
            </span>
          </div>

          {/* Notes or Status */}
          {notes ? (
            <p className="text-[11px] text-slate-600 font-medium mt-1 line-clamp-1">
              {notes}
            </p>
          ) : !hasPrice ? (
            <p className="text-[11px] text-slate-400 italic mt-1">
              Belum ada data input harga
            </p>
          ) : null}
        </div>

        {/* Card Footer: Metadata & Timestamp WIT */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-1.5 font-medium">
          <div className="flex items-center gap-1.5 truncate">
            <i className="fa-regular fa-clock text-slate-400 text-[10px]" />
            <span>Update:</span>
            <span className="font-mono font-semibold text-slate-700">
              {updatedAt ? formatTimestampWIT(updatedAt) : '-'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 text-slate-500">
            <span>Oleh:</span>
            {updatedBy ? (
              <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                {updatedBy}
              </span>
            ) : (
              <span className="text-slate-400 font-mono">-</span>
            )}
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
                    Update Harga Acuan Minyak
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Khusus Administrator • Tersimpan langsung ke database
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
                  placeholder="Contoh: Biofuel B50 Marine Offshore"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Efektif / Mulai Berlaku
                </label>
                <input
                  type="date"
                  value={editEffectiveDate}
                  onChange={(e) => setEditEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Keterangan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Contoh: Official Pertamina Marine Fuel Benchmark"
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition shadow-xs"
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
