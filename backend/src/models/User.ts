export type ViewId =
  | 'dashboardView'
  | 'forecastView'
  | 'dispatchView'
  | 'soundingView'
  | 'topupView'
  | 'settingsView';

export interface UserAccount {
  username: string;
  password?: string;
  displayName: string;
  roleLabel: string;
  canEdit: boolean;
  canDelete: boolean;
  canManageStorage: boolean;
  canManageClients: boolean;
  allowedViews: ViewId[];
}

export const RBAC_USERS: Record<string, UserAccount> = {
  admin: {
    username: 'admin',
    password: 'admin123',
    displayName: 'Administrator',
    roleLabel: 'Full Administrator',
    canEdit: true,
    canDelete: true,
    canManageStorage: true,
    canManageClients: true,
    allowedViews: [
      'dashboardView',
      'forecastView',
      'dispatchView',
      'soundingView',
      'topupView',
      'settingsView',
    ],
  },
  management: {
    username: 'management',
    password: 'manage2026',
    displayName: 'Management',
    roleLabel: 'Executive Management (View-Only)',
    canEdit: false,
    canDelete: false,
    canManageStorage: false,
    canManageClients: false,
    allowedViews: [
      'dashboardView',
      'forecastView',
      'dispatchView',
      'soundingView',
      'topupView',
    ],
  },
  staff: {
    username: 'staff',
    password: 'staff2026',
    displayName: 'Operations Staff',
    roleLabel: 'Operational Staff (No Delete)',
    canEdit: true,
    canDelete: false,
    canManageStorage: false,
    canManageClients: false,
    allowedViews: [
      'dashboardView',
      'forecastView',
      'dispatchView',
      'soundingView',
      'topupView',
    ],
  },
  jgc: {
    username: 'jgc',
    password: 'jgc2026',
    displayName: 'JGC Representative',
    roleLabel: 'Contractor: JGC (View-Only)',
    canEdit: false,
    canDelete: false,
    canManageStorage: false,
    canManageClients: false,
    allowedViews: ['dashboardView', 'forecastView', 'soundingView', 'topupView'],
  },
  saipem: {
    username: 'saipem',
    password: 'sai2026',
    displayName: 'SAIPEM Representative',
    roleLabel: 'Contractor: SAIPEM (View-Only)',
    canEdit: false,
    canDelete: false,
    canManageStorage: false,
    canManageClients: false,
    allowedViews: ['dashboardView', 'forecastView', 'soundingView', 'topupView'],
  },
  ptp: {
    username: 'ptp',
    password: 'ptp2026',
    displayName: 'PETROSEA Representative',
    roleLabel: 'Contractor: PETROSEA (View-Only)',
    canEdit: false,
    canDelete: false,
    canManageStorage: false,
    canManageClients: false,
    allowedViews: ['dashboardView', 'forecastView', 'soundingView', 'topupView'],
  },
  bptangguh: {
    username: 'bptangguh',
    password: 'bp2026',
    displayName: 'BP Tangguh Oversight',
    roleLabel: 'BP Tangguh Client (View-Only)',
    canEdit: false,
    canDelete: false,
    canManageStorage: false,
    canManageClients: false,
    allowedViews: ['dashboardView', 'forecastView', 'soundingView', 'topupView'],
  },
  user: {
    username: 'user',
    password: 'USER123',
    displayName: 'Contractor User',
    roleLabel: 'View-Only (Contractor)',
    canEdit: false,
    canDelete: false,
    canManageStorage: false,
    canManageClients: false,
    allowedViews: ['dashboardView', 'forecastView', 'soundingView', 'topupView'],
  },
};

