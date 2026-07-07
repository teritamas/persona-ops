import type { Firestore } from '@google-cloud/firestore';

import type { ProjectDataDeletionPort } from '../../application/ports/infra/database/project-data-deletion-port.js';

export class FirestoreProjectDataDeletion implements ProjectDataDeletionPort {
  constructor(private readonly firestore: Firestore) {}

  async deleteProjectData(projectId: string): Promise<void> {
    const projectReference = this.firestore
      .collection('projects')
      .doc(projectId);

    // 1. トップレベルの関連ドキュメント（personas, sourceDocuments）の取得
    const [personasSnapshot, sourceDocumentsSnapshot] = await Promise.all([
      this.firestore
        .collection('personas')
        .where('projectId', '==', projectId)
        .get(),
      this.firestore
        .collection('sourceDocuments')
        .where('projectId', '==', projectId)
        .get(),
    ]);

    // 2. requirements サブコレクションとその versions サブコレクションの取得
    const requirementsRef = projectReference.collection('requirements');
    const requirementsSnapshot = await requirementsRef.get();
    const requirementVersionRefs: any[] = [];
    for (const reqDoc of requirementsSnapshot.docs) {
      const versionsSnapshot = await reqDoc.ref.collection('versions').get();
      versionsSnapshot.docs.forEach((verDoc) => {
        requirementVersionRefs.push(verDoc.ref);
      });
    }

    // 3. simulations サブコレクションとその reactions サブコレクションの取得
    const simulationsRef = projectReference.collection('simulations');
    const simulationsSnapshot = await simulationsRef.get();
    const simulationReactionRefs: any[] = [];
    for (const simDoc of simulationsSnapshot.docs) {
      const reactionsSnapshot = await simDoc.ref.collection('reactions').get();
      reactionsSnapshot.docs.forEach((reactDoc) => {
        simulationReactionRefs.push(reactDoc.ref);
      });
    }

    // 4. すべての削除対象ドキュメントの参照を収集
    const allRefsToDelete = [
      ...personasSnapshot.docs.map((doc) => doc.ref),
      ...sourceDocumentsSnapshot.docs.map((doc) => doc.ref),
      ...requirementVersionRefs,
      ...requirementsSnapshot.docs.map((doc) => doc.ref),
      ...simulationReactionRefs,
      ...simulationsSnapshot.docs.map((doc) => doc.ref),
      projectReference,
    ];

    // 5. 個別に非同期削除を実行（bulkWriterを使わずPromise.allで確実に削除）
    await Promise.all(
      allRefsToDelete.map(async (ref) => {
        try {
          await ref.delete();
        } catch (err) {
          console.warn(`Failed to delete document at ${ref.path}:`, err);
        }
      }),
    );
  }
}
