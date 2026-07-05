import type { SourceDocumentRepositoryPort } from '../../src/application/ports/infra/database/source-document-repository-port.js';
import type { SourceDocument } from '../../src/domain/source-document/source-document.js';

export class MemorySourceDocumentRepository implements SourceDocumentRepositoryPort {
  readonly documents = new Map<string, SourceDocument>();

  save(document: SourceDocument): Promise<void> {
    this.documents.set(document.id, document);
    return Promise.resolve();
  }

  findByProjectId(projectId: string): Promise<SourceDocument[]> {
    return Promise.resolve(
      [...this.documents.values()].filter(
        (document) => document.projectId === projectId,
      ),
    );
  }

  findById(
    projectId: string,
    documentId: string,
  ): Promise<SourceDocument | null> {
    const document = this.documents.get(documentId);
    return Promise.resolve(document?.projectId === projectId ? document : null);
  }

  deleteById(_projectId: string, documentId: string): Promise<void> {
    this.documents.delete(documentId);
    return Promise.resolve();
  }
}
