import type { SourceDocument } from './source-document.js';

export interface SourceDocumentRepositoryPort {
  save(document: SourceDocument): Promise<void>;
  findByProjectId(projectId: string): Promise<SourceDocument[]>;
  findById(id: string): Promise<SourceDocument | null>;
  deleteById(id: string): Promise<void>;
}
