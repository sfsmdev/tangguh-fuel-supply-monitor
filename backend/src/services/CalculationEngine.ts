import { AppOperationalState, SoundingRecord } from '../models/Inventory';

export interface InventorySummary {
  initialRob: number;
  totalTopup: number;
  completedTopupCount: number;
  totalDispatched: number;
  todayDispatched: number;
  bookRob: number;
  latestSounding: number | null;
  variance: number | null;
  clientTotals: Record<string, number>;
  latestSoundingObj: SoundingRecord | null;
}

/**
 * Returns current Date adjusted to WIT (Eastern Indonesia Time, UTC+9)
 */
export function getNowWIT(): Date {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + 3600000 * 9);
}

export function formatTimeWIT(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s} WIT`;
}

export function formatDateWIT(d: Date): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const day = String(d.getDate()).padStart(2, '0');
  const mon = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${mon} ${year}`;
}

export function getWITIsoDate(): string {
  const d = getNowWIT();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function getWITIsoTime(): string {
  const d = getNowWIT();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function getWITIsoDateTime(): string {
  return `${getWITIsoDate()}T${getWITIsoTime()}`;
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(Number(num))) return '0';
  return Math.round(Number(num)).toLocaleString('en-US');
}

export function calculateFlowRate(
  volume: number,
  startTime: string,
  endTime: string
): number {
  if (!volume || !startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;

  let durationMinutes = eh * 60 + em - (sh * 60 + sm);
  if (durationMinutes <= 0) {
    durationMinutes += 24 * 60;
  }

  const durationHours = durationMinutes / 60;
  return durationHours > 0 ? Math.round(volume / durationHours) : 0;
}

/**
 * Safely converts Excel serial dates (e.g. 46334) or date strings (DD/MM/YYYY, YYYY-MM-DD)
 * into ISO YYYY-MM-DD format so PostgreSQL DATE columns and timeline sorting never fail.
 */
export function normalizeExcelDate(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') {
    return getWITIsoDate();
  }

  // Excel serial number (e.g. 40000 - 60000)
  if (typeof raw === 'number' && !isNaN(raw) && raw > 20000 && raw < 90000) {
    const utcDays = Math.floor(raw - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  const str = String(raw).trim();
  if (/^\d{5}$/.test(str)) {
    const serial = Number(str);
    if (serial > 20000 && serial < 90000) {
      const utcDays = Math.floor(serial - 25569);
      const d = new Date(utcDays * 86400 * 1000);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
        2,
        '0'
      )}-${String(d.getUTCDate()).padStart(2, '0')}`;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(parsed.getDate()).padStart(2, '0')}`;
  }

  return getWITIsoDate();
}

/**
 * Safely converts Excel fractional day times (e.g. 0.333333 -> "08:00") or time strings
 * into HH:mm format.
 */
export function normalizeExcelTime(
  raw: unknown,
  fallback: string = '08:00'
): string {
  if (raw === null || raw === undefined || raw === '') return fallback;

  if (typeof raw === 'number' && !isNaN(raw) && raw >= 0 && raw < 1) {
    const totalMinutes = Math.round(raw * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  const str = String(raw).trim();
  const numVal = Number(str);
  if (!isNaN(numVal) && str !== '' && numVal >= 0 && numVal < 1) {
    const totalMinutes = Math.round(numVal * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  const match = str.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const h = Math.min(23, Math.max(0, Number(match[1])));
    const m = Math.min(59, Math.max(0, Number(match[2])));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return fallback;
}

/**
 * Computes the theoretical Book ROB as of a specific historical date (and optional time),
 * so historical Physical Sounding records reconcile against the Book ROB at that moment:
 * Book ROB(t) = Initial Opening ROB + Sum(Completed TopUps <= t) - Sum(Dispatches <= t)
 */
export function calculateBookRobAtDate(
  state: AppOperationalState,
  targetDate: string,
  targetTime?: string
): number {
  const initialRob = Number(state.storageConfig.initialOpeningRob) || 0;
  const cleanDate = (targetDate || '').slice(0, 10);
  if (!cleanDate) {
    return calculateSummary(state).bookRob;
  }

  const cleanTime = targetTime && /^\d{2}:\d{2}/.test(targetTime)
    ? targetTime.slice(0, 5)
    : '23:59';

  const completedTopupsUpToDate = state.topups.filter((t) => {
    if (t.status !== 'Completed') return false;
    const refDt = (t.ata || t.eta || t.etd || '').trim();
    if (!refDt) return true;
    const topupDate = refDt.slice(0, 10);
    if (topupDate < cleanDate) return true;
    if (topupDate > cleanDate) return false;
    const topupTime = refDt.includes('T') ? refDt.slice(11, 16) : '00:00';
    return topupTime <= cleanTime;
  });

  const totalTopupAtDate = completedTopupsUpToDate.reduce(
    (acc, item) => acc + (Number(item.volume) || 0),
    0
  );

  const dispatchesUpToDate = state.bunkerings.filter((b) => {
    const bDate = (b.date || '').slice(0, 10);
    if (!bDate) return true;
    if (bDate < cleanDate) return true;
    if (bDate > cleanDate) return false;
    const bEndTime = (b.endTime || b.startTime || '00:00').slice(0, 5);
    return bEndTime <= cleanTime;
  });

  const totalDispatchedAtDate = dispatchesUpToDate.reduce(
    (acc, item) => acc + (Number(item.volume) || 0),
    0
  );

  return initialRob + totalTopupAtDate - totalDispatchedAtDate;
}

export function calculateSummary(state: AppOperationalState): InventorySummary {
  const initialRob = Number(state.storageConfig.initialOpeningRob) || 0;

  const completedTopups = state.topups.filter((t) => t.status === 'Completed');
  const totalTopup = completedTopups.reduce(
    (acc, item) => acc + (Number(item.volume) || 0),
    0
  );

  const totalDispatched = state.bunkerings.reduce(
    (acc, item) => acc + (Number(item.volume) || 0),
    0
  );

  const todayIso = getWITIsoDate();
  const todayDispatched = state.bunkerings
    .filter((item) => item.date === todayIso)
    .reduce((acc, item) => acc + (Number(item.volume) || 0), 0);

  const bookRob = initialRob + totalTopup - totalDispatched;

  const sortedSoundings = [...state.soundings].sort(
    (a, b) =>
      new Date(`${b.date}T${b.time || '00:00'}`).getTime() -
      new Date(`${a.date}T${a.time || '00:00'}`).getTime()
  );
  const latestSounding =
    sortedSoundings.length > 0 ? Number(sortedSoundings[0].liters) : null;

  const variance = latestSounding !== null ? latestSounding - bookRob : null;

  // Dynamic Client Totals synchronized with Client Master List
  const clientTotals: Record<string, number> = {};
  state.clients.forEach((c) => {
    clientTotals[c.name] = 0;
  });

  state.bunkerings.forEach((b) => {
    const clientName = (b.contractor || '').trim();
    if (!clientName) return;
    if (clientTotals.hasOwnProperty(clientName)) {
      clientTotals[clientName] += Number(b.volume) || 0;
    } else {
      // Case-insensitive match fallback
      const matchedClient = state.clients.find(
        (c) => c.name.toLowerCase() === clientName.toLowerCase()
      );
      if (matchedClient) {
        clientTotals[matchedClient.name] += Number(b.volume) || 0;
      } else {
        const upperKey = clientName.toUpperCase();
        clientTotals[upperKey] =
          (clientTotals[upperKey] || 0) + (Number(b.volume) || 0);
      }
    }
  });

  return {
    initialRob,
    totalTopup,
    completedTopupCount: completedTopups.length,
    totalDispatched,
    todayDispatched,
    bookRob,
    latestSounding,
    variance,
    clientTotals,
    latestSoundingObj: sortedSoundings[0] || null,
  };
}

