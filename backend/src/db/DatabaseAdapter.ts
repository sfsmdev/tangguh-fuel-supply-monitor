import { AppOperationalState } from '../models/Inventory';
import { createCleanInitialState, sanitizeOperationalState } from './seed';

/**
 * Pluggable Database Provider Contract.
 * Currently backed by Local JSON + Memory persistence.
 * Ready for drop-in replacement with SupabaseProvider (PostgreSQL) when needed.
 */
export interface IDatabaseProvider {
  getState(): Promise<AppOperationalState>;
  saveState(state: AppOperationalState): Promise<AppOperationalState>;
  resetState(): Promise<AppOperationalState>;
}

let memoryState: AppOperationalState | null = null;

export class DatabaseAdapter {
  static async getState(): Promise<AppOperationalState> {
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

    return clean;
  }

  static async resetState(): Promise<AppOperationalState> {
    const clean = createCleanInitialState();
    return this.saveState(clean);
  }
}
