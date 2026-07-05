import type { SourceDocument } from '../../../../domain/source-document/source-document.js';

export interface SourceDocumentRepositoryPort {
  save(document: SourceDocument): Promise<void>;
  findByProjectId(projectId: string): Promise<SourceDocument[]>;
  findById(
    projectId: string,
    documentId: string,
  ): Promise<SourceDocument | null>;
  deleteById(projectId: string, documentId: string): Promise<void>;
}
