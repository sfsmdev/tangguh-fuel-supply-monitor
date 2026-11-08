import {
  AppOperationalState,
  ClientRecord,
  ClientService,
  DatabaseAdapter,
} from '../../../backend/src/index';
import { RbacMiddleware } from '../middlewares/rbac.middleware';

export class ClientsController {
  static async listClients(): Promise<ClientRecord[]> {
    const state = await DatabaseAdapter.getState();
    return state.clients;
  }

  static async createClient(
    username: string | null | undefined,
    payload: { name: string; color?: string }
  ): Promise<{ state: AppOperationalState; client: ClientRecord }> {
    RbacMiddleware.requireAdmin(username);
    const currentState = await DatabaseAdapter.getState();
    const { state: nextState, client } = ClientService.addClient(
      currentState,
      payload.name,
      payload.color
    );
    await DatabaseAdapter.saveState(nextState);
    return { state: nextState, client };
  }

  static async updateClient(
    username: string | null | undefined,
    payload: { id: string; name: string; color?: string }
  ): Promise<{ state: AppOperationalState; client: ClientRecord }> {
    RbacMiddleware.requireAdmin(username);
    const currentState = await DatabaseAdapter.getState();
    const { state: nextState, client } = ClientService.updateClient(
      currentState,
      payload.id,
      payload.name,
      payload.color
    );
    await DatabaseAdapter.saveState(nextState);
    return { state: nextState, client };
  }

  static async deleteClient(
    username: string | null | undefined,
    clientId: string
  ): Promise<{ state: AppOperationalState; deletedClient: ClientRecord }> {
    RbacMiddleware.requireAdmin(username);
    const currentState = await DatabaseAdapter.getState();
    const { state: nextState, deletedClient } = ClientService.deleteClient(
      currentState,
      clientId
    );
    await DatabaseAdapter.saveState(nextState);
    return { state: nextState, deletedClient };
  }
}

