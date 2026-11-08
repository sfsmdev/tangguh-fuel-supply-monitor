import { AppOperationalState } from '../models/Inventory';
import { UserAccount, ViewId } from '../models/User';
import { sanitizeOperationalState } from './seed';

export interface SupabaseConfig {
  url: string;
  key: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  )
    .trim()
    .replace(/\/+$/, '');

  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    ''
  ).trim();

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

function buildSupabaseHeaders(
  key: string,
  extraHeaders: Record<string, string> = {}
): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: key,
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  if (key.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

function normalizeUserAccount(raw: any): UserAccount | null {
  if (!raw || typeof raw !== 'object' || !raw.username) {
    return null;
  }

  const allowedViews: ViewId[] = Array.isArray(raw.allowedViews)
    ? raw.allowedViews
    : Array.isArray(raw.allowed_views)
    ? raw.allowed_views
    : ['dashboardView'];

  const roleCode = raw.roleCode || raw.role_code || undefined;
  const canEditRaw = Boolean(raw.canEdit ?? raw.can_edit);
  const canDeleteRaw = Boolean(raw.canDelete ?? raw.can_delete);

  // Granular permissions: Forecast vs Operations
  const canEditForecast = Boolean(
    raw.canEditForecast ??
      raw.can_edit_forecast ??
      (roleCode === 'admin' || roleCode === 'planner')
  );
  const canDeleteForecast = Boolean(
    raw.canDeleteForecast ??
      raw.can_delete_forecast ??
      (roleCode === 'admin' || roleCode === 'planner')
  );
  const canEditOperations = Boolean(
    raw.canEditOperations ??
      raw.can_edit_operations ??
      (roleCode === 'admin' || roleCode === 'fuel_coordinator' || roleCode === 'staff')
  );
  const canDeleteOperations = Boolean(
    raw.canDeleteOperations ??
      raw.can_delete_operations ??
      (roleCode === 'admin' || roleCode === 'fuel_coordinator')
  );

  return {
    username: String(raw.username),
    entityName: raw.entityName || raw.entity_name || undefined,
    displayName: String(raw.displayName || raw.display_name || raw.username),
    roleLabel: String(raw.roleLabel || raw.role_label || 'Authorized User'),
    roleCode,
    canEdit: canEditRaw || canEditForecast || canEditOperations,
    canDelete: canDeleteRaw || canDeleteForecast || canDeleteOperations,
    canManageStorage: Boolean(raw.canManageStorage ?? raw.can_manage_storage),
    canManageClients: Boolean(raw.canManageClients ?? raw.can_manage_clients),
    canEditForecast,
    canDeleteForecast,
    canEditOperations,
    canDeleteOperations,
    allowedViews,
  };
}

function countTotalRecords(s: AppOperationalState | null): number {
  if (!s) return 0;
  return (
    (s.clients?.length || 0) +
    (s.bunkerings?.length || 0) +
    (s.soundings?.length || 0) +
    (s.topups?.length || 0) +
    (s.forecastDispatches?.length || 0) +
    (s.forecastTopups?.length || 0)
  );
}

/**
 * Direct REST synchronization for all relational tables using safe WHERE clauses
 * (`?id=not.is.null`) so PostgreSQL `pg_safeupdate` never blocks table updates.
 */
async function syncRelationalTablesRest(
  cfg: SupabaseConfig,
  state: AppOperationalState
): Promise<boolean> {
  const headers = buildSupabaseHeaders(cfg.key, {
    Prefer: 'resolution=merge-duplicates,return=minimal',
  });
  const deleteHeaders = buildSupabaseHeaders(cfg.key);

  try {
    // 1. Upsert storage_configs
    const sc = state.storageConfig;
    await fetch(`${cfg.url}/rest/v1/storage_configs?on_conflict=id`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: 'default',
        vessel_name: sc.vesselName || 'SPOB TRANS BILGIT',
        total_capacity: Number(sc.totalCapacity) || 5000000,
        deadstock: Number(sc.deadstock) || 0,
        initial_opening_rob: Number(sc.initialOpeningRob) || 0,
        shore_tank_name: sc.shoreTankName || 'SHORE TANK COMBO',
        shore_tank_initial_rob: Number(sc.shoreTankInitialRob) || 0,
        updated_at: new Date().toISOString(),
      }),
      cache: 'no-store',
    });

    // 2. Sync clients
    await fetch(`${cfg.url}/rest/v1/clients?id=not.is.null`, {
      method: 'DELETE',
      headers: deleteHeaders,
      cache: 'no-store',
    });
    if (Array.isArray(state.clients) && state.clients.length > 0) {
      await fetch(`${cfg.url}/rest/v1/clients?on_conflict=id`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          state.clients.map((c) => ({
            id: c.id,
            name: c.name.trim().toUpperCase(),
            color: c.color || '#0284C7',
            badge_class:
              c.badgeClass || 'bg-sky-50 text-sky-700 border-sky-200',
            dot_class: c.dotClass || 'bg-sky-500',
            updated_at: new Date().toISOString(),
          }))
        ),
        cache: 'no-store',
      });
    }

    // 3. Sync bunkerings
    await fetch(`${cfg.url}/rest/v1/bunkerings?id=not.is.null`, {
      method: 'DELETE',
      headers: deleteHeaders,
      cache: 'no-store',
    });
    if (Array.isArray(state.bunkerings) && state.bunkerings.length > 0) {
      await fetch(`${cfg.url}/rest/v1/bunkerings?on_conflict=id`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          state.bunkerings.map((b) => ({
            id: b.id,
            date: b.date,
            contractor: b.contractor,
            vessel_name: b.vesselName,
            volume: Number(b.volume) || 0,
            start_time: b.startTime || '08:00',
            end_time: b.endTime || '10:00',
            flow_rate: Number(b.flowRate) || 0,
          }))
        ),
        cache: 'no-store',
      });
    }

    // 4. Sync soundings
    await fetch(`${cfg.url}/rest/v1/soundings?id=not.is.null`, {
      method: 'DELETE',
      headers: deleteHeaders,
      cache: 'no-store',
    });
    if (Array.isArray(state.soundings) && state.soundings.length > 0) {
      await fetch(`${cfg.url}/rest/v1/soundings?on_conflict=id`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          state.soundings.map((s) => ({
            id: s.id,
            date: s.date,
            time: s.time || '08:00',
            liters: Number(s.liters) || 0,
            draft_fwd:
              s.draftFwd !== null && s.draftFwd !== undefined
                ? Number(s.draftFwd)
                : null,
            draft_aft:
              s.draftAft !== null && s.draftAft !== undefined
                ? Number(s.draftAft)
                : null,
            remarks: s.remarks || '',
            doc_name: s.docName || null,
            doc_data_url: s.docDataUrl || null,
          }))
        ),
        cache: 'no-store',
      });
    }

    // 5. Sync topups
    await fetch(`${cfg.url}/rest/v1/topups?id=not.is.null`, {
      method: 'DELETE',
      headers: deleteHeaders,
      cache: 'no-store',
    });
    if (Array.isArray(state.topups) && state.topups.length > 0) {
      await fetch(`${cfg.url}/rest/v1/topups?on_conflict=id`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          state.topups.map((t) => ({
            id: t.id,
            vessel: t.vessel,
            volume: Number(t.volume) || 0,
            load_port: t.loadPort || 'Balikpapan',
            disch_port: t.dischPort || 'Tangguh Offshore',
            etd: t.etd || '',
            eta: t.eta || '',
            atd: t.atd || '',
            ata: t.ata || '',
            status: t.status || 'Planned',
          }))
        ),
        cache: 'no-store',
      });
    }

    // 6. Sync forecast_dispatches
    await fetch(`${cfg.url}/rest/v1/forecast_dispatches?id=not.is.null`, {
      method: 'DELETE',
      headers: deleteHeaders,
      cache: 'no-store',
    });
    if (
      Array.isArray(state.forecastDispatches) &&
      state.forecastDispatches.length > 0
    ) {
      await fetch(`${cfg.url}/rest/v1/forecast_dispatches?on_conflict=id`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          state.forecastDispatches.map((fd) => ({
            id: fd.id,
            date: fd.date,
            client: fd.client,
            vessel: fd.vessel,
            volume: Number(fd.volume) || 0,
          }))
        ),
        cache: 'no-store',
      });
    }

    // 7. Sync forecast_topups
    await fetch(`${cfg.url}/rest/v1/forecast_topups?id=not.is.null`, {
      method: 'DELETE',
      headers: deleteHeaders,
      cache: 'no-store',
    });
    if (
      Array.isArray(state.forecastTopups) &&
      state.forecastTopups.length > 0
    ) {
      await fetch(`${cfg.url}/rest/v1/forecast_topups?on_conflict=id`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          state.forecastTopups.map((ft) => ({
            id: ft.id,
            date: ft.date,
            vessel: ft.vessel,
            floating_volume: Number(ft.floatingVolume) || 0,
            shore_volume: Number(ft.shoreVolume) || 0,
          }))
        ),
        cache: 'no-store',
      });
    }

    return true;
  } catch {
    return false;
  }
}

