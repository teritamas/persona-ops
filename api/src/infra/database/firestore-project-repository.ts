import { Firestore } from '@google-cloud/firestore';
import { Project } from '../../domain/project.js';
import { ProjectRepositoryPort } from '../../application/ports/project-repository-port.js';

export class FirestoreProjectRepository implements ProjectRepositoryPort {
  private readonly collectionName = 'projects';

  constructor(private readonly firestore: Firestore) {}

  async save(project: Project): Promise<void> {
    const docRef = this.firestore
      .collection(this.collectionName)
      .doc(project.id);
    await docRef.set({
      name: project.name,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    });
  }

  async findAll(): Promise<Project[]> {
    const snapshot = await this.firestore.collection(this.collectionName).get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };
    });
  }

  async findById(id: string): Promise<Project | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data()!;
    return {
      id: snapshot.id,
      name: data.name,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }
}
