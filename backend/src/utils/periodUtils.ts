import { FuelPricePeriodRecord, PertaminaPeriodType } from '../models/Inventory';

/**
 * Returns number of days in a given year and month (1-12).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Generates unique period ID, e.g. 'rate_2026_11_P1'
 */
export function generatePeriodId(
  year: number,
  month: number,
  period: PertaminaPeriodType
): string {
  const m = String(month).padStart(2, '0');
  const p = period === 'Periode I' ? 'P1' : 'P2';
  return `rate_${year}_${m}_${p}`;
}

/**
 * Computes official Pertamina date range for a given month & period:
 * - Periode I: 01 s/d 14
 * - Periode II: 15 s/d last day of month (28/29, 30, or 31)
 */
export function getPeriodDateRange(
  year: number,
  month: number,
  period: PertaminaPeriodType
): { startDate: string; endDate: string } {
  const m = String(month).padStart(2, '0');
  if (period === 'Periode I') {
    return {
      startDate: `${year}-${m}-01`,
      endDate: `${year}-${m}-14`,
    };
  }
  const lastDay = getDaysInMonth(year, month);
  return {
    startDate: `${year}-${m}-15`,
    endDate: `${year}-${m}-${String(lastDay).padStart(2, '0')}`,
  };
}

/**
 * Determines which Pertamina period a given date string (YYYY-MM-DD) falls into.
 */
export function getPeriodForDate(dateStr: string): {
  year: number;
  month: number;
  period: PertaminaPeriodType;
  startDate: string;
  endDate: string;
} {
  const parts = dateStr.slice(0, 10).split('-');
  const year = Number(parts[0]) || new Date().getFullYear();
  const month = Number(parts[1]) || new Date().getMonth() + 1;
  const day = Number(parts[2]) || 1;

  const period: PertaminaPeriodType = day <= 14 ? 'Periode I' : 'Periode II';
  const range = getPeriodDateRange(year, month, period);

  return {
    year,
    month,
    period,
    startDate: range.startDate,
    endDate: range.endDate,
  };
}

/**
 * Returns month indices (1-12) for a given quarter (1-4).
 */
export function getQuarterMonths(quarter: number): number[] {
  switch (quarter) {
    case 1:
      return [1, 2, 3];
    case 2:
      return [4, 5, 6];
    case 3:
      return [7, 8, 9];
    case 4:
      return [10, 11, 12];
    default:
      return [10, 11, 12];
  }
}

/**
 * Find or construct an empty period record (price 0) if not yet stored.
 */
export function resolvePeriodRecord(
  records: FuelPricePeriodRecord[] | undefined,
  year: number,
  month: number,
  period: PertaminaPeriodType
): FuelPricePeriodRecord {
  const id = generatePeriodId(year, month, period);
  const found = (records || []).find(
    (r) =>
      r.id === id ||
      (r.year === year && r.month === month && r.period === period)
  );
  if (found) {
    return found;
  }
  const range = getPeriodDateRange(year, month, period);
  return {
    id,
    year,
    month,
    period,
    startDate: range.startDate,
    endDate: range.endDate,
    pricePerLiter: 0,
    currency: 'IDR',
    fuelType: 'Biofuel B50',
    notes: '',
    updatedBy: '',
    updatedAt: '',
  };
}
