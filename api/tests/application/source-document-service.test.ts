import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SourceDocumentService } from '../../src/application/source-document/source-document-service.js';
import type { SourceDocumentRepositoryPort } from '../../src/domain/source-document/source-document-repository.js';
import type { DocumentFetcherPort } from '../../src/application/ports/document-fetcher-port.js';

describe('SourceDocumentService', () => {
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

  it('addSourceDocument saves url and fetches content', async () => {
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

  it('addSourceDocument handles fetch error', async () => {
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

  it('addSourceDocument handles non-Error fetch rejection', async () => {
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

  it('addSourceDocument saves chat without fetching', async () => {
    const doc = await service.addSourceDocument({
      projectId: 'project-1',
      type: 'chat',
      reference: 'Chat summary',
    });

    expect(doc.type).toBe('chat');
    expect(doc.fetchStatus).toBe('success');
    expect(mockFetcher.fetch).not.toHaveBeenCalled();
    expect(mockRepository.save).toHaveBeenCalledTimes(2);
  });

  it('getDocumentsByProjectId returns documents', async () => {
    await service.getDocumentsByProjectId('project-1');
    expect(mockRepository.findByProjectId).toHaveBeenCalledWith('project-1');
  });

  it('deleteDocument deletes document', async () => {
    await service.deleteDocument('doc-1');
    expect(mockRepository.deleteById).toHaveBeenCalledWith('doc-1');
  });
});
