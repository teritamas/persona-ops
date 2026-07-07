import type { Firestore } from '@google-cloud/firestore';
import { describe, expect, it, vi } from 'vitest';

import { FirestoreProjectDataDeletion } from '../../../src/infra/database/firestore-project-data-deletion.js';

describe('Firestoreプロジェクト関連データ削除', () => {
  it('Projectサブコレクションと関連トップレベルDocumentを削除する', async () => {
    const deleteFn = vi.fn(() => Promise.resolve());

    const docMock = (path: string) => ({
      ref: {
        path,
        delete: deleteFn,
      },
    });

    const firestore = {
      collection: (collectionName: string) => {
        if (collectionName === 'projects') {
          return {
            doc: (projectId: string) => {
              const projectRef = {
                path: `projects/${projectId}`,
                delete: deleteFn,
                collection: (subName: string) => {
                  return {
                    get: async () => {
                      if (subName === 'requirements') {
                        return {
                          docs: [
                            {
                              ref: {
                                path: `projects/${projectId}/requirements/req-1`,
                                delete: deleteFn,
                                collection: () => ({
                                  get: async () => ({
                                    docs: [
                                      docMock(
                                        `projects/${projectId}/requirements/req-1/versions/1`,
                                      ),
                                    ],
                                  }),
                                }),
                              },
                            },
                          ],
                        };
                      }
                      if (subName === 'simulations') {
                        return {
                          docs: [
                            {
                              ref: {
                                path: `projects/${projectId}/simulations/sim-1`,
                                delete: deleteFn,
                                collection: () => ({
                                  get: async () => ({
                                    docs: [
                                      docMock(
                                        `projects/${projectId}/simulations/sim-1/reactions/p-1`,
                                      ),
                                    ],
                                  }),
                                }),
                              },
                            },
                          ],
                        };
                      }
                      return { docs: [] };
                    },
                  };
                },
              };
              return projectRef;
            },
          };
        }

        return {
          where: () => ({
            get: async () => {
              if (collectionName === 'personas') {
                return {
                  docs: [docMock(`personas/p-1`)],
                };
              }
              if (collectionName === 'sourceDocuments') {
                return {
                  docs: [docMock(`sourceDocuments/doc-1`)],
                };
              }
              return { docs: [] };
            },
          }),
        };
      },
    } as unknown as Firestore;

    const deletion = new FirestoreProjectDataDeletion(firestore);

    await deletion.deleteProjectData('project-1');

    // Expected deletions:
    // - 1 persona
    // - 1 sourceDocument
    // - 1 requirement version
    // - 1 requirement
    // - 1 simulation reaction
    // - 1 simulation
    // - 1 project document
    // Total 7 calls
    expect(deleteFn).toHaveBeenCalledTimes(7);
  });
});
