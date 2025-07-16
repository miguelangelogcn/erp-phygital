// src/types/task.ts

export type TaskStatus = "todo" | "doing" | "done";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  order?: number; // To maintain order within a column
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}
