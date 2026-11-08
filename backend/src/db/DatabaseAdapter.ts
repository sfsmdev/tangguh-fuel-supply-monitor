import { AppOperationalState } from '../models/Inventory';
import { createCleanInitialState, sanitizeOperationalState } from './seed';
import { SupabaseProvider } from './SupabaseProvider';

/**
 * Pluggable Database Provider Contract.
 * Primary: Supabase Cloud PostgreSQL (`public.operational_state`).
 * Fallback / Local Mirror: `data_store.json` + in-memory cache.
 */
export interface IDatabaseProvider {
  getState(): Promise<AppOperationalState>;
  saveState(state: AppOperationalState): Promise<AppOperationalState>;
  resetState(): Promise<AppOperationalState>;
}

let memoryState: AppOperationalState | null = null;

export class DatabaseAdapter {
  static async getState(): Promise<AppOperationalState> {
    // 1. Try Supabase Cloud Database first if configured
    if (SupabaseProvider.isConfigured()) {
      const remoteState = await SupabaseProvider.fetchState();
      if (remoteState) {
        memoryState = remoteState;
        await this.writeLocalMirror(remoteState);
        return remoteState;
      }
    }

    // 2. Fallback to Local JSON file on server
    if (typeof window === 'undefined') {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const cwd = process.cwd();
        const dbFilePath =
          path.basename(cwd) === 'frontend'
            ? path.join(cwd, '..', 'data_store.json')
            : path.join(cwd, 'data_store.json');
        const raw = await fs.readFile(dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        memoryState = sanitizeOperationalState(parsed);

        // Seed Supabase if table exists and was empty
        if (SupabaseProvider.isConfigured()) {
          void SupabaseProvider.upsertState(memoryState);
        }

        return memoryState;
      } catch {
        if (!memoryState) {
          memoryState = createCleanInitialState();
        }
        return memoryState;
      }
    }

    if (!memoryState) {
      memoryState = createCleanInitialState();
    }
    return memoryState;
  }

  static async saveState(
    state: AppOperationalState
  ): Promise<AppOperationalState> {
    const clean = sanitizeOperationalState(state);
    memoryState = clean;

    // 1. Persist to Supabase Cloud Database
    if (SupabaseProvider.isConfigured()) {
      await SupabaseProvider.upsertState(clean);
    }

    // 2. Persist to Local JSON Mirror
    await this.writeLocalMirror(clean);

    return clean;
  }

  static async resetState(): Promise<AppOperationalState> {
    const clean = createCleanInitialState();
    return this.saveState(clean);
  }

  private static async writeLocalMirror(
    clean: AppOperationalState
  ): Promise<void> {
    if (typeof window === 'undefined') {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const cwd = process.cwd();
        const dbFilePath =
          path.basename(cwd) === 'frontend'
            ? path.join(cwd, '..', 'data_store.json')
            : path.join(cwd, 'data_store.json');
        await fs.writeFile(dbFilePath, JSON.stringify(clean, null, 2), 'utf-8');
      } catch {
        // Ignore write error in read-only serverless environments
      }
    }
  }
}
