import {
  ClientRecord,
  resolveClientColorStyle,
} from '../models/Client';
import { AppOperationalState } from '../models/Inventory';

export class ClientService {
  static addClient(
    state: AppOperationalState,
    name: string,
    colorHex?: string
  ): { state: AppOperationalState; client: ClientRecord; addedClients: ClientRecord[] } {
    // Support batch entry separated by comma or newline so users can add multiple clients at once
    const rawNames = name
      .split(/[,;\n]+/)
      .map((n) => n.trim())
      .filter(Boolean);

    if (rawNames.length === 0) {
      throw new Error('Client name cannot be empty.');
    }

    // Deduplicate within the submitted batch (case-insensitive)
    const uniqueNames: string[] = [];
    for (const candidate of rawNames) {
      if (
        !uniqueNames.some((u) => u.toLowerCase() === candidate.toLowerCase())
      ) {
        uniqueNames.push(candidate);
      }
    }

    const addedClients: ClientRecord[] = [];
    let currentClients = [...state.clients];
    const now = new Date().toISOString();

    for (let i = 0; i < uniqueNames.length; i++) {
      const cleanName = uniqueNames[i];
      const exists = currentClients.some(
        (c) => c.name.toLowerCase() === cleanName.toLowerCase()
      );
      if (exists) {
        if (uniqueNames.length === 1) {
          throw new Error(`Client "${cleanName}" already exists.`);
        }
        continue;
      }

      const style = resolveClientColorStyle(
        currentClients.length,
        uniqueNames.length === 1 ? colorHex : undefined
      );

      const newClient: ClientRecord = {
        id: `client_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
        name: cleanName,
        color: style.color,
        badgeClass: style.badgeClass,
        dotClass: style.dotClass,
        createdAt: now,
        updatedAt: now,
      };

      currentClients.push(newClient);
      addedClients.push(newClient);
    }

    if (addedClients.length === 0) {
      throw new Error('All specified client names already exist.');
    }

    const nextState: AppOperationalState = {
      ...state,
      clients: currentClients,
    };

    return {
      state: nextState,
      client: addedClients[addedClients.length - 1],
      addedClients,
    };
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

    const existingIndex = state.clients.findIndex((c) => c.id === clientId);
    if (existingIndex === -1) {
      throw new Error('Client record not found.');
    }
    const existingClient = state.clients[existingIndex];

    const duplicate = state.clients.some(
      (c) => c.id !== clientId && c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Another client with the name "${cleanName}" already exists.`);
    }

    const style = colorHex
      ? resolveClientColorStyle(existingIndex, colorHex)
      : {
          color: existingClient.color,
          badgeClass: existingClient.badgeClass,
          dotClass: existingClient.dotClass,
        };

    const oldName = existingClient.name;
    const updatedClient: ClientRecord = {
      ...existingClient,
      name: cleanName,
      color: style.color,
      badgeClass: style.badgeClass,
      dotClass: style.dotClass,
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

