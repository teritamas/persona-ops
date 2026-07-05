import type { Firestore } from '@google-cloud/firestore';
import { describe, expect, it } from 'vitest';

import { FirestoreProjectRepository } from '../../../src/infra/database/firestore-project-repository.js';

describe('FirestoreプロジェクトRepository', () => {
  it('transaction内でチャット作成とメッセージ追記を行う', async () => {
    let data: Record<string, unknown> = {
      name: 'プロジェクト',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      chats: [],
      activeChatId: null,
    };
    const reference = { id: 'project-1' };
    const firestore = {
      collection: () => ({
        doc: () => reference,
      }),
      runTransaction: async (
        callback: (transaction: {
          get: () => Promise<{
            exists: boolean;
            id: string;
            data: () => Record<string, unknown>;
          }>;
          set: (_reference: unknown, updated: Record<string, unknown>) => void;
        }) => Promise<unknown>,
      ) =>
        callback({
          get: () =>
            Promise.resolve({
              exists: true,
              id: 'project-1',
              data: () => data,
            }),
          set: (_document, updated) => {
            data = updated;
          },
        }),
    } as unknown as Firestore;
    const repository = new FirestoreProjectRepository(firestore);

    const created = await repository.createChat('project-1', {
      id: 'chat-1',
      title: 'チャット',
      type: 'agent',
      messages: [],
    });
    const updated = await repository.appendChatMessages('project-1', 'chat-1', [
      { id: 'message-1', role: 'user', text: '本文', time: '10:00' },
    ]);

    expect(created.activeChatId).toBe('chat-1');
    expect(updated.chats?.[0]?.messages[0]?.text).toBe('本文');
  });
});
