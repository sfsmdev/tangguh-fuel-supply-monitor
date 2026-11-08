export type ViewId =
  | 'dashboardView'
  | 'forecastView'
  | 'dispatchView'
  | 'soundingView'
  | 'topupView'
  | 'settingsView';

export type RoleCode = 'admin' | 'management' | 'staff' | 'contractor';

/**
 * RBAC Authority Schema stored in Supabase `public.rbac_roles`.
 */
export interface RbacRoleSchema {
  roleCode: RoleCode;
  roleName: string;
  description: string;
  canEdit: boolean;
  canDelete: boolean;
  canManageStorage: boolean;
  canManageClients: boolean;
  allowedViews: ViewId[];
}

/**
 * Authenticated User Account profile returned by Supabase `public.app_users`
 * joined with `public.rbac_roles`.
 * Note: Usernames and passwords are NOT hardcoded in the application source;
 * they are stored and verified directly in Supabase (`public.app_users`).
 */
export interface UserAccount {
  username: string;
  entityName?: string;
  displayName: string;
  roleLabel: string;
  roleCode?: RoleCode;
  canEdit: boolean;
  canDelete: boolean;
  canManageStorage: boolean;
  canManageClients: boolean;
  allowedViews: ViewId[];
}
