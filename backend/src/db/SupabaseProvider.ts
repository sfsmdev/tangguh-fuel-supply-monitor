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

const toUpperName = (n: unknown): string =>
  String(n || '').trim().replace(/\s+/g, ' ').toUpperCase();

interface TableSyncSpec {
  table: string;
  rows: Record<string, unknown>[];
}

/**
 * Upsert rows into a table, then prune ids that no longer exist in the state.
 * Never empties a table mid-sync (no delete-all), and every request is checked.
 * Filters always carry a WHERE clause, so `pg_safeupdate` never blocks them.
 */
async function syncTable(
  cfg: SupabaseConfig,
  spec: TableSyncSpec
): Promise<boolean> {
  const upsertHeaders = buildSupabaseHeaders(cfg.key, {
    Prefer: 'resolution=merge-duplicates,return=minimal',
  });
  const plainHeaders = buildSupabaseHeaders(cfg.key, {
    Prefer: 'return=minimal',
  });

  if (spec.rows.length > 0) {
    const upRes = await fetch(
      `${cfg.url}/rest/v1/${spec.table}?on_conflict=id`,
      {
        method: 'POST',
        headers: upsertHeaders,
        body: JSON.stringify(spec.rows),
        cache: 'no-store',
      }
    );
    if (!upRes.ok) {
      const detail = await upRes.text().catch(() => '');
      console.error(`[SupabaseProvider] upsert ${spec.table} failed:`, detail);
      return false;
    }
  }

  const ids = spec.rows.map((r) => String(r.id));
  const filter =
    ids.length > 0
      ? `id=not.in.(${ids
          .map((id) => `"${id.replace(/"/g, '\\"')}"`)
          .join(',')})`
      : 'id=not.is.null';
  const delRes = await fetch(`${cfg.url}/rest/v1/${spec.table}?${filter}`, {
    method: 'DELETE',
    headers: plainHeaders,
    cache: 'no-store',
  });
  if (!delRes.ok) {
    const detail = await delRes.text().catch(() => '');
    console.error(`[SupabaseProvider] prune ${spec.table} failed:`, detail);
    return false;
  }
  return true;
}

/**
 * Mirror the authoritative snapshot into all relational reporting tables
 * (`storage_configs`, `clients`, `bunkerings`, `soundings`, `topups`,
 * `forecast_dispatches`, `forecast_topups`). Returns false if any table failed.
 */
async function syncRelationalTablesRest(
  cfg: SupabaseConfig,
  state: AppOperationalState
): Promise<boolean> {
  try {
    const sc = state.storageConfig;
    const cfgRes = await fetch(
      `${cfg.url}/rest/v1/storage_configs?on_conflict=id`,
      {
        method: 'POST',
        headers: buildSupabaseHeaders(cfg.key, {
          Prefer: 'resolution=merge-duplicates,return=minimal',
        }),
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
      }
    );
    let allOk = cfgRes.ok;

    const nowMs = Date.now();
    const specs: TableSyncSpec[] = [
      {
        table: 'clients',
        rows: (state.clients || []).map((c) => ({
          id: c.id,
          name: toUpperName(c.name),
          color: c.color || '#0284C7',
          badge_class: c.badgeClass || 'bg-sky-50 text-sky-700 border-sky-200',
          dot_class: c.dotClass || 'bg-sky-500',
          updated_at: new Date().toISOString(),
        })),
      },
      {
        table: 'bunkerings',
        rows: (state.bunkerings || []).map((b) => ({
          id: b.id,
          date: b.date || '',
          contractor: toUpperName(b.contractor),
          vessel_name: b.vesselName || '',
          volume: Math.max(0, Number(b.volume) || 0),
          start_time: b.startTime || '08:00',
          end_time: b.endTime || '10:00',
          flow_rate: Number(b.flowRate) || 0,
        })),
      },
      {
        table: 'soundings',
        rows: (state.soundings || []).map((s) => ({
          id: s.id,
          date: s.date || '',
          time: s.time || '08:00',
          liters: Math.max(0, Number(s.liters) || 0),
          draft_fwd:
            s.draftFwd !== null && s.draftFwd !== undefined && String(s.draftFwd) !== ''
              ? Number(s.draftFwd)
              : null,
          draft_aft:
            s.draftAft !== null && s.draftAft !== undefined && String(s.draftAft) !== ''
              ? Number(s.draftAft)
              : null,
          remarks: s.remarks || '',
          doc_name: s.docName || null,
          doc_data_url: s.docDataUrl || null,
        })),
      },
      {
        table: 'topups',
        // created_at preserves list order (newest first) for relational reporting
        rows: (state.topups || []).map((t, idx) => ({
          id: t.id,
          vessel: t.vessel || '',
          volume: Math.max(0, Number(t.volume) || 0),
          load_port: t.loadPort || 'Balikpapan',
          disch_port: t.dischPort || 'Tangguh Offshore',
          etd: t.etd || '',
          eta: t.eta || '',
          atd: t.atd || '',
          ata: t.ata || '',
          status: t.status || 'Planned',
          created_at: new Date(nowMs - idx * 1000).toISOString(),
        })),
      },
      {
        table: 'forecast_dispatches',
        rows: (state.forecastDispatches || []).map((fd) => ({
          id: fd.id,
          date: fd.date || '',
          client: toUpperName(fd.client),
          vessel: fd.vessel || '',
          volume: Math.max(0, Number(fd.volume) || 0),
        })),
      },
      {
        table: 'forecast_topups',
        rows: (state.forecastTopups || []).map((ft) => ({
          id: ft.id,
          date: ft.date || '',
          vessel: ft.vessel || '',
          floating_volume: Math.max(0, Number(ft.floatingVolume) || 0),
          shore_volume: Math.max(0, Number(ft.shoreVolume) || 0),
        })),
      },
    ];

    for (const spec of specs) {
      const ok = await syncTable(cfg, spec);
      allOk = allOk && ok;
    }
    return allOk;
  } catch (err) {
    console.error('[SupabaseProvider] relational sync error:', err);
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
   * Fetch current operational state. `public.operational_state` is the single
   * source of truth (written first on every save); the relational RPC is only a
   * fallback when no snapshot exists yet.
   */
  static async fetchState(): Promise<AppOperationalState | null> {
    const cfg = getSupabaseConfig();
    if (!cfg) return null;

    // 1. Authoritative snapshot
    try {
      const res = await fetch(
        `${cfg.url}/rest/v1/operational_state?id=eq.current&select=payload`,
        {
          method: 'GET',
          headers: buildSupabaseHeaders(cfg.key),
          cache: 'no-store',
        }
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0]?.payload) {
          return sanitizeOperationalState(rows[0].payload);
        }
      }
    } catch {
      // fall through to relational RPC
    }

    // 2. Fallback: assemble from relational tables
    try {
      const rpcRes = await fetch(
        `${cfg.url}/rest/v1/rpc/get_full_operational_state`,
        {
          method: 'POST',
          headers: buildSupabaseHeaders(cfg.key),
          body: JSON.stringify({}),
          cache: 'no-store',
        }
      );
      if (rpcRes.ok) {
        const rpcData = await rpcRes.json();
        if (rpcData && typeof rpcData === 'object' && rpcData.storageConfig) {
          return sanitizeOperationalState(rpcData);
        }
      }
    } catch {
      // ignore
    }

    return null;
  }

  /**
   * Persist state: (1) authoritative snapshot in `operational_state`,
   * (2) mirror into relational tables via RPC, falling back to checked REST sync.
   * Returns true only if the snapshot was saved.
   */
  static async upsertState(state: AppOperationalState): Promise<boolean> {
    const cfg = getSupabaseConfig();
    if (!cfg) return false;

    const cleanState = sanitizeOperationalState(state);

    let snapshotSaved = false;
    try {
      const res = await fetch(
        `${cfg.url}/rest/v1/operational_state?on_conflict=id`,
        {
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
        }
      );
      snapshotSaved = res.ok;
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        console.error('[SupabaseProvider] snapshot save failed:', detail);
      }
    } catch (err) {
      console.error('[SupabaseProvider] snapshot save error:', err);
    }

    if (!snapshotSaved) {
      return false;
    }

    let relationalSaved = false;
    try {
      const rpcRes = await fetch(
        `${cfg.url}/rest/v1/rpc/sync_full_operational_state`,
        {
          method: 'POST',
          headers: buildSupabaseHeaders(cfg.key),
          body: JSON.stringify({ p_state: cleanState }),
          cache: 'no-store',
        }
      );
      relationalSaved = rpcRes.ok;
    } catch {
      relationalSaved = false;
    }

    if (!relationalSaved) {
      relationalSaved = await syncRelationalTablesRest(cfg, cleanState);
      if (!relationalSaved) {
        console.error(
          '[SupabaseProvider] relational mirror sync incomplete; snapshot is authoritative.'
        );
      }
    }

    return true;
  }
}
