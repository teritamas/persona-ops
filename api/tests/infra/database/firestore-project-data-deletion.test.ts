import type { Firestore } from '@google-cloud/firestore';
import { describe, expect, it, vi } from 'vitest';

import { FirestoreProjectDataDeletion } from '../../../src/infra/database/firestore-project-data-deletion.js';

describe('Firestoreプロジェクト関連データ削除', () => {
  it('Projectサブコレクションと関連トップレベルDocumentを削除する', async () => {
    const deleteDocument = vi.fn(() => Promise.resolve());
    const close = vi.fn(() => Promise.resolve());
    const recursiveDelete = vi.fn(() => Promise.resolve());
    const projectReference = { path: 'projects/project-1' };
    const querySnapshot = {
      docs: [{ ref: { path: 'related/1' } }],
    };
    const firestore = {
      collection: (name: string) => {
        if (name === 'projects') {
          return { doc: () => projectReference };
        }
        return {
          where: () => ({
            get: () => Promise.resolve(querySnapshot),
          }),
        };
      },
      bulkWriter: () => ({
        delete: deleteDocument,
        close,
      }),
      recursiveDelete,
    } as unknown as Firestore;
    const deletion = new FirestoreProjectDataDeletion(firestore);

    await deletion.deleteProjectData('project-1');

    expect(deleteDocument).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledOnce();
    expect(recursiveDelete).toHaveBeenCalledWith(projectReference);
  });
});
