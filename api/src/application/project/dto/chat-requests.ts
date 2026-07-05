import type { Message } from '../../../domain/project.js';

export interface CreateChatRequest {
  title: string;
  type: 'agent' | 'persona';
  personaId?: string | undefined;
  initialMessages?: Message[] | undefined;
}
