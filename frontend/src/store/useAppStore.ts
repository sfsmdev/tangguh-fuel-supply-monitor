'use client';

import { create } from 'zustand';
import {
  AppOperationalState,
  AuthService,
  BunkeringRecord,
  ClientRecord,
  ClientService,
  createCleanInitialState,
  ForecastDispatch,
  ForecastTopup,
  formatNumber,
  FuelPriceRecord,
  InventoryService,
  sanitizeOperationalState,
  SoundingRecord,
  StorageConfig,
  SupabaseProvider,
  TopupRecord,
  TopupStatus,
  UserAccount,
  ViewId,
} from '@backend/index';

const STORAGE_KEY = 'tangguh_fuel_state_v2_clean';
const SESSION_KEY = 'tangguh_active_session_v2';

let pendingSaveCount = 0;
let lastLocalMutationAt = 0;
let hasUnsyncedLocalChanges = false;

function hasOperationalRecords(s: AppOperationalState | null): boolean {
  if (!s) return false;
  return (
    s.clients.length > 0 ||
    s.bunkerings.length > 0 ||
    s.soundings.length > 0 ||
    s.topups.length > 0 ||
    s.forecastDispatches.length > 0 ||
    s.forecastTopups.length > 0 ||
    Number(s.storageConfig?.initialOpeningRob) > 0 ||
    Number(s.storageConfig?.shoreTankInitialRob) > 0
  );
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: (() => void) | null;
}

interface AppStore {
  state: AppOperationalState;
  currentUser: UserAccount | null;
  activeView: ViewId;
  forecastHorizonDays: number;
  isHydrated: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;

  // Global UI Modals
  isClientModalOpen: boolean;
  isSwitchUserModalOpen: boolean;
  isQuickRobModalOpen: boolean;
  isBulkImportModalOpen: boolean;

  // Record Modals
  dispatchModal: { isOpen: boolean; editItem?: BunkeringRecord | null };
  soundingModal: { isOpen: boolean; editItem?: SoundingRecord | null };
  topupModal: {
    isOpen: boolean;
    editItem?: TopupRecord | null;
    defaultStatus?: TopupStatus;
  };
  docPreviewModal: { isOpen: boolean; title: string; dataUrl: string };

  // Forecast Modals
  forecastDispatchModal: {
    isOpen: boolean;
    editItem?: ForecastDispatch | null;
    defaultDate?: string;
    defaultClient?: string;
  };
  forecastTopupModal: {
    isOpen: boolean;
    editItem?: ForecastTopup | null;
    defaultDate?: string;
    defaultTarget?: 'floating' | 'shore' | 'both';
  };
  floatingChooserModal: {
    isOpen: boolean;
    date: string;
    preselectedClient?: string;
  };
  recordManageModal: {
    isOpen: boolean;
    type: 'dispatch' | 'topup';
    id: string;
    date: string;
    clientHint?: string;
  };

  // Notifications & Confirmations
  toasts: ToastItem[];
  confirmDialog: ConfirmDialogState;

  // Hydrate & Sync
  hydrate: () => Promise<void>;
  syncFromServer: (silent?: boolean) => Promise<void>;
  persistState: (nextState: AppOperationalState) => void;

  // Auth Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;

  // View & UI Actions
  setActiveView: (view: ViewId) => void;
  setForecastHorizonDays: (days: number) => void;
  setClientModalOpen: (open: boolean) => void;
  setSwitchUserModalOpen: (open: boolean) => void;
  setQuickRobModalOpen: (open: boolean) => void;
  setBulkImportModalOpen: (open: boolean) => void;

  setDispatchModal: (modal: {
    isOpen: boolean;
    editItem?: BunkeringRecord | null;
  }) => void;
  setSoundingModal: (modal: {
    isOpen: boolean;
    editItem?: SoundingRecord | null;
  }) => void;
  setTopupModal: (modal: {
    isOpen: boolean;
    editItem?: TopupRecord | null;
    defaultStatus?: TopupStatus;
  }) => void;
  setDocPreviewModal: (modal: {
    isOpen: boolean;
    title: string;
    dataUrl: string;
  }) => void;

