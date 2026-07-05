import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../../domain/errors.js';
import type { SourceDocumentRepositoryPort } from '../ports/infra/database/source-document-repository-port.js';
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
      document.fetchStatus = 'success';
      document.contentSnapshot = request.reference;
      document.updatedAt = new Date();
      await this.sourceDocumentRepository.save(document);
    }

    return document;
  }

  async getDocumentsByProjectId(projectId: string): Promise<SourceDocument[]> {
    return this.sourceDocumentRepository.findByProjectId(projectId);
  }

  async getReusableContext(projectId: string): Promise<SourceDocument[]> {
    const documents =
      await this.sourceDocumentRepository.findByProjectId(projectId);
    return documents
      .filter(
        (document) =>
          document.fetchStatus === 'success' &&
          typeof document.contentSnapshot === 'string',
      )
      .slice(0, 5)
      .map((document) => ({
        ...document,
        contentSnapshot: document.contentSnapshot!.slice(0, 6_000),
      }));
  }

  async deleteDocument(projectId: string, documentId: string): Promise<void> {
    const document = await this.sourceDocumentRepository.findById(
      projectId,
      documentId,
    );
    if (!document) {
      throw new NotFoundError('SourceDocument', documentId);
    }
    await this.sourceDocumentRepository.deleteById(projectId, documentId);
  }
}
