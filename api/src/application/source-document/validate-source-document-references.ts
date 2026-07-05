import { ValidationError } from '../../domain/errors.js';
import type { SourceDocumentRepositoryPort } from '../ports/infra/database/source-document-repository-port.js';

export async function validateSourceDocumentReferences(
  repository: SourceDocumentRepositoryPort,
  projectId: string,
  sourceDocumentIds: readonly string[],
): Promise<void> {
  const uniqueIds = new Set(sourceDocumentIds);

  for (const documentId of uniqueIds) {
    const document = await repository.findById(projectId, documentId);
    if (!document || document.fetchStatus !== 'success') {
      throw new ValidationError(`参照可能な資料ではありません: ${documentId}`);
    }
  }
}