  setForecastDispatchModal: (modal: {
    isOpen: boolean;
    editItem?: ForecastDispatch | null;
    defaultDate?: string;
    defaultClient?: string;
  }) => void;
  setForecastTopupModal: (modal: {
    isOpen: boolean;
    editItem?: ForecastTopup | null;
    defaultDate?: string;
    defaultTarget?: 'floating' | 'shore' | 'both';
  }) => void;
  setFloatingChooserModal: (modal: {
    isOpen: boolean;
    date: string;
    preselectedClient?: string;
  }) => void;
  setRecordManageModal: (modal: {
    isOpen: boolean;
    type: 'dispatch' | 'topup';
    id: string;
    date: string;
    clientHint?: string;
  }) => void;

  // Toast & Confirm
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info'
  ) => void;
  removeToast: (id: string) => void;
  openConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel?: string
  ) => void;
  closeConfirm: () => void;

  // Client Management CRUD (Admin Only)
  addClient: (name: string, colorHex?: string) => ClientRecord | null;
  updateClient: (
    id: string,
    name: string,
    colorHex?: string
  ) => ClientRecord | null;
  deleteClient: (id: string) => void;

  // Operational CRUD
  saveBunkering: (
    payload: Omit<BunkeringRecord, 'id' | 'flowRate'> & { id?: string }
  ) => void;
  deleteBunkering: (id: string) => void;
  bulkImportBunkerings: (items: Omit<BunkeringRecord, 'id'>[]) => void;

  saveSounding: (payload: Omit<SoundingRecord, 'id'> & { id?: string }) => void;
  deleteSounding: (id: string) => void;

  saveTopup: (payload: Omit<TopupRecord, 'id'> & { id?: string }) => void;
  receiveTopup: (id: string) => void;
  deleteTopup: (id: string) => void;

  saveForecastDispatch: (
    payload: Omit<ForecastDispatch, 'id'> & { id?: string }
  ) => void;
  deleteForecastDispatch: (id: string) => void;

  saveForecastTopup: (
    payload: Omit<ForecastTopup, 'id'> & { id?: string }
  ) => void;
  deleteForecastTopup: (id: string) => void;

  executeForecastDispatch: (id: string) => void;
  executeForecastTopup: (id: string) => void;
  setShoreTankDailyRob: (dateIso: string, robLiters: number | null) => void;

  updateStorageConfig: (updates: Partial<StorageConfig>) => void;
  updateFuelPrice: (updates: Partial<FuelPriceRecord>) => void;
  restoreFullState: (rawState: Partial<AppOperationalState>) => void;
  resetAllData: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  state: createCleanInitialState(),
  currentUser: null,
  activeView: 'dashboardView',
  forecastHorizonDays: 14,
  isHydrated: false,
  isSyncing: false,
  lastSyncedAt: null,

  isClientModalOpen: false,
  isSwitchUserModalOpen: false,
  isQuickRobModalOpen: false,
  isBulkImportModalOpen: false,

  dispatchModal: { isOpen: false, editItem: null },
  soundingModal: { isOpen: false, editItem: null },
  topupModal: { isOpen: false, editItem: null, defaultStatus: 'Planned' },
  docPreviewModal: { isOpen: false, title: '', dataUrl: '' },

  forecastDispatchModal: { isOpen: false, editItem: null },
  forecastTopupModal: { isOpen: false, editItem: null },
  floatingChooserModal: { isOpen: false, date: '' },
  recordManageModal: { isOpen: false, type: 'dispatch', id: '', date: '' },

  toasts: [],
  confirmDialog: {
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  },

  hydrate: async () => {
    if (typeof window === 'undefined') return;

    // 1. Restore session from sessionStorage & verify against Supabase
    try {
      const savedSession = sessionStorage.getItem(SESSION_KEY);
      if (savedSession) {
        try {
          const parsedUser = JSON.parse(savedSession) as UserAccount;
          if (parsedUser && parsedUser.username) {
            set({ currentUser: parsedUser });
            const refreshed = await AuthService.getUserByUsername(
              parsedUser.username
            );
            if (refreshed) {
              sessionStorage.setItem(SESSION_KEY, JSON.stringify(refreshed));
              set({ currentUser: refreshed });
            }
          }
        } catch {
          // If legacy string username was stored, look it up from Supabase
          const user = await AuthService.getUserByUsername(savedSession);
          if (user) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
            set({ currentUser: user });
          } else {
            sessionStorage.removeItem(SESSION_KEY);
          }
        }
      }
    } catch {
      // ignore
    }

    // 2. Restore local state or fetch from backend API
    let localState: AppOperationalState | null = null;
    try {
      const rawLocal = localStorage.getItem(STORAGE_KEY);
      if (rawLocal) {
        localState = sanitizeOperationalState(JSON.parse(rawLocal));
      }
    } catch {
      // ignore
    }

    let serverState: AppOperationalState | null = null;
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.state) {
          serverState = sanitizeOperationalState(data.state);
        }
      }
    } catch {
      // ignore
    }

    // Prioritize serverState from Supabase/API when available; fallback to localState if offline or server is empty
    const useServer =
      serverState &&
      (hasOperationalRecords(serverState) || !hasOperationalRecords(localState));
    const finalState =
      (useServer ? serverState : localState) ||
      serverState ||
      localState ||
      createCleanInitialState();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalState));
      const activeUser = get().currentUser;
      if (
        !hasOperationalRecords(serverState) &&
        hasOperationalRecords(localState) &&
        activeUser?.canEdit
      ) {
        fetch('/api/state', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': activeUser.username,
          },
          body: JSON.stringify({ state: finalState }),
        }).catch(() => {});
      }
    } catch {
      // ignore
    }

    set({
      state: finalState,
      isHydrated: true,
      lastSyncedAt: new Date().toISOString(),
    });
  },

  syncFromServer: async (silent = false) => {
    if (typeof window === 'undefined') return;

    // Prevent background polling from overwriting an in-flight or very recent user mutation
    if (
      silent &&
      (pendingSaveCount > 0 || Date.now() - lastLocalMutationAt < 8000)
    ) {
      return;
    }

    // If a previous cloud save failed while offline, retry pushing local state first
    if (hasUnsyncedLocalChanges && pendingSaveCount === 0) {
      const currentClean = sanitizeOperationalState(get().state);
      const username = get().currentUser?.username || 'Admin';
      try {
        const pushRes = await fetch('/api/state', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': username,
          },
          body: JSON.stringify({ state: currentClean }),
        });
        if (pushRes.ok) {
          hasUnsyncedLocalChanges = false;
        }
      } catch {
        // Still offline; do not overwrite local unsynced changes during silent poll
        if (silent) return;
      }
    }

    if (!silent) {
      set({ isSyncing: true });
    }
    try {
      let remoteState: AppOperationalState | null = null;

      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.state) {
            remoteState = sanitizeOperationalState(data.state);
          }
        }
      } catch {
        // Fallback to direct SupabaseProvider below
      }

      if (!remoteState) {
        const directState = await SupabaseProvider.fetchState();
        if (directState) {
          remoteState = sanitizeOperationalState(directState);
        }
      }

      // Re-check after async fetch to make sure user didn't mutate while fetch was in flight
      if (
        silent &&
        (pendingSaveCount > 0 || Date.now() - lastLocalMutationAt < 8000)
      ) {
        return;
      }

      if (remoteState) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteState));
        set({
          state: remoteState,
          lastSyncedAt: new Date().toISOString(),
          isSyncing: false,
        });
        if (!silent) {
          get().showToast(
            'Synchronized latest operational data from server.',
            'success'
          );
        }
        return;
      }

      if (!silent) {
        set({ isSyncing: false });
        get().showToast('Unable to reach server for live sync.', 'warning');
      }
    } catch {
      if (!silent) {
        set({ isSyncing: false });
        get().showToast('Network error while syncing state.', 'error');
      }
    }
  },

  persistState: (nextState: AppOperationalState) => {
    const prevState = get().state;
    const clean = sanitizeOperationalState(nextState);
    lastLocalMutationAt = Date.now();
    set({ state: clean, lastSyncedAt: new Date().toISOString() });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      } catch {
        // ignore
      }

      const username = get().currentUser?.username || 'Admin';
      pendingSaveCount += 1;

      (async () => {
        try {
          let savedToCloud = false;
          let rejectedByRbac = false;
          let errorMessage = '';

          try {
            const res = await fetch('/api/state', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'x-user-role': username,
              },
              body: JSON.stringify({ state: clean }),
            });
            if (res.ok) {
              savedToCloud = true;
            } else if (res.status >= 400 && res.status < 500) {
              // 4xx = RBAC / validation error from server -> do NOT bypass via direct Supabase fallback
              rejectedByRbac = true;
              const errData = await res.json().catch(() => ({}));
              errorMessage =
                errData?.error || 'Permission denied by server policy.';
            }
          } catch {
            // Network error -> allow direct Supabase fallback below
          }

          if (rejectedByRbac) {
            set({ state: prevState });
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(prevState));
            } catch {
              // ignore
            }
            get().showToast(errorMessage, 'error');
            return;
          }

          if (!savedToCloud) {
            savedToCloud = await SupabaseProvider.upsertState(clean);
          }

          if (savedToCloud) {
            hasUnsyncedLocalChanges = false;
          } else {
            hasUnsyncedLocalChanges = true;
            get().showToast(
              'Saved locally — cloud sync pending (will retry automatically).',
              'warning'
            );
          }
        } finally {
          pendingSaveCount = Math.max(0, pendingSaveCount - 1);
          lastLocalMutationAt = Date.now();
        }
      })();
    }
  },

  login: async (username: string, password: string) => {
    let user: UserAccount | null = null;

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.user) {
          user = data.user as UserAccount;
        }
      }
    } catch {
      // Fallback to direct SupabaseProvider call from client if API route is unreachable
    }

    if (!user) {
      user = await AuthService.authenticate(username, password);
    }

    if (!user) {
      get().showToast(
        'Invalid credentials or user not found.',
        'error'
      );
      return false;
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }

    const currentView = get().activeView;
    const nextView = user.allowedViews.includes(currentView)
      ? currentView
      : 'dashboardView';

    set({
      currentUser: user,
      activeView: nextView,
      isSwitchUserModalOpen: false,
    });
    get().showToast(
      `Welcome, ${user.displayName}. Live sync connected.`,
      'success'
    );
    return true;
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_KEY);
    }
    set({
      currentUser: null,
      activeView: 'dashboardView',
      isClientModalOpen: false,
    });
    get().showToast('You have been logged out.', 'info');
  },

  setActiveView: (view: ViewId) => {
    const user = get().currentUser;
    if (user && !user.allowedViews.includes(view)) {
      get().showToast(
        'Access restricted for your user role.',
        'warning'
      );
      return;
    }
    set({ activeView: view });
  },

  setForecastHorizonDays: (days: number) => set({ forecastHorizonDays: days }),
  setClientModalOpen: (open: boolean) => set({ isClientModalOpen: open }),
  setSwitchUserModalOpen: (open: boolean) =>
    set({ isSwitchUserModalOpen: open }),
  setQuickRobModalOpen: (open: boolean) => set({ isQuickRobModalOpen: open }),
  setBulkImportModalOpen: (open: boolean) =>
    set({ isBulkImportModalOpen: open }),

  setDispatchModal: (dispatchModal) => set({ dispatchModal }),
  setSoundingModal: (soundingModal) => set({ soundingModal }),
  setTopupModal: (topupModal) => set({ topupModal }),
  setDocPreviewModal: (docPreviewModal) => set({ docPreviewModal }),

  setForecastDispatchModal: (forecastDispatchModal) =>
    set({ forecastDispatchModal }),
  setForecastTopupModal: (forecastTopupModal) => set({ forecastTopupModal }),
  setFloatingChooserModal: (floatingChooserModal) =>
    set({ floatingChooserModal }),
  setRecordManageModal: (recordManageModal) => set({ recordManageModal }),

  showToast: (message, type = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 3500);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  openConfirm: (title, message, onConfirm, confirmLabel = 'Confirm') => {
    set({
      confirmDialog: {
        isOpen: true,
        title,
        message,
        confirmLabel,
        onConfirm,
      },
    });
  },

  closeConfirm: () => {
    set({
      confirmDialog: {
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
      },
    });
  },

  // --- CLIENT MASTER DATA CRUD (UNLIMITED CLIENTS) ---
  addClient: (name: string, colorHex?: string) => {
    const user = get().currentUser;
    if (
      !user ||
      (!user.canManageClients &&
        !user.canEdit &&
        !user.canEditForecast &&
        !user.canEditOperations)
    ) {
      get().showToast(
        'Edit or Administrator privileges are required to add clients.',
        'error'
      );
      return null;
    }

    try {
      const {
        state: nextState,
        client,
        addedClients,
      } = ClientService.addClient(get().state, name, colorHex);
      get().persistState(nextState);
      if (addedClients.length > 1) {
        get().showToast(
          `Added ${addedClients.length} clients (${addedClients
            .map((c) => c.name)
            .join(', ')}).`,
          'success'
        );
      } else {
        get().showToast(
          `Client "${client.name}" added successfully.`,
          'success'
        );
      }
      return client;
    } catch (err: any) {
      get().showToast(err?.message || 'Failed to add client.', 'error');
      return null;
    }
  },

  updateClient: (id: string, name: string, colorHex?: string) => {
    const user = get().currentUser;
    if (
      !user ||
      (!user.canManageClients &&
        !user.canEdit &&
        !user.canEditForecast &&
        !user.canEditOperations)
    ) {
      get().showToast(
        'Edit or Administrator privileges are required to edit clients.',
        'error'
      );
      return null;
    }

    try {
      const { state: nextState, client } = ClientService.updateClient(
        get().state,
        id,
        name,
        colorHex
      );
      get().persistState(nextState);
      get().showToast(
        `Client updated to "${client.name}" across all modules.`,
        'success'
      );
      return client;
    } catch (err: any) {
      get().showToast(err?.message || 'Failed to update client.', 'error');
      return null;
    }
  },

  deleteClient: (id: string) => {
    const user = get().currentUser;
    if (
      !user ||
      (!user.canManageClients &&
        !user.canDelete &&
        !user.canDeleteForecast &&
        !user.canDeleteOperations)
    ) {
      get().showToast(
        'Delete or Administrator privileges are required to delete clients.',
        'error'
      );
      return;
    }

    try {
      const { state: nextState, deletedClient } = ClientService.deleteClient(
        get().state,
        id
      );
      get().persistState(nextState);
      get().showToast(
        `Client "${deletedClient.name}" has been deleted.`,
        'info'
      );
    } catch (err: any) {
      get().showToast(err?.message || 'Failed to delete client.', 'error');
    }
  },

  // --- OPERATIONAL CRUD ---
  saveBunkering: (payload) => {
    const user = get().currentUser;
    if (!user || !user.canEditOperations) {
      get().showToast('Permission denied: Operations Edit access required.', 'error');
      return;
    }
    try {
      let workingState = get().state;
      // Automatically register client if a new contractor name was provided
      if (
        payload.contractor &&
        !workingState.clients.some(
          (c) => c.name.toLowerCase() === payload.contractor.trim().toLowerCase()
        )
      ) {
        try {
          workingState = ClientService.addClient(
            workingState,
            payload.contractor.trim()
          ).state;
        } catch {
          // ignore if already exists
        }
      }
      const nextState = InventoryService.saveBunkering(workingState, payload);
      get().persistState(nextState);
      get().showToast(
        payload.id
          ? 'Bunkering dispatch record updated.'
          : 'Bunker dispatch record saved successfully.',
        'success'
      );
    } catch (err: any) {
      get().showToast(err?.message || 'Failed to save dispatch.', 'error');
    }
  },

  deleteBunkering: (id) => {
    const user = get().currentUser;
    if (!user || !user.canDeleteOperations) {
      get().showToast('Permission denied: Operations Delete access required.', 'error');
      return;
    }
    const nextState = InventoryService.deleteBunkering(get().state, id);
    get().persistState(nextState);
    get().showToast('Bunkering dispatch deleted.', 'info');
  },

  bulkImportBunkerings: (items) => {
    const user = get().currentUser;
    if (!user || !user.canEditOperations) {
      get().showToast('Permission denied: Operations Edit access required.', 'error');
      return;
    }
    let workingState = get().state;

    // Auto-register any new client names found in the imported Excel rows (unlimited clients)
    const importedClientNames = Array.from(
      new Set(
        items
          .map((item) => (item.contractor || '').trim().toUpperCase())
          .filter((name) => name && name !== 'UNASSIGNED')
      )
    );
    for (const cName of importedClientNames) {
      if (
        !workingState.clients.some(
          (c) => c.name.toLowerCase() === cName.toLowerCase()
        )
      ) {
        try {
          workingState = ClientService.addClient(workingState, cName).state;
        } catch {
          // ignore
        }
      }
    }

    const newRecords: BunkeringRecord[] = items.map((item, idx) => ({
      ...item,
      contractor: (item.contractor || '').trim().toUpperCase(),
      id: `bnk_imp_${Date.now()}_${idx}`,
    }));
    const nextState: AppOperationalState = {
      ...workingState,
      bunkerings: [...newRecords, ...workingState.bunkerings],
    };
    get().persistState(nextState);
    get().showToast(
      `Imported ${newRecords.length} bunkering dispatch records.`,
      'success'
    );
  },

  saveSounding: (payload) => {
    const user = get().currentUser;
    if (!user || !user.canEditOperations) {
      get().showToast('Permission denied: Operations Edit access required.', 'error');
      return;
    }
    const nextState = InventoryService.saveSounding(get().state, payload);
    get().persistState(nextState);
    get().showToast(
      payload.id
        ? 'Physical sounding record updated.'
        : 'Physical tank sounding recorded successfully.',
      'success'
    );
  },

  deleteSounding: (id) => {
    const user = get().currentUser;
    if (!user || !user.canDeleteOperations) {
      get().showToast('Permission denied: Operations Delete access required.', 'error');
      return;
    }
    const nextState = InventoryService.deleteSounding(get().state, id);
    get().persistState(nextState);
    get().showToast('Sounding record deleted.', 'info');
  },

  saveTopup: (payload) => {
    const user = get().currentUser;
    if (!user || !user.canEditOperations) {
      get().showToast('Permission denied: Operations Edit access required.', 'error');
      return;
    }
    try {
      const nextState = InventoryService.saveTopup(get().state, payload);
      get().persistState(nextState);
      get().showToast(
        payload.status === 'Completed'
          ? `Cargo received! +${formatNumber(payload.volume)} L credited to Book ROB.`
          : payload.id
          ? 'Inbound cargo top-up voyage updated.'
          : 'Inbound cargo top-up voyage added.',
        'success'
      );
    } catch (err: any) {
      get().showToast(err?.message || 'Failed to save cargo top-up.', 'error');
    }
  },

  receiveTopup: (id) => {
    const user = get().currentUser;
    if (!user || !user.canEditOperations) {
      get().showToast('Permission denied: Operations Edit access required.', 'error');
      return;
    }
    const target = get().state.topups.find((t) => t.id === id);
    const nextState = InventoryService.receiveTopup(get().state, id);
    get().persistState(nextState);
    get().showToast(
      `Cargo received! +${formatNumber(target?.volume || 0)} L credited to Book ROB.`,
      'success'
    );
  },

  deleteTopup: (id) => {
    const user = get().currentUser;
    if (!user || !user.canDeleteOperations) {
      get().showToast('Permission denied: Operations Delete access required.', 'error');
      return;
    }
    const nextState = InventoryService.deleteTopup(get().state, id);
    get().persistState(nextState);
    get().showToast('Cargo top-up voyage deleted.', 'info');
  },

  saveForecastDispatch: (payload) => {
    const user = get().currentUser;
    if (!user || !user.canEditForecast) {
      get().showToast('Permission denied: Forecast Edit access required.', 'error');
      return;
    }
    let workingState = get().state;
    if (
      payload.client &&
      !workingState.clients.some(
        (c) => c.name.toLowerCase() === payload.client.trim().toLowerCase()
      )
    ) {
      try {
        workingState = ClientService.addClient(
          workingState,
          payload.client.trim()
        ).state;
      } catch {
        // ignore
      }
    }
    const nextState = InventoryService.saveForecastDispatch(
      workingState,
      payload
    );
    get().persistState(nextState);
    get().showToast(
      payload.id
        ? 'Forecast distribution updated.'
        : 'Distribution plan saved successfully.',
      'success'
    );
  },

  deleteForecastDispatch: (id) => {
    const user = get().currentUser;
    if (!user || !user.canDeleteForecast) {
      get().showToast('Permission denied: Forecast Delete access required.', 'error');
      return;
    }
    const nextState = InventoryService.deleteForecastDispatch(get().state, id);
    get().persistState(nextState);
    get().showToast('Forecast distribution removed.', 'info');
  },

  saveForecastTopup: (payload) => {
    const user = get().currentUser;
    if (!user || !user.canEditForecast) {
      get().showToast('Permission denied: Forecast Edit access required.', 'error');
      return;
    }
    const nextState = InventoryService.saveForecastTopup(get().state, payload);
    get().persistState(nextState);
    get().showToast(
      payload.id
        ? 'Forecast top-up plan updated.'
        : 'Top-Up plan saved successfully.',
      'success'
    );
  },

  deleteForecastTopup: (id) => {
    const user = get().currentUser;
    if (!user || !user.canDeleteForecast) {
      get().showToast('Permission denied: Forecast Delete access required.', 'error');
      return;
    }
    const nextState = InventoryService.deleteForecastTopup(get().state, id);
    get().persistState(nextState);
    get().showToast('Forecast top-up plan removed.', 'info');
  },

  executeForecastDispatch: (id) => {
    const user = get().currentUser;
    if (!user || (!user.canEditForecast && !user.canEditOperations)) return;
    const { state: nextState, executed } =
      InventoryService.executeForecastDispatch(get().state, id);
    if (!executed) return;
    get().persistState(nextState);
    get().showToast(
      `Executed forecast dispatch for ${executed.vesselName} (-${formatNumber(
        executed.volume
      )} L) into actual Bunker Dispatch Log.`,
      'success'
    );
  },

  executeForecastTopup: (id) => {
    const user = get().currentUser;
    if (!user || (!user.canEditForecast && !user.canEditOperations)) return;
    const { state: nextState, executed } =
      InventoryService.executeForecastTopup(get().state, id);
    if (!executed) return;
    get().persistState(nextState);
    get().showToast(
      `Executed forecast top-up from ${executed.vessel} into actual storage inventory.`,
      'success'
    );
  },

  setShoreTankDailyRob: (dateIso, robLiters) => {
    const user = get().currentUser;
    if (!user || !user.canEditForecast) return;
    const nextState = InventoryService.setShoreTankDailyRob(
      get().state,
      dateIso,
      robLiters
    );
    get().persistState(nextState);
    get().showToast(
      robLiters === null
        ? `Reset Shore Tank ROB on ${dateIso} to automatic carry-over.`
        : `Updated Shore Tank ROB on ${dateIso} to ${formatNumber(
            robLiters
          )} L.`,
      'success'
    );
  },

  updateStorageConfig: (updates) => {
    const user = get().currentUser;
    if (
      !user ||
      (!user.canManageStorage &&
        !user.canEdit &&
        !user.canEditForecast &&
        !user.canEditOperations)
    ) {
      return;
    }
    const nextState = InventoryService.updateStorageConfig(
      get().state,
      updates
    );
    get().persistState(nextState);
    get().showToast(
      'Storage configuration updated successfully.',
      'success'
    );
  },

  updateFuelPrice: (updates) => {
    const user = get().currentUser;
    if (!user || user.roleCode !== 'admin') {
      get().showToast(
        'Permission denied: Only Administrator can update the fuel benchmark price.',
        'error'
      );
      return;
    }
    const currentPrice = get().state.fuelPrice || {
      id: 'current',
      pricePerLiter: 0,
      currency: 'IDR',
      fuelType: 'Biofuel B50',
      effectiveDate: '',
      notes: '',
      updatedBy: '',
      updatedAt: '',
    };
    const nextFuelPrice: FuelPriceRecord = {
      ...currentPrice,
      ...updates,
      pricePerLiter: Math.max(
        0,
        Number(updates.pricePerLiter ?? currentPrice.pricePerLiter) || 0
      ),
      currency: updates.currency || currentPrice.currency || 'IDR',
      fuelType: updates.fuelType || currentPrice.fuelType || 'Biofuel B50',
      effectiveDate: updates.effectiveDate ?? currentPrice.effectiveDate ?? '',
      notes: updates.notes !== undefined ? updates.notes : currentPrice.notes,
      updatedBy: user.displayName || user.username || 'Admin',
      updatedAt: new Date().toISOString(),
    };
    const nextState: AppOperationalState = {
      ...get().state,
      fuelPrice: nextFuelPrice,
    };
    get().persistState(nextState);
    get().showToast('Fuel benchmark price updated successfully.', 'success');
  },

  restoreFullState: (rawState) => {
    if (!get().currentUser?.canManageStorage) return;
    const clean = sanitizeOperationalState(rawState);
    get().persistState(clean);
    get().showToast('Database state restored successfully.', 'success');
  },

  resetAllData: () => {
    if (!get().currentUser?.canManageStorage) return;
    const clean = createCleanInitialState();
    get().persistState(clean);
    get().showToast(
      'All records cleared. System reset to clean starting baseline.',
      'info'
    );
  },
}));
