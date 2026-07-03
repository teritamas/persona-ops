import { describe, expect, it, vi } from 'vitest';

import {
  GcpConnectivityService,
  type ConnectivityDocument,
  type ConnectivityObject,
} from '../src/services/gcp-connectivity-service.js';

function createDocument({
  exists = true,
}: {
  exists?: boolean;
} = {}): ConnectivityDocument {
  return {
    delete: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ exists }),
    set: vi.fn().mockResolvedValue(undefined),
  };
}

function createObject({
  content = 'persona-ops-connectivity-check',
}: {
  content?: string;
} = {}): ConnectivityObject {
  return {
    delete: vi.fn().mockResolvedValue(undefined),
    download: vi.fn().mockResolvedValue([Buffer.from(content)]),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

describe('GcpConnectivityService', () => {
  it('Firestoreのチェック用ドキュメントを作成、読み取り、削除する', async () => {
    const document = createDocument();
    const service = new GcpConnectivityService({
      createDocument: () => document,
      createObject: () => createObject(),
    });

    await service.verifyFirestore();

    expect(document.set).toHaveBeenCalledOnce();
    expect(document.get).toHaveBeenCalledOnce();
    expect(document.delete).toHaveBeenCalledOnce();
  });

  it('検証に失敗した場合はFirestoreのドキュメントを削除する', async () => {
    const document = createDocument({ exists: false });
    const service = new GcpConnectivityService({
      createDocument: () => document,
      createObject: () => createObject(),
    });

    await expect(service.verifyFirestore()).rejects.toThrow('was not found');
    expect(document.delete).toHaveBeenCalledOnce();
  });

  it('作成されていないFirestoreのドキュメントは削除しない', async () => {
    const document = createDocument();
    vi.mocked(document.set).mockRejectedValue(new Error('write failed'));
    const service = new GcpConnectivityService({
      createDocument: () => document,
      createObject: () => createObject(),
    });

    await expect(service.verifyFirestore()).rejects.toThrow('write failed');
    expect(document.delete).not.toHaveBeenCalled();
  });

  it('Storageのチェック用オブジェクトを作成、読み取り、削除する', async () => {
    const object = createObject();
    const service = new GcpConnectivityService({
      createDocument: () => createDocument(),
      createObject: () => object,
    });

    await service.verifyStorage();

    expect(object.save).toHaveBeenCalledOnce();
    expect(object.download).toHaveBeenCalledOnce();
    expect(object.delete).toHaveBeenCalledWith({ ignoreNotFound: true });
  });

  it('検証に失敗した場合はStorageのオブジェクトを削除する', async () => {
    const object = createObject({ content: 'unexpected' });
    const service = new GcpConnectivityService({
      createDocument: () => createDocument(),
      createObject: () => object,
    });

    await expect(service.verifyStorage()).rejects.toThrow('did not match');
    expect(object.delete).toHaveBeenCalledOnce();
  });

  it('作成されていないStorageのオブジェクトは削除しない', async () => {
    const object = createObject();
    vi.mocked(object.save).mockRejectedValue(new Error('write failed'));
    const service = new GcpConnectivityService({
      createDocument: () => createDocument(),
      createObject: () => object,
    });

    await expect(service.verifyStorage()).rejects.toThrow('write failed');
    expect(object.delete).not.toHaveBeenCalled();
  });
});
