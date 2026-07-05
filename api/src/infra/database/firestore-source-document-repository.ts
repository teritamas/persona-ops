import type { Firestore, CollectionReference } from '@google-cloud/firestore';
import type { SourceDocumentRepositoryPort } from '../../application/ports/infra/database/source-document-repository-port.js';
import type { SourceDocument } from '../../domain/source-document/source-document.js';

export class FirestoreSourceDocumentRepository implements SourceDocumentRepositoryPort {
  private readonly collection: CollectionReference;

  constructor(firestore: Firestore) {
    this.collection = firestore.collection('sourceDocuments');
  }

  async save(document: SourceDocument): Promise<void> {
    const docRef = this.collection.doc(document.id);
    await docRef.set({
      ...document,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    });
  }

  async findByProjectId(projectId: string): Promise<SourceDocument[]> {
    const snapshot = await this.collection
      .where('projectId', '==', projectId)
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs
      .map((doc) => this.mapDocument(doc.id, doc.data()))
      .sort(
        (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
      );
  }

  async findById(
    projectId: string,
    documentId: string,
  ): Promise<SourceDocument | null> {
    const docRef = this.collection.doc(documentId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) return null;

    const document = this.mapDocument(doc.id, data);
    return document.projectId === projectId ? document : null;
  }

  async deleteById(projectId: string, documentId: string): Promise<void> {
    const document = await this.findById(projectId, documentId);
    if (!document) {
      return;
    }
    const docRef = this.collection.doc(documentId);
    await docRef.delete();
  }

  private mapDocument(
    id: string,
    data: Record<string, unknown>,
  ): SourceDocument {
    const contentSnapshot =
      typeof data.contentSnapshot === 'string'
        ? { contentSnapshot: data.contentSnapshot }
        : {};
    const errorMessage =
      typeof data.errorMessage === 'string'
        ? { errorMessage: data.errorMessage }
        : {};
    return {
      id,
      projectId: String(data.projectId),
      type: data.type === 'chat' ? 'chat' : 'url',
      reference: String(data.reference),
      fetchStatus:
        data.fetchStatus === 'success' || data.fetchStatus === 'error'
          ? data.fetchStatus
          : 'pending',
      ...contentSnapshot,
      ...errorMessage,
      createdAt: new Date(String(data.createdAt)),
      updatedAt: new Date(String(data.updatedAt)),
    };
  }
}
