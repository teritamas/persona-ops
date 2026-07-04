export interface Message {
  id: string;
  role: 'user' | 'agent' | 'persona';
  text: string;
  time: string;
  isSystem?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  type?: 'agent' | 'persona';
  personaId?: string;
  messages: Message[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  chats?: Chat[];
  activeChatId?: string | null;
}
