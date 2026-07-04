import type { Firestore } from '@google-cloud/firestore';
import type { Persona } from '../../domain/persona.js';
import type { PersonaRepositoryPort } from '../../application/ports/persona-repository-port.js';

export class FirestorePersonaRepository implements PersonaRepositoryPort {
  private readonly collectionName = 'personas';

  constructor(private readonly firestore: Firestore) {}

  async save(persona: Persona): Promise<void> {
    const docRef = this.firestore
      .collection(this.collectionName)
      .doc(persona.id);
    await docRef.set({
      projectId: persona.projectId,
      name: persona.name,
      role: persona.role,
      traits: persona.traits,
      background: persona.background,
      avatarSeed: persona.avatarSeed,
      x: persona.x,
      y: persona.y,
      createdAt: persona.createdAt.toISOString(),
      updatedAt: persona.updatedAt.toISOString(),
    });
  }

  async findByProjectId(projectId: string): Promise<Persona[]> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('projectId', '==', projectId)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data() as {
        projectId: string;
        name: string;
        role: string;
        traits: string[];
        background: string;
        avatarSeed: string;
        x: number;
        y: number;
        createdAt: string;
        updatedAt: string;
      };
      return {
        id: doc.id,
        projectId: data.projectId,
        name: data.name,
        role: data.role,
        traits: data.traits,
        background: data.background,
        avatarSeed: data.avatarSeed,
        x: data.x,
        y: data.y,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };
    });
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('projectId', '==', projectId)
      .get();

    if (snapshot.empty) {
      return;
    }

    const batch = this.firestore.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
}
