import type { Firestore } from '@google-cloud/firestore';
import { NotFoundError } from '../../domain/errors.js';
import type { Project, Chat, Message } from '../../domain/project.js';
import type { ProjectRepositoryPort } from '../../application/ports/infra/database/project-repository-port.js';

export class FirestoreProjectRepository implements ProjectRepositoryPort {
  private readonly collectionName = 'projects';

  constructor(private readonly firestore: Firestore) {}

  async save(project: Project): Promise<void> {
    const docRef = this.firestore
      .collection(this.collectionName)
      .doc(project.id);
    await docRef.set(this.toProjectData(project));
  }

  async findAll(): Promise<Project[]> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .orderBy('createdAt', 'asc')
      .get();
    return snapshot.docs.map((document) =>
      this.mapProject(document.id, document.data()),
    );
  }

  async findById(id: string): Promise<Project | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return null;
    }

    return this.mapProject(snapshot.id, snapshot.data() ?? {});
  }

  async updateName(
    projectId: string,
    name: string,
    updatedAt: Date,
  ): Promise<void> {
    await this.firestore.collection(this.collectionName).doc(projectId).update({
      name,
      updatedAt: updatedAt.toISOString(),
    });
  }

  async delete(id: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    await docRef.delete();
  }

  async createChat(projectId: string, chat: Chat): Promise<Project> {
    return this.updateAtomically(projectId, (project) => ({
      ...project,
      chats: [...(project.chats ?? []), chat],
      activeChatId: chat.id,
    }));
  }

  async setActiveChat(projectId: string, chatId: string): Promise<Project> {
    return this.updateAtomically(projectId, (project) => {
      if (!(project.chats ?? []).some((chat) => chat.id === chatId)) {
        throw new NotFoundError('Chat', chatId);
      }
      return { ...project, activeChatId: chatId };
    });
  }

  async appendChatMessages(
    projectId: string,
    chatId: string,
    messages: Message[],
  ): Promise<Project> {
    return this.updateAtomically(projectId, (project) => {
      let found = false;
      const chats = (project.chats ?? []).map((chat) => {
        if (chat.id !== chatId) {
          return chat;
        }
        found = true;
        return {
          ...chat,
          messages: [...chat.messages, ...messages],
        };
      });
      if (!found) {
        throw new NotFoundError('Chat', chatId);
      }
      return { ...project, chats };
    });
  }

  private async updateAtomically(
    projectId: string,
    update: (project: Project) => Project,
  ): Promise<Project> {
    const reference = this.firestore
      .collection(this.collectionName)
      .doc(projectId);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) {
        throw new NotFoundError('Project', projectId);
      }
      const project = this.mapProject(snapshot.id, snapshot.data() ?? {});
      const updated = update({
        ...project,
        updatedAt: new Date(),
      });
      transaction.set(reference, this.toProjectData(updated));
      return updated;
    });
  }

  private toProjectData(project: Project): Record<string, unknown> {
    return {
      name: project.name,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      chats: project.chats ?? [],
      activeChatId: project.activeChatId ?? null,
    };
  }

  private mapProject(id: string, data: Record<string, unknown>): Project {
    const chats: Chat[] = Array.isArray(data.chats)
      ? (data.chats as Chat[]).map((chat) => ({
          ...chat,
          type: chat.type === 'persona' ? 'persona' : 'agent',
          messages: Array.isArray(chat.messages) ? chat.messages : [],
        }))
      : [];
    return {
      id,
      name: String(data.name),
      createdAt: new Date(String(data.createdAt)),
      updatedAt: new Date(String(data.updatedAt)),
      chats,
      activeChatId:
        typeof data.activeChatId === 'string' ? data.activeChatId : null,
    };
  }
}
