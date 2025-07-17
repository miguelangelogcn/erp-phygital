// src/types/role.ts

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export type NewRole = Omit<Role, 'id'>;
