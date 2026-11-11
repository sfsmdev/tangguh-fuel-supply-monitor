-- =============================================================================
-- TANGGUH FUEL SUPPLY MONITORING — COMPLETE SUPABASE DATABASE SCHEMA
-- Project URL: https://psjmliqlhethbjfkypzb.supabase.co
-- Run this entire script in your Supabase Dashboard -> SQL Editor
-- =============================================================================

-- 1. Enable pgcrypto extension for UUID generation and bcrypt password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Ensure session search path includes both public and extensions schemas
SET search_path TO public, extensions;

-- =============================================================================
-- 2. RBAC AUTHORITY SCHEMA: public.rbac_roles (Perbedaan Wewenang Role)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.rbac_roles (
  role_code TEXT PRIMARY KEY,
  role_name TEXT NOT NULL,
  description TEXT NOT NULL,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_manage_storage BOOLEAN NOT NULL DEFAULT false,
  can_manage_clients BOOLEAN NOT NULL DEFAULT false,
  can_edit_forecast BOOLEAN NOT NULL DEFAULT false,
  can_delete_forecast BOOLEAN NOT NULL DEFAULT false,
  can_edit_operations BOOLEAN NOT NULL DEFAULT false,
  can_delete_operations BOOLEAN NOT NULL DEFAULT false,
  allowed_views TEXT[] NOT NULL DEFAULT ARRAY['dashboardView']::TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure newly added granular columns exist if table was already created
ALTER TABLE public.rbac_roles ADD COLUMN IF NOT EXISTS can_edit_forecast BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.rbac_roles ADD COLUMN IF NOT EXISTS can_delete_forecast BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.rbac_roles ADD COLUMN IF NOT EXISTS can_edit_operations BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.rbac_roles ADD COLUMN IF NOT EXISTS can_delete_operations BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read rbac_roles" ON public.rbac_roles;
CREATE POLICY "Allow public read rbac_roles"
  ON public.rbac_roles
  FOR SELECT
  TO public
  USING (true);

INSERT INTO public.rbac_roles (
  role_code,
  role_name,
  description,
  can_edit,
  can_delete,
  can_manage_storage,
  can_manage_clients,
  can_edit_forecast,
  can_delete_forecast,
  can_edit_operations,
  can_delete_operations,
  allowed_views
)
VALUES
  (
    'admin',
    'Full Access',
    'Full Access (Akses ke semua menu, izin tambah/edit/hapus seluruh data, konfigurasi floating storage, serta reset database)',
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    ARRAY[
      'dashboardView',
      'forecastView',
      'dispatchView',
      'soundingView',
      'topupView',
      'settingsView'
    ]
  ),
  (
    'planner',
    'Planner',
    'View-only pada semua fitur, namun memiliki izin penuh (input, edit, hapus) khusus pada modul Fuel Supply Forecast',
    true,
    true,
    false,
    false,
    true,
    true,
    false,
    false,
    ARRAY[
      'dashboardView',
      'forecastView',
      'dispatchView',
      'soundingView',
      'topupView',
      'settingsView'
    ]
  ),
  (
    'management',
    'Manager',
    'View-Only ke seluruh menu dashboard dan monitoring tanpa izin input/edit/hapus',
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    ARRAY[
      'dashboardView',
      'forecastView',
      'dispatchView',
      'soundingView',
      'topupView',
      'settingsView'
    ]
  ),
  (
    'fuel_coordinator',
    'Fuel Coordinator',
    'Bisa melihat semua fitur/menu di seluruh sistem. Izin operasional (input, edit, hapus) strictly dibatasi hanya pada modul: Daily Bunker Dispatch, Closing ROB & Sounding, Cargo Topup Plan',
    true,
    true,
    false,
    false,
    false,
    false,
    true,
    true,
    ARRAY[
      'dashboardView',
      'forecastView',
      'dispatchView',
      'soundingView',
      'topupView',
      'settingsView'
    ]
  ),
  (
    'contractor',
    'External / Client',
    'View-Only terbatas hanya untuk halaman: Monitoring Dashboard, Sounding, Fuel Supply Forecast, Topup Cargo Plan',
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    ARRAY[
      'dashboardView',
      'forecastView',
      'soundingView',
      'topupView'
    ]
  )
ON CONFLICT (role_code) DO UPDATE SET
  role_name = EXCLUDED.role_name,
  description = EXCLUDED.description,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete,
  can_manage_storage = EXCLUDED.can_manage_storage,
  can_manage_clients = EXCLUDED.can_manage_clients,
  can_edit_forecast = EXCLUDED.can_edit_forecast,
  can_delete_forecast = EXCLUDED.can_delete_forecast,
  can_edit_operations = EXCLUDED.can_edit_operations,
  can_delete_operations = EXCLUDED.can_delete_operations,
  allowed_views = EXCLUDED.allowed_views,
  updated_at = NOW();

-- =============================================================================
-- 3. USER ACCOUNTS TABLE: public.app_users (Kredensial & Entitas Pengguna)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role_label TEXT NOT NULL,
  role_code TEXT NOT NULL REFERENCES public.rbac_roles(role_code) ON UPDATE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 1. HAPUS SELURUH USER LAMA YANG SUDAH ADA DI SUPABASE
-- Membersihkan akun lama (seperti staff/management versi lama) agar bersih total
-- -----------------------------------------------------------------------------
DELETE FROM public.app_users WHERE true;

-- -----------------------------------------------------------------------------
-- 2. GANTI DENGAN DAFTAR USER, PASSWORD (BCRYPT), DAN KEWENANGAN BARU (9 Akun Resmi)
-- -----------------------------------------------------------------------------
INSERT INTO public.app_users (
  username,
  password_hash,
  entity_name,
  display_name,
  role_label,
  role_code,
  is_active
)
VALUES
  (
    'Admin',
    crypt('admin123', gen_salt('bf')),
    'Admin',
    'Administrator',
    'Full Access (Admin)',
    'admin',
    true
  ),
  (
    'Planner',
    crypt('set123', gen_salt('bf')),
    'Planner',
    'Planner Representative',
    'Planner (Forecast Full Access)',
    'planner',
    true
  ),
  (
    'Manager',
    crypt('set123', gen_salt('bf')),
    'Manager',
    'Executive Manager',
    'Manager (View-Only)',
    'management',
    true
  ),
  (
    'Fuel Coordinator',
    crypt('set123', gen_salt('bf')),
    'Fuel Coordinator',
    'Fuel Coordinator',
    'Fuel Coordinator (Operations Full Access)',
    'fuel_coordinator',
    true
  ),
  (
    'JGC',
    crypt('jgc123', gen_salt('bf')),
    'JGC',
    'JGC Representative',
    'JGC (View-Only)',
    'contractor',
    true
  ),
  (
    'SAIPEM',
    crypt('sai123', gen_salt('bf')),
    'SAIPEM',
    'SAIPEM Representative',
    'SAIPEM (View-Only)',
    'contractor',
    true
  ),
  (
    'PETROSEA',
    crypt('ptp123', gen_salt('bf')),
    'PETROSEA',
    'PETROSEA Representative',
    'PETROSEA (View-Only)',
    'contractor',
    true
  ),
  (
    'BP Tangguh',
    crypt('bp123', gen_salt('bf')),
    'BP Tangguh',
    'BP Tangguh Representative',
    'BP Tangguh (View-Only)',
    'contractor',
    true
  ),
  (
    'User',
    crypt('User123', gen_salt('bf')),
    'User',
    'Client User',
    'User (View-Only)',
    'contractor',
    true
  )
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  entity_name = EXCLUDED.entity_name,
  display_name = EXCLUDED.display_name,
  role_label = EXCLUDED.role_label,
  role_code = EXCLUDED.role_code,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- =============================================================================
-- 4. STORAGE & SYSTEM CONFIGURATION TABLE: public.storage_configs
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.storage_configs (
  id TEXT PRIMARY KEY DEFAULT 'default',
  vessel_name TEXT NOT NULL DEFAULT 'SPOB TRANS BILGIT',
  total_capacity NUMERIC NOT NULL DEFAULT 5000000,
  deadstock NUMERIC NOT NULL DEFAULT 0,
  initial_opening_rob NUMERIC NOT NULL DEFAULT 0,
  shore_tank_name TEXT NOT NULL DEFAULT 'SHORE TANK COMBO',
  shore_tank_initial_rob NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.storage_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access storage_configs" ON public.storage_configs;
CREATE POLICY "Allow public access storage_configs"
  ON public.storage_configs
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

INSERT INTO public.storage_configs (
  id,
  vessel_name,
  total_capacity,
  deadstock,
  initial_opening_rob,
  shore_tank_name,
  shore_tank_initial_rob
)
VALUES (
  'default',
  'SPOB TRANS BILGIT',
  5000000,
  0,
  0,
  'SHORE TANK COMBO',
  0
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 5. DYNAMIC CLIENT MASTER TABLE: public.clients (Admin Full CRUD)
--Starts empty by default (no hardcoded contractor names)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL DEFAULT '#EF4444',
  badge_class TEXT NOT NULL DEFAULT 'bg-red-50 text-red-700 border-red-200',
  dot_class TEXT NOT NULL DEFAULT 'bg-red-500',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access clients" ON public.clients;
CREATE POLICY "Allow public access clients"
  ON public.clients
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 6. DAILY BUNKER DISPATCH TABLE: public.bunkerings
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bunkerings (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  contractor TEXT NOT NULL,
  vessel_name TEXT NOT NULL,
  volume NUMERIC NOT NULL DEFAULT 0 CHECK (volume >= 0),
  start_time TEXT NOT NULL DEFAULT '08:00',
  end_time TEXT NOT NULL DEFAULT '10:00',
  flow_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bunkerings_date ON public.bunkerings(date);
CREATE INDEX IF NOT EXISTS idx_bunkerings_contractor ON public.bunkerings(contractor);

ALTER TABLE public.bunkerings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access bunkerings" ON public.bunkerings;
CREATE POLICY "Allow public access bunkerings"
  ON public.bunkerings
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 7. CLOSING ROB & PHYSICAL SOUNDING TABLE: public.soundings
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.soundings (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL DEFAULT '08:00',
  liters NUMERIC NOT NULL DEFAULT 0 CHECK (liters >= 0),
  draft_fwd NUMERIC NULL,
  draft_aft NUMERIC NULL,
  remarks TEXT NULL DEFAULT '',
  doc_name TEXT NULL,
  doc_data_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soundings_date_time ON public.soundings(date DESC, time DESC);

ALTER TABLE public.soundings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access soundings" ON public.soundings;
CREATE POLICY "Allow public access soundings"
  ON public.soundings
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 8. CARGO TOP-UP INBOUND VOYAGES TABLE: public.topups
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.topups (
  id TEXT PRIMARY KEY,
  vessel TEXT NOT NULL,
  volume NUMERIC NOT NULL DEFAULT 0 CHECK (volume >= 0),
  load_port TEXT NOT NULL DEFAULT 'Balikpapan',
  disch_port TEXT NOT NULL DEFAULT 'Tangguh Offshore',
  etd TEXT NOT NULL,
  eta TEXT NOT NULL,
  atd TEXT NULL DEFAULT '',
  ata TEXT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Planned' CHECK (
    status IN ('Planned', 'Loading', 'In Transit', 'Discharging', 'Completed')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topups_status ON public.topups(status);

ALTER TABLE public.topups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access topups" ON public.topups;
CREATE POLICY "Allow public access topups"
  ON public.topups
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 9. FORECAST DISTRIBUTIONS TABLE: public.forecast_dispatches (SPOB TRANS BILGIT)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.forecast_dispatches (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  client TEXT NOT NULL,
  vessel TEXT NOT NULL,
  volume NUMERIC NOT NULL DEFAULT 0 CHECK (volume >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecast_dispatches_date ON public.forecast_dispatches(date);
CREATE INDEX IF NOT EXISTS idx_forecast_dispatches_client ON public.forecast_dispatches(client);

ALTER TABLE public.forecast_dispatches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access forecast_dispatches" ON public.forecast_dispatches;
CREATE POLICY "Allow public access forecast_dispatches"
  ON public.forecast_dispatches
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 10. FORECAST TOP-UPS TABLE: public.forecast_topups (Dual Storage: Floating & Shore)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.forecast_topups (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  vessel TEXT NOT NULL,
  floating_volume NUMERIC NOT NULL DEFAULT 0 CHECK (floating_volume >= 0),
  shore_volume NUMERIC NOT NULL DEFAULT 0 CHECK (shore_volume >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecast_topups_date ON public.forecast_topups(date);

ALTER TABLE public.forecast_topups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access forecast_topups" ON public.forecast_topups;
CREATE POLICY "Allow public access forecast_topups"
  ON public.forecast_topups
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 11. OPERATIONAL STATE SNAPSHOT TABLE: public.operational_state
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.operational_state (
  id TEXT PRIMARY KEY DEFAULT 'current',
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.operational_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow operational state read/write" ON public.operational_state;
CREATE POLICY "Allow operational state read/write"
  ON public.operational_state
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 12. FUEL BENCHMARK PRICES TABLE: public.fuel_prices (Harga Acuan Minyak)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.fuel_prices (
  id TEXT PRIMARY KEY DEFAULT 'current',
  price_per_liter NUMERIC NOT NULL DEFAULT 0 CHECK (price_per_liter >= 0),
  currency TEXT NOT NULL DEFAULT 'IDR',
  fuel_type TEXT NOT NULL DEFAULT 'Biofuel B50',
  effective_date TEXT NULL,
  notes TEXT NULL DEFAULT '',
  updated_by TEXT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fuel_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read fuel_prices" ON public.fuel_prices;
CREATE POLICY "Allow public read fuel_prices"
  ON public.fuel_prices
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public write fuel_prices" ON public.fuel_prices;
CREATE POLICY "Allow public write fuel_prices"
  ON public.fuel_prices
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

INSERT INTO public.fuel_prices (
  id,
  price_per_liter,
  currency,
  fuel_type,
  effective_date,
  notes,
  updated_by,
  updated_at
)
VALUES (
  'current',
  0,
  'IDR',
  'Biofuel B50',
  '',
  '',
  '',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Riwayat Perubahan Harga Minyak (Audit Log Historis)
CREATE TABLE IF NOT EXISTS public.fuel_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_liter NUMERIC NOT NULL CHECK (price_per_liter >= 0),
  currency TEXT NOT NULL DEFAULT 'IDR',
  fuel_type TEXT NOT NULL DEFAULT 'Biofuel B50',
  effective_date TEXT NULL,
  notes TEXT NULL DEFAULT '',
  updated_by TEXT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fuel_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read fuel_price_history" ON public.fuel_price_history;
CREATE POLICY "Allow public read fuel_price_history"
  ON public.fuel_price_history
  FOR SELECT
  TO public
  USING (true);

-- =============================================================================
-- 13. REAL-TIME INVENTORY RECONCILIATION VIEW: public.v_inventory_reconciliation
-- Computes Book ROB, Usable ROB, Latest Sounding, and Variance directly in SQL
-- =============================================================================
CREATE OR REPLACE VIEW public.v_inventory_reconciliation AS
WITH cfg AS (
  SELECT
    vessel_name,
    total_capacity,
    deadstock,
    initial_opening_rob,
    shore_tank_name,
    shore_tank_initial_rob
  FROM public.storage_configs
  WHERE id = 'default'
  LIMIT 1
),
topup_sum AS (
  SELECT
    COALESCE(SUM(volume), 0) AS total_topup_completed,
    COUNT(*) AS completed_topup_count
  FROM public.topups
  WHERE status = 'Completed'
),
dispatch_sum AS (
  SELECT
    COALESCE(SUM(volume), 0) AS total_dispatched
  FROM public.bunkerings
),
latest_snd AS (
  SELECT liters
  FROM public.soundings
  ORDER BY date DESC, time DESC
  LIMIT 1
)
SELECT
  cfg.vessel_name,
  cfg.total_capacity,
  cfg.deadstock,
  cfg.initial_opening_rob AS initial_rob,
  topup_sum.total_topup_completed AS total_topup,
  topup_sum.completed_topup_count,
  dispatch_sum.total_dispatched,
  (cfg.initial_opening_rob + topup_sum.total_topup_completed - dispatch_sum.total_dispatched) AS book_rob,
  GREATEST(0, (cfg.initial_opening_rob + topup_sum.total_topup_completed - dispatch_sum.total_dispatched) - cfg.deadstock) AS usable_rob,
  latest_snd.liters AS latest_sounding,
  CASE
    WHEN latest_snd.liters IS NOT NULL THEN
      latest_snd.liters - (cfg.initial_opening_rob + topup_sum.total_topup_completed - dispatch_sum.total_dispatched)
    ELSE NULL
  END AS variance,
  cfg.shore_tank_name,
  cfg.shore_tank_initial_rob
FROM cfg
CROSS JOIN topup_sum
CROSS JOIN dispatch_sum
LEFT JOIN latest_snd ON true;

-- =============================================================================
-- 13. RPC FUNCTIONS: AUTHENTICATION & FULL RELATIONAL STATE SYNCHRONIZATION
-- =============================================================================

-- 13.1 Authenticate User against public.app_users + public.rbac_roles
CREATE OR REPLACE FUNCTION public.authenticate_app_user(
  p_username TEXT,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'username', u.username,
    'entityName', u.entity_name,
    'displayName', u.display_name,
    'roleLabel', u.role_label,
    'roleCode', r.role_code,
    'canEdit', r.can_edit,
    'canDelete', r.can_delete,
    'canManageStorage', r.can_manage_storage,
    'canManageClients', r.can_manage_clients,
    'canEditForecast', COALESCE(r.can_edit_forecast, false),
    'canDeleteForecast', COALESCE(r.can_delete_forecast, false),
    'canEditOperations', COALESCE(r.can_edit_operations, false),
    'canDeleteOperations', COALESCE(r.can_delete_operations, false),
    'allowedViews', to_jsonb(r.allowed_views)
  )
  INTO v_result
  FROM public.app_users u
  INNER JOIN public.rbac_roles r ON r.role_code = u.role_code
  WHERE LOWER(u.username) = LOWER(TRIM(COALESCE(p_username, '')))
    AND u.is_active = true
    AND (
      u.password_hash = crypt(TRIM(COALESCE(p_password, '')), u.password_hash)
      OR u.password_hash = crypt(UPPER(TRIM(COALESCE(p_password, ''))), u.password_hash)
      OR u.password_hash = crypt(LOWER(TRIM(COALESCE(p_password, ''))), u.password_hash)
    )
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- 13.2 Get Active User Profile & Permissions by Username
CREATE OR REPLACE FUNCTION public.get_app_user_profile(
  p_username TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'username', u.username,
    'entityName', u.entity_name,
    'displayName', u.display_name,
    'roleLabel', u.role_label,
    'roleCode', r.role_code,
    'canEdit', r.can_edit,
    'canDelete', r.can_delete,
    'canManageStorage', r.can_manage_storage,
    'canManageClients', r.can_manage_clients,
    'canEditForecast', COALESCE(r.can_edit_forecast, false),
    'canDeleteForecast', COALESCE(r.can_delete_forecast, false),
    'canEditOperations', COALESCE(r.can_edit_operations, false),
    'canDeleteOperations', COALESCE(r.can_delete_operations, false),
    'allowedViews', to_jsonb(r.allowed_views)
  )
  INTO v_result
  FROM public.app_users u
  INNER JOIN public.rbac_roles r ON r.role_code = u.role_code
  WHERE LOWER(u.username) = LOWER(TRIM(COALESCE(p_username, '')))
    AND u.is_active = true
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- 13.3 Assemble Full Application State from Relational Tables
CREATE OR REPLACE FUNCTION public.get_full_operational_state()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_storage_config JSONB;
  v_clients JSONB;
  v_bunkerings JSONB;
  v_soundings JSONB;
  v_topups JSONB;
  v_forecast_dispatches JSONB;
  v_forecast_topups JSONB;
BEGIN
  SELECT jsonb_build_object(
    'vesselName', vessel_name,
    'totalCapacity', total_capacity,
    'deadstock', deadstock,
    'initialOpeningRob', initial_opening_rob,
    'shoreTankName', shore_tank_name,
    'shoreTankInitialRob', shore_tank_initial_rob
  )
  INTO v_storage_config
  FROM public.storage_configs
  WHERE id = 'default'
  LIMIT 1;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'color', color,
        'badgeClass', badge_class,
        'dotClass', dot_class,
        'createdAt', to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'updatedAt', to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
      ORDER BY created_at ASC
    ),
    '[]'::JSONB
  )
  INTO v_clients
  FROM public.clients;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'date', date,
        'contractor', contractor,
        'vesselName', vessel_name,
        'volume', volume,
        'startTime', start_time,
        'endTime', end_time,
        'flowRate', flow_rate
      )
      ORDER BY date DESC, start_time DESC
    ),
    '[]'::JSONB
  )
  INTO v_bunkerings
  FROM public.bunkerings;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'date', date,
        'time', time,
        'liters', liters,
        'draftFwd', draft_fwd,
        'draftAft', draft_aft,
        'remarks', COALESCE(remarks, ''),
        'docName', doc_name,
        'docDataUrl', doc_data_url
      )
      ORDER BY date DESC, time DESC
    ),
    '[]'::JSONB
  )
  INTO v_soundings
  FROM public.soundings;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'vessel', vessel,
        'volume', volume,
        'loadPort', load_port,
        'dischPort', disch_port,
        'etd', etd,
        'eta', eta,
        'atd', COALESCE(atd, ''),
        'ata', COALESCE(ata, ''),
        'status', status
      )
      ORDER BY created_at DESC
    ),
    '[]'::JSONB
  )
  INTO v_topups
  FROM public.topups;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'date', date,
        'client', client,
        'vessel', vessel,
        'volume', volume
      )
      ORDER BY date ASC
    ),
    '[]'::JSONB
  )
  INTO v_forecast_dispatches
  FROM public.forecast_dispatches;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'date', date,
        'vessel', vessel,
        'floatingVolume', floating_volume,
        'shoreVolume', shore_volume
      )
      ORDER BY date ASC
    ),
    '[]'::JSONB
  )
  INTO v_forecast_topups
  FROM public.forecast_topups;

  RETURN jsonb_build_object(
    'storageConfig', COALESCE(v_storage_config, jsonb_build_object(
      'vesselName', 'SPOB TRANS BILGIT',
      'totalCapacity', 5000000,
      'deadstock', 0,
      'initialOpeningRob', 0,
      'shoreTankName', 'SHORE TANK COMBO',
      'shoreTankInitialRob', 0
    )),
    'clients', v_clients,
    'bunkerings', v_bunkerings,
    'soundings', v_soundings,
    'topups', v_topups,
    'forecastDispatches', v_forecast_dispatches,
    'forecastTopups', v_forecast_topups,
    'shoreTankDailyRobs', COALESCE(
      (SELECT payload->'shoreTankDailyRobs' FROM public.operational_state WHERE id = 'current' LIMIT 1),
      '{}'::JSONB
    ),
    'fuelPrice', COALESCE(
      (
        SELECT jsonb_build_object(
          'id', id,
          'pricePerLiter', price_per_liter,
          'currency', currency,
          'fuelType', fuel_type,
          'effectiveDate', COALESCE(effective_date, ''),
          'notes', COALESCE(notes, ''),
          'updatedBy', COALESCE(updated_by, ''),
          'updatedAt', to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        )
        FROM public.fuel_prices
        WHERE id = 'current'
        LIMIT 1
      ),
      (SELECT payload->'fuelPrice' FROM public.operational_state WHERE id = 'current' LIMIT 1),
      jsonb_build_object(
        'id', 'current',
        'pricePerLiter', 0,
        'currency', 'IDR',
        'fuelType', 'Biofuel B50',
        'effectiveDate', '',
        'notes', '',
        'updatedBy', '',
        'updatedAt', ''
      )
    )
  );
