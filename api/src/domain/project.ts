export interface ProposalData {
  buttonText: string;
  inputText: string;
  style?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'agent' | 'persona' | 'system' | 'proposal';
  text: string;
  time: string;
  isSystem?: boolean;
  proposal?: ProposalData;
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
