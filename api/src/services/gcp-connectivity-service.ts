import { randomUUID } from 'node:crypto';

import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';

export interface ConnectivityDocument {
  delete(): Promise<unknown>;
  get(): Promise<{ exists: boolean }>;
  set(data: Record<string, unknown>): Promise<unknown>;
}

export interface ConnectivityObject {
  delete(options?: { ignoreNotFound?: boolean }): Promise<unknown>;
  download(): Promise<[Buffer]>;
  save(data: string): Promise<unknown>;
}

export interface GcpConnectivityDependencies {
  createDocument(id: string): ConnectivityDocument;
  createObject(name: string): ConnectivityObject;
}

export class GcpConnectivityService {
  readonly #dependencies: GcpConnectivityDependencies;

  constructor(dependencies: GcpConnectivityDependencies) {
    this.#dependencies = dependencies;
  }

  async verifyFirestore(): Promise<void> {
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

  async verifyStorage(): Promise<void> {
    const expected = 'persona-ops-connectivity-check';
    const object = this.#dependencies.createObject(
      `_connectivity_checks/${randomUUID()}.txt`,
    );
    let created = false;

    try {
      await object.save(expected);
      created = true;

      const [content] = await object.download();
      if (content.toString('utf8') !== expected) {
        throw new Error('Connectivity check object content did not match.');
      }
    } finally {
      if (created) {
        await object.delete({ ignoreNotFound: true });
      }
    }
  }
}

export function createGcpConnectivityService({
  bucketName,
  projectId,
}: {
  bucketName: string;
  projectId: string;
}): GcpConnectivityService {
  const firestore = new Firestore({ projectId });
  const bucket = new Storage({ projectId }).bucket(bucketName);

  return new GcpConnectivityService({
    createDocument: (id) =>
      firestore.collection('_connectivity_checks').doc(id),
    createObject: (name) => bucket.file(name),
  });
}
