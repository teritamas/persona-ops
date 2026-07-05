import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SourceDocumentService } from '../../src/application/source-document/source-document-service.js';
import type { SourceDocumentRepositoryPort } from '../../src/application/ports/infra/database/source-document-repository-port.js';
import type { DocumentFetcherPort } from '../../src/application/ports/document-fetcher-port.js';
import { NotFoundError } from '../../src/domain/errors.js';
import type { SourceDocument } from '../../src/domain/source-document/source-document.js';

describe('参照資料サービス', () => {
  let mockRepository: SourceDocumentRepositoryPort;
  let mockFetcher: DocumentFetcherPort;
  let service: SourceDocumentService;

  beforeEach(() => {
    mockRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      findByProjectId: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
      deleteById: vi.fn().mockResolvedValue(undefined),
    };

    mockFetcher = {
      fetch: vi.fn().mockResolvedValue('Hello World'),
    };

    service = new SourceDocumentService(mockRepository, mockFetcher);
  });

  it('URL資料を保存して内容を取得する', async () => {
    const doc = await service.addSourceDocument({
      projectId: 'project-1',
      type: 'url',
      reference: 'https://example.com',
    });

    expect(doc.type).toBe('url');
    expect(doc.fetchStatus).toBe('success');
    expect(doc.contentSnapshot).toBe('Hello World');
    expect(mockRepository.save).toHaveBeenCalledTimes(2); // Initial save + Success update
    expect(mockFetcher.fetch).toHaveBeenCalledWith('https://example.com');
  });

  it('資料取得のErrorを保存する', async () => {
    mockFetcher.fetch = vi.fn().mockRejectedValue(new Error('Fetch failed'));

    const doc = await service.addSourceDocument({
      projectId: 'project-1',
      type: 'url',
      reference: 'https://error.com',
    });

    expect(doc.fetchStatus).toBe('error');
    expect(doc.errorMessage).toBe('Fetch failed');
    expect(mockRepository.save).toHaveBeenCalledTimes(2);
  });

  it('Error以外の資料取得失敗も保存する', async () => {
    mockFetcher.fetch = vi.fn().mockRejectedValue('String error');

    const doc = await service.addSourceDocument({
      projectId: 'project-1',
      type: 'url',
      reference: 'https://error.com',
    });

    expect(doc.fetchStatus).toBe('error');
    expect(doc.errorMessage).toBe('String error');
    expect(mockRepository.save).toHaveBeenCalledTimes(2);
  });

  it('チャット資料は外部取得せず保存する', async () => {
    const doc = await service.addSourceDocument({
      projectId: 'project-1',
      type: 'chat',
      reference: 'Chat summary',
    });

    expect(doc.type).toBe('chat');
    expect(doc.fetchStatus).toBe('success');
    expect(doc.contentSnapshot).toBe('Chat summary');
    expect(mockFetcher.fetch).not.toHaveBeenCalled();
    expect(mockRepository.save).toHaveBeenCalledTimes(2);
  });

  it('プロジェクトに紐づく資料を取得する', async () => {
    await service.getDocumentsByProjectId('project-1');
    expect(mockRepository.findByProjectId).toHaveBeenCalledWith('project-1');
  });

  it('資料をプロジェクトの所有関係を確認して削除する', async () => {
    mockRepository.findById = vi.fn().mockResolvedValue({
      id: 'doc-1',
      projectId: 'project-1',
      type: 'url',
      reference: 'https://example.com',
      fetchStatus: 'success',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await service.deleteDocument('project-1', 'doc-1');
    expect(mockRepository.deleteById).toHaveBeenCalledWith(
      'project-1',
      'doc-1',
    );
  });

  it('成功した資料だけを件数・文字数制限付きで再利用する', async () => {
    const documents = Array.from({ length: 7 }, (_, index) => ({
      id: `doc-${index}`,
      projectId: 'project-1',
      type: 'url' as const,
      reference: `https://example.com/${index}`,
      fetchStatus: index === 0 ? ('error' as const) : ('success' as const),
      contentSnapshot: 'a'.repeat(7_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    })) satisfies SourceDocument[];
    mockRepository.findByProjectId = vi.fn().mockResolvedValue(documents);

    const context = await service.getReusableContext('project-1');

    expect(context).toHaveLength(5);
    expect(context[0]?.contentSnapshot).toHaveLength(6_000);
    expect(
      context.every((document) => document.fetchStatus === 'success'),
    ).toBe(true);
  });

  it('別プロジェクトまたは存在しない資料の削除を拒否する', async () => {
    await expect(
      service.deleteDocument('project-1', 'missing'),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
