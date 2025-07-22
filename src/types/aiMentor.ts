// src/types/aiMentor.ts

export interface AiMentor {
  id: string;
  name: string;
  specialty: string;
  avatarUrl: string;
  convaiCharacterId: string;
}

export type NewAiMentor = Omit<AiMentor, 'id'>;
