import { AppOperationalState, DatabaseAdapter } from '../../../backend/src/index';
import { RbacMiddleware } from '../middlewares/rbac.middleware';

export class StateController {
  static async getState(): Promise<AppOperationalState> {
    return DatabaseAdapter.getState();
  }

  static async updateState(
    username: string | null | undefined,
    nextState: AppOperationalState
  ): Promise<AppOperationalState> {
    await RbacMiddleware.requireEdit(username);
    return DatabaseAdapter.saveState(nextState);
  }

  static async resetState(
    username: string | null | undefined
  ): Promise<AppOperationalState> {
    await RbacMiddleware.requireAdmin(username);
    return DatabaseAdapter.resetState();
  }
}
