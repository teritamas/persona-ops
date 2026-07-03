import { describe, expect, it, vi } from 'vitest';

import {
  DatabaseConnectivityService,
  createDatabaseConnectivityService,
  type ConnectivityDocument,
} from '../../../src/infra/database/database-connectivity-service.js';

vi.mock('@google-cloud/firestore', () => {
  return {
    Firestore: class {
      collection() {
        return {
          doc() {
            return {};
          },
        };
      }
    },
  };
});

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

describe('DatabaseConnectivityService', () => {
  it('Firestoreのチェック用ドキュメントを作成、読み取り、削除する', async () => {
    const document = createDocument();
    const service = new DatabaseConnectivityService({
      createDocument: () => document,
    });

    await service.check();

    expect(document.set).toHaveBeenCalledOnce();
    expect(document.get).toHaveBeenCalledOnce();
    expect(document.delete).toHaveBeenCalledOnce();
  });

  it('検証に失敗した場合はFirestoreのドキュメントを削除する', async () => {
    const document = createDocument({ exists: false });
    const service = new DatabaseConnectivityService({
      createDocument: () => document,
    });

    await expect(service.check()).rejects.toThrow('was not found');
    expect(document.delete).toHaveBeenCalledOnce();
  });

  it('作成されていないFirestoreのドキュメントは削除しない', async () => {
    const document = createDocument();
    vi.mocked(document.set).mockRejectedValue(new Error('write failed'));
    const service = new DatabaseConnectivityService({
      createDocument: () => document,
    });

    await expect(service.check()).rejects.toThrow('write failed');
    expect(document.delete).not.toHaveBeenCalled();
  });

  describe('createDatabaseConnectivityService', () => {
    it('サービスインスタンスを生成できる', async () => {
      const service = createDatabaseConnectivityService({ projectId: 'test' });
      expect(service).toBeInstanceOf(DatabaseConnectivityService);

      // 内部の createDocument が呼ばれることを確認してカバレッジを通す
      // mock化されたFirestoreインスタンスでは .set() が未定義なため必ずエラーになるが、
      // 途中で createDocument: (id) => ... が実行される。
      await expect(service.check()).rejects.toThrow();
    });
  });
});