END;
$$;

-- 13.4 Synchronize Full Application State into All Relational Tables + Snapshot
CREATE OR REPLACE FUNCTION public.sync_full_operational_state(
  p_state JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- 1. Update storage_configs
  INSERT INTO public.storage_configs (
    id,
    vessel_name,
    total_capacity,
    deadstock,
    initial_opening_rob,
    shore_tank_name,
    shore_tank_initial_rob,
    updated_at
  )
  VALUES (
    'default',
    COALESCE(p_state->'storageConfig'->>'vesselName', 'SPOB TRANS BILGIT'),
    COALESCE((p_state->'storageConfig'->>'totalCapacity')::NUMERIC, 5000000),
    COALESCE((p_state->'storageConfig'->>'deadstock')::NUMERIC, 0),
    COALESCE((p_state->'storageConfig'->>'initialOpeningRob')::NUMERIC, 0),
    COALESCE(p_state->'storageConfig'->>'shoreTankName', 'SHORE TANK COMBO'),
    COALESCE((p_state->'storageConfig'->>'shoreTankInitialRob')::NUMERIC, 0),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    vessel_name = EXCLUDED.vessel_name,
    total_capacity = EXCLUDED.total_capacity,
    deadstock = EXCLUDED.deadstock,
    initial_opening_rob = EXCLUDED.initial_opening_rob,
    shore_tank_name = EXCLUDED.shore_tank_name,
    shore_tank_initial_rob = EXCLUDED.shore_tank_initial_rob,
    updated_at = NOW();

  -- 2. Sync clients table
  DELETE FROM public.clients WHERE true;
  IF jsonb_typeof(p_state->'clients') = 'array' THEN
    INSERT INTO public.clients (id, name, color, badge_class, dot_class)
    SELECT
      COALESCE(item->>'id', gen_random_uuid()::TEXT),
      UPPER(TRIM(COALESCE(item->>'name', 'CLIENT'))),
      COALESCE(item->>'color', '#EF4444'),
      COALESCE(item->>'badgeClass', 'bg-red-50 text-red-700 border-red-200'),
      COALESCE(item->>'dotClass', 'bg-red-500')
    FROM jsonb_array_elements(p_state->'clients') AS item
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      color = EXCLUDED.color,
      badge_class = EXCLUDED.badge_class,
      dot_class = EXCLUDED.dot_class,
      updated_at = NOW();
  END IF;

  -- 3. Sync bunkerings table
  DELETE FROM public.bunkerings WHERE true;
  IF jsonb_typeof(p_state->'bunkerings') = 'array' THEN
    INSERT INTO public.bunkerings (
      id, date, contractor, vessel_name, volume, start_time, end_time, flow_rate
    )
    SELECT
      COALESCE(item->>'id', gen_random_uuid()::TEXT),
      COALESCE(item->>'date', ''),
      UPPER(TRIM(COALESCE(item->>'contractor', ''))),
      COALESCE(item->>'vesselName', ''),
      COALESCE((item->>'volume')::NUMERIC, 0),
      COALESCE(item->>'startTime', '08:00'),
      COALESCE(item->>'endTime', '10:00'),
      COALESCE((item->>'flowRate')::NUMERIC, 0)
    FROM jsonb_array_elements(p_state->'bunkerings') AS item;
  END IF;

  -- 4. Sync soundings table
  DELETE FROM public.soundings WHERE true;
  IF jsonb_typeof(p_state->'soundings') = 'array' THEN
    INSERT INTO public.soundings (
      id, date, time, liters, draft_fwd, draft_aft, remarks, doc_name, doc_data_url
    )
    SELECT
      COALESCE(item->>'id', gen_random_uuid()::TEXT),
      COALESCE(item->>'date', ''),
      COALESCE(item->>'time', '08:00'),
      COALESCE((item->>'liters')::NUMERIC, 0),
      CASE WHEN item->>'draftFwd' IS NOT NULL AND item->>'draftFwd' <> '' THEN (item->>'draftFwd')::NUMERIC ELSE NULL END,
      CASE WHEN item->>'draftAft' IS NOT NULL AND item->>'draftAft' <> '' THEN (item->>'draftAft')::NUMERIC ELSE NULL END,
      COALESCE(item->>'remarks', ''),
      item->>'docName',
      item->>'docDataUrl'
    FROM jsonb_array_elements(p_state->'soundings') AS item;
  END IF;

  -- 5. Sync topups table
  DELETE FROM public.topups WHERE true;
  IF jsonb_typeof(p_state->'topups') = 'array' THEN
    INSERT INTO public.topups (
      id, vessel, volume, load_port, disch_port, etd, eta, atd, ata, status
    )
    SELECT
      COALESCE(item->>'id', gen_random_uuid()::TEXT),
      COALESCE(item->>'vessel', ''),
      COALESCE((item->>'volume')::NUMERIC, 0),
      COALESCE(item->>'loadPort', 'Balikpapan'),
      COALESCE(item->>'dischPort', 'Tangguh Offshore'),
      COALESCE(item->>'etd', ''),
      COALESCE(item->>'eta', ''),
      COALESCE(item->>'atd', ''),
      COALESCE(item->>'ata', ''),
      COALESCE(item->>'status', 'Planned')
    FROM jsonb_array_elements(p_state->'topups') AS item;
  END IF;

  -- 6. Sync forecast_dispatches table
  DELETE FROM public.forecast_dispatches WHERE true;
  IF jsonb_typeof(p_state->'forecastDispatches') = 'array' THEN
    INSERT INTO public.forecast_dispatches (
      id, date, client, vessel, volume
    )
    SELECT
      COALESCE(item->>'id', gen_random_uuid()::TEXT),
      COALESCE(item->>'date', ''),
      UPPER(TRIM(COALESCE(item->>'client', ''))),
      COALESCE(item->>'vessel', ''),
      COALESCE((item->>'volume')::NUMERIC, 0)
    FROM jsonb_array_elements(p_state->'forecastDispatches') AS item;
  END IF;

  -- 7. Sync forecast_topups table
  DELETE FROM public.forecast_topups WHERE true;
  IF jsonb_typeof(p_state->'forecastTopups') = 'array' THEN
    INSERT INTO public.forecast_topups (
      id, date, vessel, floating_volume, shore_volume
    )
    SELECT
      COALESCE(item->>'id', gen_random_uuid()::TEXT),
      COALESCE(item->>'date', ''),
      COALESCE(item->>'vessel', ''),
      COALESCE((item->>'floatingVolume')::NUMERIC, 0),
      COALESCE((item->>'shoreVolume')::NUMERIC, 0)
    FROM jsonb_array_elements(p_state->'forecastTopups') AS item;
  END IF;

  -- 8. Sync fuel_prices table & insert history
  IF p_state->'fuelPrice' IS NOT NULL AND jsonb_typeof(p_state->'fuelPrice') = 'object' THEN
    INSERT INTO public.fuel_prices (
      id,
      price_per_liter,
      currency,
      fuel_type,
      effective_date,
      notes,
      updated_by,
      updated_at
    )
    VALUES (
      'current',
      COALESCE((p_state->'fuelPrice'->>'pricePerLiter')::NUMERIC, 0),
      COALESCE(p_state->'fuelPrice'->>'currency', 'IDR'),
      COALESCE(p_state->'fuelPrice'->>'fuelType', 'Biofuel B50'),
      COALESCE(p_state->'fuelPrice'->>'effectiveDate', ''),
      COALESCE(p_state->'fuelPrice'->>'notes', ''),
      COALESCE(p_state->'fuelPrice'->>'updatedBy', ''),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      price_per_liter = EXCLUDED.price_per_liter,
      currency = EXCLUDED.currency,
      fuel_type = EXCLUDED.fuel_type,
      effective_date = EXCLUDED.effective_date,
      notes = EXCLUDED.notes,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW();

    -- Log history only if a valid price was provided
    IF COALESCE((p_state->'fuelPrice'->>'pricePerLiter')::NUMERIC, 0) > 0 OR COALESCE(p_state->'fuelPrice'->>'updatedBy', '') <> '' THEN
      INSERT INTO public.fuel_price_history (
        price_per_liter,
        currency,
        fuel_type,
        effective_date,
        notes,
        updated_by,
        created_at
      )
      VALUES (
        COALESCE((p_state->'fuelPrice'->>'pricePerLiter')::NUMERIC, 0),
        COALESCE(p_state->'fuelPrice'->>'currency', 'IDR'),
        COALESCE(p_state->'fuelPrice'->>'fuelType', 'Biofuel B50'),
        COALESCE(p_state->'fuelPrice'->>'effectiveDate', ''),
        COALESCE(p_state->'fuelPrice'->>'notes', ''),
        COALESCE(p_state->'fuelPrice'->>'updatedBy', 'Admin'),
        NOW()
      );
    END IF;
  END IF;

  -- 9. Also update operational_state snapshot
  INSERT INTO public.operational_state (id, payload, updated_at)
  VALUES ('current', p_state, NOW())
  ON CONFLICT (id) DO UPDATE SET
    payload = EXCLUDED.payload,
    updated_at = NOW();

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_app_user(TEXT, TEXT) TO anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.get_app_user_profile(TEXT) TO anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.get_full_operational_state() TO anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.sync_full_operational_state(JSONB) TO anon, authenticated, public;
