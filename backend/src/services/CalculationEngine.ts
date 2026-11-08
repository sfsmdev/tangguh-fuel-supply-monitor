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
    if (clientTotals.hasOwnProperty(clientName)) {
      clientTotals[clientName] += Number(b.volume) || 0;
    } else {
      // Case-insensitive match fallback
      const matchedClient = state.clients.find(
        (c) => c.name.toLowerCase() === clientName.toLowerCase()
      );
      if (matchedClient) {
        clientTotals[matchedClient.name] += Number(b.volume) || 0;
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

