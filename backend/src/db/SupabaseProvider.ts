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

  return {
    username: String(raw.username),
    entityName: raw.entityName || raw.entity_name || undefined,
    displayName: String(raw.displayName || raw.display_name || raw.username),
    roleLabel: String(raw.roleLabel || raw.role_label || 'Authorized User'),
    roleCode: raw.roleCode || raw.role_code || undefined,
    canEdit: Boolean(raw.canEdit ?? raw.can_edit),
    canDelete: Boolean(raw.canDelete ?? raw.can_delete),
    canManageStorage: Boolean(raw.canManageStorage ?? raw.can_manage_storage),
    canManageClients: Boolean(raw.canManageClients ?? raw.can_manage_clients),
    allowedViews,
  };
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
   * Fetch current operational state from Supabase relational tables via
   * `public.get_full_operational_state` RPC (with fallback to `public.operational_state`).
   */
  static async fetchState(): Promise<AppOperationalState | null> {
    const cfg = getSupabaseConfig();
    if (!cfg) return null;

    // 1. Try Relational State RPC first
    try {
      const rpcEndpoint = `${cfg.url}/rest/v1/rpc/get_full_operational_state`;
      const rpcRes = await fetch(rpcEndpoint, {
        method: 'POST',
        headers: buildSupabaseHeaders(cfg.key),
        body: JSON.stringify({}),
        cache: 'no-store',
      });

      if (rpcRes.ok) {
        const rpcData = await rpcRes.json();
        if (rpcData && typeof rpcData === 'object' && rpcData.storageConfig) {
          return sanitizeOperationalState(rpcData);
        }
      }
    } catch {
      // Fallback to operational_state table below
    }

    // 2. Fallback to operational_state snapshot table
    try {
      const endpoint = `${cfg.url}/rest/v1/operational_state?id=eq.current&select=payload`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: buildSupabaseHeaders(cfg.key),
        cache: 'no-store',
      });

      if (!res.ok) {
        return null;
      }

      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0]?.payload) {
        return sanitizeOperationalState(rows[0].payload);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Synchronize operational state into all relational tables (`storage_configs`,
   * `clients`, `bunkerings`, `soundings`, `topups`, `forecast_dispatches`, `forecast_topups`)
   * and `operational_state` via `public.sync_full_operational_state` RPC.
   */
  static async upsertState(state: AppOperationalState): Promise<boolean> {
    const cfg = getSupabaseConfig();
    if (!cfg) return false;

    try {
      const rpcEndpoint = `${cfg.url}/rest/v1/rpc/sync_full_operational_state`;
      const rpcRes = await fetch(rpcEndpoint, {
        method: 'POST',
        headers: buildSupabaseHeaders(cfg.key),
        body: JSON.stringify({ p_state: state }),
        cache: 'no-store',
      });

      if (rpcRes.ok) {
        return true;
      }
    } catch {
      // Fallback to operational_state table below
    }

    try {
      const endpoint = `${cfg.url}/rest/v1/operational_state?on_conflict=id`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: buildSupabaseHeaders(cfg.key, {
          Prefer: 'resolution=merge-duplicates,return=minimal',
        }),
        body: JSON.stringify({
          id: 'current',
          payload: state,
          updated_at: new Date().toISOString(),
        }),
        cache: 'no-store',
      });

      return res.ok;
    } catch {
      return false;
    }
  }
}
