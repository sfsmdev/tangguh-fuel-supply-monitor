export interface ClientRecord {
  id: string;
  name: string;
  color: string; // Hex color for Chart.js e.g. '#EF4444'
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
];

