import type { Firestore } from '@google-cloud/firestore';

import type { Persona } from '../../domain/persona.js';
import type { PersonaStorePort } from '../../application/ports/infra/database/persona-store-port.js';

export class FirestorePersonaRepository implements PersonaStorePort {
  constructor(private readonly firestore: Firestore) {}

  async save(persona: Persona): Promise<void> {
    await this.firestore.collection('personas').doc(persona.id).set({
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
      .collection('personas')
      .where('projectId', '==', projectId)
      .get();
    return snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        projectId: String(data.projectId),
        name: String(data.name),
        role: String(data.role),
        traits: Array.isArray(data.traits)
          ? data.traits.map((value) => String(value))
          : [],
        background: String(data.background ?? ''),
        avatarSeed: String(data.avatarSeed),
        x: Number(data.x),
        y: Number(data.y),
        createdAt: new Date(String(data.createdAt)),
        updatedAt: new Date(String(data.updatedAt)),
      };
    });
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    const snapshot = await this.firestore
      .collection('personas')
      .where('projectId', '==', projectId)
      .get();
    const batch = this.firestore.batch();
    for (const document of snapshot.docs) {
      batch.delete(document.ref);
    }
    await batch.commit();
  }
}
