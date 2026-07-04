import type { Firestore, CollectionReference } from '@google-cloud/firestore';
import type { SourceDocumentRepositoryPort } from '../../domain/source-document/source-document-repository.js';
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

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: new Date(data.createdAt as string),
        updatedAt: new Date(data.updatedAt as string),
      } as SourceDocument;
    });
  }

  async findById(id: string): Promise<SourceDocument | null> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) return null;

    return {
      ...data,
      id: doc.id,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
    } as SourceDocument;
  }

  async deleteById(id: string): Promise<void> {
    const docRef = this.collection.doc(id);
    await docRef.delete();
  }
}
