import type { Firestore, QueryDocumentSnapshot } from '@google-cloud/firestore';

import type { ProjectDataDeletionPort } from '../../application/ports/infra/database/project-data-deletion-port.js';

export class FirestoreProjectDataDeletion implements ProjectDataDeletionPort {
  constructor(private readonly firestore: Firestore) {}

  async deleteProjectData(projectId: string): Promise<void> {
    const projectReference = this.firestore
      .collection('projects')
      .doc(projectId);
    const [personas, sourceDocuments] = await Promise.all([
      this.firestore
        .collection('personas')
        .where('projectId', '==', projectId)
        .get(),
      this.firestore
        .collection('sourceDocuments')
        .where('projectId', '==', projectId)
        .get(),
    ]);

    await this.deleteDocuments([...personas.docs, ...sourceDocuments.docs]);
    await this.firestore.recursiveDelete(projectReference);
  }

  private async deleteDocuments(
    documents: QueryDocumentSnapshot[],
  ): Promise<void> {
    if (documents.length === 0) {
      return;
    }
    const writer = this.firestore.bulkWriter();
    await Promise.all(documents.map((document) => writer.delete(document.ref)));
    await writer.close();
  }
}
