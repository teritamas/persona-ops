import type { SourceDocumentType } from '../../../domain/source-document/source-document.js';

export interface AddSourceDocumentRequest {
  projectId: string;
  type: SourceDocumentType;
  reference: string;
}