export class SupabaseProvider {
  static isConfigured(): boolean {
    return getSupabaseConfig() !== null;
  }

  /**
   * Authenticate a user directly against Supabase `public.authenticate_app_user` RPC
   * (`public.app_users` JOIN `public.rbac_roles`).
   */
  static async authenticateUser(
    usernameInput: string,
    passwordInput: string
  ): Promise<UserAccount | null> {
    const cfg = getSupabaseConfig();
    if (!cfg) return null;

    try {
      const endpoint = `${cfg.url}/rest/v1/rpc/authenticate_app_user`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: buildSupabaseHeaders(cfg.key),
        body: JSON.stringify({
          p_username: (usernameInput || '').trim(),
          p_password: (passwordInput || '').trim(),
        }),
        cache: 'no-store',
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return normalizeUserAccount(data);
    } catch {
      return null;
    }
  }

  /**
   * Retrieve an active user's profile and RBAC permissions from Supabase
   * via `public.get_app_user_profile` RPC.
   */
  static async getUserProfile(
    usernameInput: string
  ): Promise<UserAccount | null> {
    const cfg = getSupabaseConfig();
    if (!cfg) return null;

    try {
      const endpoint = `${cfg.url}/rest/v1/rpc/get_app_user_profile`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: buildSupabaseHeaders(cfg.key),
        body: JSON.stringify({
          p_username: (usernameInput || '').trim(),
        }),
        cache: 'no-store',
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return normalizeUserAccount(data);
    } catch {
      return null;
    }
  }

