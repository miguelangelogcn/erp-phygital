// src/types/task.ts

import type { Timestamp } from "firebase/firestore";

export type TaskStatus = "todo" | "doing" | "done";

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
  responsibleId?: string;
  dueDate?: Timestamp | null;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  order?: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  dueDate?: Timestamp | null;
  responsibleId?: string;
  assistantIds?: string[];
  clientId?: string;
  checklist?: ChecklistItem[];
}

// Para criar uma nova tarefa, omitimos o 'id' e tornamos os Timestamps opcionais
export type NewTask = Omit<Task, "id" | "createdAt" | "updatedAt"> & {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};
