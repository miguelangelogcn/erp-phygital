// src/types/team.ts

export interface Team {
  id: string;
  name: string;
  leaderId: string;
  memberIds: string[];
}

export type NewTeam = Omit<Team, 'id'>;
