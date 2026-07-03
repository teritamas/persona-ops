import { randomUUID } from 'node:crypto';

import { Storage } from '@google-cloud/storage';

import { type StorageConnectivityPort } from '../../application/ports/storage-connectivity-port.js';

export interface ConnectivityObject {
  delete(options?: { ignoreNotFound?: boolean }): Promise<unknown>;
  download(): Promise<[Buffer]>;
  save(data: string): Promise<unknown>;
}

export interface StorageConnectivityDependencies {
  createObject(name: string): ConnectivityObject;
}

export class StorageConnectivityService implements StorageConnectivityPort {
  readonly #dependencies: StorageConnectivityDependencies;

  constructor(dependencies: StorageConnectivityDependencies) {
    this.#dependencies = dependencies;
  }

  async check(): Promise<void> {
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

export function createStorageConnectivityService({
  bucketName,
  projectId,
}: {
  bucketName: string;
  projectId: string;
}): StorageConnectivityService {
  const bucket = new Storage({ projectId }).bucket(bucketName);

  return new StorageConnectivityService({
    createObject: (name) => bucket.file(name),
  });
}
