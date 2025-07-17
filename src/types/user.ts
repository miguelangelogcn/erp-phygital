export interface User {
  id: string;
  name: string;
  email: string;
  roleId?: string; // Alterado de role para roleId
  teamId?: string; // Adicionado teamId
  permissions?: string[];
  isLeader?: boolean;
}