  /**
   * Fetch current operational state from Supabase relational tables and
   * `public.operational_state`, reconciling any unsynced snapshot records.
   */
  static async fetchState(): Promise<AppOperationalState | null> {
    const cfg = getSupabaseConfig();
    if (!cfg) return null;

    let rpcState: AppOperationalState | null = null;
    let snapState: AppOperationalState | null = null;

    const [rpcResult, snapResult] = await Promise.allSettled([
      fetch(`${cfg.url}/rest/v1/rpc/get_full_operational_state`, {
        method: 'POST',
        headers: buildSupabaseHeaders(cfg.key),
        body: JSON.stringify({}),
        cache: 'no-store',
      }),
      fetch(
        `${cfg.url}/rest/v1/operational_state?id=eq.current&select=payload,updated_at`,
        {
          method: 'GET',
          headers: buildSupabaseHeaders(cfg.key),
          cache: 'no-store',
        }
      ),
    ]);

    if (rpcResult.status === 'fulfilled' && rpcResult.value.ok) {
      try {
        const rpcData = await rpcResult.value.json();
        if (rpcData && typeof rpcData === 'object' && rpcData.storageConfig) {
          rpcState = sanitizeOperationalState(rpcData);
        }
      } catch {
        // ignore
      }
    }

    if (snapResult.status === 'fulfilled' && snapResult.value.ok) {
      try {
        const rows = await snapResult.value.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0]?.payload) {
          snapState = sanitizeOperationalState(rows[0].payload);
        }
      } catch {
        // ignore
      }
    }

    if (rpcState && snapState) {
      // Preserve shoreTankDailyRobs from operational_state snapshot
      rpcState.shoreTankDailyRobs = {
        ...(snapState.shoreTankDailyRobs || {}),
        ...(rpcState.shoreTankDailyRobs || {}),
      };

      // If operational_state snapshot has data that relational tables missed
      // (e.g. due to prior pg_safeupdate RPC error), heal relational tables and return snapshot
      if (countTotalRecords(snapState) > 0 && countTotalRecords(rpcState) === 0) {
        void syncRelationalTablesRest(cfg, snapState);
        return snapState;
      }

      return rpcState;
    }

    if (snapState) {
      void syncRelationalTablesRest(cfg, snapState);
      return snapState;
    }

    return rpcState;
  }

  /**
   * Synchronize operational state into `operational_state` AND all relational tables
   * (`storage_configs`, `clients`, `bunkerings`, `soundings`, `topups`,
   * `forecast_dispatches`, `forecast_topups`).
   */
  static async upsertState(state: AppOperationalState): Promise<boolean> {
    const cfg = getSupabaseConfig();
    if (!cfg) return false;

    const cleanState = sanitizeOperationalState(state);
    let snapshotSaved = false;
    let relationalSaved = false;

    // 1. Always save authoritative JSONB snapshot to operational_state
    try {
      const endpoint = `${cfg.url}/rest/v1/operational_state?on_conflict=id`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: buildSupabaseHeaders(cfg.key, {
          Prefer: 'resolution=merge-duplicates,return=minimal',
        }),
        body: JSON.stringify({
          id: 'current',
          payload: cleanState,
          updated_at: new Date().toISOString(),
        }),
        cache: 'no-store',
      });
      snapshotSaved = res.ok;
    } catch {
      // ignore
    }

    // 2. Try RPC sync_full_operational_state
    try {
      const rpcEndpoint = `${cfg.url}/rest/v1/rpc/sync_full_operational_state`;
      const rpcRes = await fetch(rpcEndpoint, {
        method: 'POST',
        headers: buildSupabaseHeaders(cfg.key),
        body: JSON.stringify({ p_state: cleanState }),
        cache: 'no-store',
      });
      relationalSaved = rpcRes.ok;
    } catch {
      relationalSaved = false;
    }

    // 3. If RPC failed (e.g. pg_safeupdate on unqualified DELETE), sync relational tables directly via REST
    if (!relationalSaved) {
      relationalSaved = await syncRelationalTablesRest(cfg, cleanState);
    }

    return snapshotSaved || relationalSaved;
  }
}
