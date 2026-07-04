export type SourceDocumentType = 'url' | 'chat';
export type SourceDocumentFetchStatus = 'pending' | 'success' | 'error';

export interface SourceDocument {
  id: string;
  projectId: string;
  type: SourceDocumentType;
  reference: string;
  fetchStatus: SourceDocumentFetchStatus;
  contentSnapshot?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}
