import { randomUUID } from 'node:crypto';

import { Firestore } from '@google-cloud/firestore';

import { type DatabaseConnectivityPort } from '../../application/ports/infra/database/database-connectivity-port.js';

export interface ConnectivityDocument {
  delete(): Promise<unknown>;
  get(): Promise<{ exists: boolean }>;
  set(data: Record<string, unknown>): Promise<unknown>;
}

export interface DatabaseConnectivityDependencies {
  createDocument(id: string): ConnectivityDocument;
}

export class DatabaseConnectivityService implements DatabaseConnectivityPort {
  readonly #dependencies: DatabaseConnectivityDependencies;

  constructor(dependencies: DatabaseConnectivityDependencies) {
    this.#dependencies = dependencies;
  }

  async check(): Promise<void> {
    const document = this.#dependencies.createDocument(randomUUID());
    let created = false;

    try {
      await document.set({
        createdAt: new Date().toISOString(),
        source: 'local-connectivity-check',
      });
      created = true;

      const snapshot = await document.get();
      if (!snapshot.exists) {
        throw new Error('Connectivity check document was not found.');
      }
    } finally {
      if (created) {
        await document.delete();
      }
    }
  }
}

export function createDatabaseConnectivityService({
  projectId,
}: {
  projectId: string;
}): DatabaseConnectivityService {
  const firestore = new Firestore({ projectId });

  return new DatabaseConnectivityService({
    createDocument: (id) =>
      firestore.collection('_connectivity_checks').doc(id),
  });
}
