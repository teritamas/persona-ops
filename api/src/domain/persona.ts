export interface Persona {
  id: string;
  projectId: string;
  name: string;
  role: string;
  traits: string[];
  background: string;
  avatarSeed: string;
  x: number;
  y: number;
  createdAt: Date;
  updatedAt: Date;
}
