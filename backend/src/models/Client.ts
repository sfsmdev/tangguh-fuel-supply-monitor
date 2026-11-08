export interface ClientRecord {
  id: string;
  name: string;
  color: string; // Hex color for Chart.js & inline indicators e.g. '#EF4444'
  badgeClass: string; // Tailwind classes for badges e.g. 'bg-red-50 text-red-700 border-red-200'
  dotClass: string; // Tailwind class for indicator dot e.g. 'bg-red-500'
  createdAt: string;
  updatedAt: string;
}

export interface ClientColorPreset {
  label: string;
  color: string;
  badgeClass: string;
  dotClass: string;
}

export const CLIENT_COLOR_PRESETS: ClientColorPreset[] = [
  {
    label: 'Ruby Red',
    color: '#EF4444',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    dotClass: 'bg-red-500',
  },
  {
    label: 'Ocean Blue',
    color: '#3B82F6',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  {
    label: 'Emerald Green',
    color: '#10B981',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  {
    label: 'Amber Gold',
    color: '#F59E0B',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  {
    label: 'Royal Purple',
    color: '#8B5CF6',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    dotClass: 'bg-purple-500',
  },
  {
    label: 'Cyan Marine',
    color: '#06B6D4',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    dotClass: 'bg-cyan-500',
  },
  {
    label: 'Rose Pink',
    color: '#F43F5E',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
  {
    label: 'Indigo Deep',
    color: '#6366F1',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dotClass: 'bg-indigo-500',
  },
  {
    label: 'Teal Harbor',
    color: '#14B8A6',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    dotClass: 'bg-teal-500',
  },
  {
    label: 'Orange Sunset',
    color: '#F97316',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    dotClass: 'bg-orange-500',
  },
  {
    label: 'Fuchsia Berry',
    color: '#D946EF',
    badgeClass: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    dotClass: 'bg-fuchsia-500',
  },
  {
    label: 'Lime Tropic',
    color: '#84CC16',
    badgeClass: 'bg-lime-50 text-lime-700 border-lime-200',
    dotClass: 'bg-lime-500',
  },
  {
    label: 'Sky Horizon',
    color: '#0EA5E9',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    dotClass: 'bg-sky-500',
  },
  {
    label: 'Violet Dusk',
    color: '#7C3AED',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    dotClass: 'bg-violet-500',
  },
  {
    label: 'Pink Coral',
    color: '#EC4899',
    badgeClass: 'bg-pink-50 text-pink-700 border-pink-200',
    dotClass: 'bg-pink-500',
  },
  {
    label: 'Slate Steel',
    color: '#475569',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    dotClass: 'bg-slate-600',
  },
];

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/**
 * Generates an unlimited sequence of distinct colors and matching badge/dot classes
 * or resolves a custom hex color for any number of clients.
 */
export function resolveClientColorStyle(
  index: number,
  colorHex?: string
): { color: string; badgeClass: string; dotClass: string } {
  if (colorHex) {
    const normalized = colorHex.trim().toUpperCase();
    const matchedPreset = CLIENT_COLOR_PRESETS.find(
      (p) => p.color.toUpperCase() === normalized
    );
    if (matchedPreset) {
      return {
        color: matchedPreset.color,
        badgeClass: matchedPreset.badgeClass,
        dotClass: matchedPreset.dotClass,
      };
    }
    const fallbackPreset =
      CLIENT_COLOR_PRESETS[index % CLIENT_COLOR_PRESETS.length];
    return {
      color: colorHex.trim(),
      badgeClass: fallbackPreset.badgeClass,
      dotClass: fallbackPreset.dotClass,
    };
  }

  if (index < CLIENT_COLOR_PRESETS.length) {
    const preset = CLIENT_COLOR_PRESETS[index];
    return {
      color: preset.color,
      badgeClass: preset.badgeClass,
      dotClass: preset.dotClass,
    };
  }

  // Beyond 16 presets: generate golden-angle distinct hex color while cycling clean badge styles
  const goldenHue = Math.round((index * 137.508) % 360);
  const generatedHex = hslToHex(goldenHue, 74, 48);
  const fallbackPreset =
    CLIENT_COLOR_PRESETS[index % CLIENT_COLOR_PRESETS.length];

  return {
    color: generatedHex,
    badgeClass: fallbackPreset.badgeClass,
    dotClass: fallbackPreset.dotClass,
  };
}


