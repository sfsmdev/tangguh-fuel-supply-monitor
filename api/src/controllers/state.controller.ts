import {
  AppOperationalState,
  DatabaseAdapter,
  sanitizeOperationalState,
} from '../../../backend/src/index';
import { RbacMiddleware } from '../middlewares/rbac.middleware';

export class StateController {
  static async getState(): Promise<AppOperationalState> {
    return DatabaseAdapter.getState();
  }

  static async updateState(
    username: string | null | undefined,
    nextState: AppOperationalState
  ): Promise<AppOperationalState> {
    const user = await RbacMiddleware.requireEdit(username);

    // Per-module authorization check when user is not Full Admin
    if (user.roleCode !== 'admin') {
      const prev = await DatabaseAdapter.getState();
      const next = sanitizeOperationalState(nextState);

      const fuelPriceChanged =
        JSON.stringify(prev.fuelPrice) !== JSON.stringify(next.fuelPrice);

      if (fuelPriceChanged) {
        throw new Error(
          'Forbidden: Only Administrator can update the fuel benchmark price.'
        );
      }

      const opsChanged =
        JSON.stringify(prev.bunkerings) !== JSON.stringify(next.bunkerings) ||
        JSON.stringify(prev.soundings) !== JSON.stringify(next.soundings) ||
        JSON.stringify(prev.topups) !== JSON.stringify(next.topups);

      const forecastChanged =
        JSON.stringify(prev.forecastDispatches) !==
          JSON.stringify(next.forecastDispatches) ||
        JSON.stringify(prev.forecastTopups) !==
          JSON.stringify(next.forecastTopups) ||
        JSON.stringify(prev.shoreTankDailyRobs) !==
          JSON.stringify(next.shoreTankDailyRobs);

      if (opsChanged && !user.canEditOperations && !user.canEditForecast) {
        throw new Error(
          'Forbidden: Operations Edit permission is required to modify Dispatch, Sounding, or Top-Up records.'
        );
      }
      // Pure forecast changes (when operations did not change via executeForecast*) require canEditForecast
      if (forecastChanged && !opsChanged && !user.canEditForecast) {
        throw new Error(
          'Forbidden: Forecast Edit permission is required to modify Fuel Supply Forecast plans.'
        );
      }
      // Pure operations changes (when forecast did not change via executeForecast*) require canEditOperations
      if (opsChanged && !forecastChanged && !user.canEditOperations) {
        throw new Error(
          'Forbidden: Operations Edit permission is required to modify Dispatch, Sounding, or Top-Up records.'
        );
      }
    }

    return DatabaseAdapter.saveState(nextState);
  }

  static async resetState(
    username: string | null | undefined
  ): Promise<AppOperationalState> {
    await RbacMiddleware.requireAdmin(username);
    return DatabaseAdapter.resetState();
  }
}
