import type { Firestore } from '@google-cloud/firestore';
import type { Project, Chat } from '../../domain/project.js';
import type { ProjectRepositoryPort } from '../../application/ports/project-repository-port.js';

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
      chats: project.chats || [],
      activeChatId: project.activeChatId || null,
    });
  }

  async findAll(): Promise<Project[]> {
    const snapshot = await this.firestore.collection(this.collectionName).get();
    return snapshot.docs.map((doc) => {
      const data = doc.data() as {
        name: string;
        createdAt: string;
        updatedAt: string;
        chats?: Chat[];
        activeChatId?: string | null;
      };
      return {
        id: doc.id,
        name: data.name,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        chats: data.chats || [],
        activeChatId: data.activeChatId || null,
      };
    });
  }

  async findById(id: string): Promise<Project | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data() as {
      name: string;
      createdAt: string;
      updatedAt: string;
      chats?: Chat[];
      activeChatId?: string | null;
    };
    return {
      id: snapshot.id,
      name: data.name,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      chats: data.chats || [],
      activeChatId: data.activeChatId || null,
    };
  }
}
