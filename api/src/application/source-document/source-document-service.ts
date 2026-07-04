import { randomUUID } from 'node:crypto';
import type { SourceDocumentRepositoryPort } from '../../domain/source-document/source-document-repository.js';
import type { DocumentFetcherPort } from '../ports/document-fetcher-port.js';
import type { AddSourceDocumentRequest } from './dto/add-source-document-request.js';
import type { SourceDocument } from '../../domain/source-document/source-document.js';

export class SourceDocumentService {
  constructor(
    private readonly sourceDocumentRepository: SourceDocumentRepositoryPort,
    private readonly httpDocumentFetcher: DocumentFetcherPort,
  ) {}

  async addSourceDocument(
    request: AddSourceDocumentRequest,
  ): Promise<SourceDocument> {
    const now = new Date();
    const document: SourceDocument = {
      id: randomUUID(),
      projectId: request.projectId,
      type: request.type,
      reference: request.reference,
      fetchStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    // 一旦 pending 状態で保存
    await this.sourceDocumentRepository.save(document);

    // 非同期または同期的フェッチ（今回はawaitで待つ）
    if (request.type === 'url') {
      try {
        const content = await this.httpDocumentFetcher.fetch(request.reference);
        document.fetchStatus = 'success';
        document.contentSnapshot = content;
      } catch (error) {
        document.fetchStatus = 'error';
        document.errorMessage =
          error instanceof Error ? error.message : String(error);
      }
      document.updatedAt = new Date();
      await this.sourceDocumentRepository.save(document);
    } else if (request.type === 'chat') {
      // チャットの場合はフェッチ処理をスキップし、そのまま success とする（必要に応じて変更）
      document.fetchStatus = 'success';
      document.updatedAt = new Date();
      await this.sourceDocumentRepository.save(document);
    }

    return document;
  }

  async getDocumentsByProjectId(projectId: string): Promise<SourceDocument[]> {
    return this.sourceDocumentRepository.findByProjectId(projectId);
  }

  async deleteDocument(id: string): Promise<void> {
    await this.sourceDocumentRepository.deleteById(id);
  }
}
