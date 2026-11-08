import { CLIENT_COLOR_PRESETS, ClientRecord } from '../models/Client';
import { AppOperationalState } from '../models/Inventory';

export class ClientService {
  static addClient(
    state: AppOperationalState,
    name: string,
    colorHex?: string
  ): { state: AppOperationalState; client: ClientRecord } {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Client name cannot be empty.');
    }

    const exists = state.clients.some(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      throw new Error(`Client "${cleanName}" already exists.`);
    }

    const preset =
      (colorHex && CLIENT_COLOR_PRESETS.find((p) => p.color === colorHex)) ||
      CLIENT_COLOR_PRESETS[state.clients.length % CLIENT_COLOR_PRESETS.length];

    const now = new Date().toISOString();
    const newClient: ClientRecord = {
      id: `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      color: preset.color,
      badgeClass: preset.badgeClass,
      dotClass: preset.dotClass,
      createdAt: now,
      updatedAt: now,
    };

    const nextState: AppOperationalState = {
      ...state,
      clients: [...state.clients, newClient],
    };

    return { state: nextState, client: newClient };
  }

  static updateClient(
    state: AppOperationalState,
    clientId: string,
    newName: string,
    colorHex?: string
  ): { state: AppOperationalState; client: ClientRecord } {
    const cleanName = newName.trim();
    if (!cleanName) {
      throw new Error('Client name cannot be empty.');
    }

    const existingClient = state.clients.find((c) => c.id === clientId);
    if (!existingClient) {
      throw new Error('Client record not found.');
    }

    const duplicate = state.clients.some(
      (c) => c.id !== clientId && c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Another client with the name "${cleanName}" already exists.`);
    }

    const preset = colorHex
      ? CLIENT_COLOR_PRESETS.find((p) => p.color === colorHex)
      : undefined;

    const oldName = existingClient.name;
    const updatedClient: ClientRecord = {
      ...existingClient,
      name: cleanName,
      color: preset ? preset.color : existingClient.color,
      badgeClass: preset ? preset.badgeClass : existingClient.badgeClass,
      dotClass: preset ? preset.dotClass : existingClient.dotClass,
      updatedAt: new Date().toISOString(),
    };

    // Synchronize renamed client across all bunkerings and forecastDispatches
    const updatedBunkerings = state.bunkerings.map((b) =>
      b.contractor.toLowerCase() === oldName.toLowerCase()
        ? { ...b, contractor: cleanName }
        : b
    );

    const updatedForecastDispatches = state.forecastDispatches.map((fd) =>
      fd.client.toLowerCase() === oldName.toLowerCase()
        ? { ...fd, client: cleanName }
        : fd
    );

    const nextState: AppOperationalState = {
      ...state,
      clients: state.clients.map((c) => (c.id === clientId ? updatedClient : c)),
      bunkerings: updatedBunkerings,
      forecastDispatches: updatedForecastDispatches,
    };

    return { state: nextState, client: updatedClient };
  }

  static deleteClient(
    state: AppOperationalState,
    clientId: string
  ): { state: AppOperationalState; deletedClient: ClientRecord } {
    const target = state.clients.find((c) => c.id === clientId);
    if (!target) {
      throw new Error('Client record not found.');
    }

    const nextState: AppOperationalState = {
      ...state,
      clients: state.clients.filter((c) => c.id !== clientId),
      forecastDispatches: state.forecastDispatches.filter(
        (fd) => fd.client.toLowerCase() !== target.name.toLowerCase()
      ),
    };

    return { state: nextState, deletedClient: target };
  }
}

