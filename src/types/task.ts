// src/types/task.ts

import type { Timestamp } from "firebase/firestore";

export type TaskStatus = "todo" | "doing" | "done";
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
  responsibleId?: string;
  dueDate?: Timestamp | null;
}

export interface TaskProof {
    url: string;
    name: string;
}

export interface Feedback {
  notes?: string;
  files?: TaskProof[];
  audioUrl?: string;
  rejectedBy: string;
  rejectedAt: Timestamp;
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
  responsibleId: string;
  assistantIds?: string[];
  clientId?: string;
  priority?: 'alta' | 'media' | 'baixa';
  checklist?: ChecklistItem[];
  approvalStatus?: ApprovalStatus;
  proofs?: TaskProof[];
  approvalNotes?: string;
  submittedAt?: Timestamp;
  approverId?: string;
  reviewedAt?: Timestamp;
  completedAt?: Timestamp;
  rejectionFeedback?: Feedback[];
}

// Para criar uma nova tarefa, omitimos o 'id' e tornamos os Timestamps opcionais
export type NewTask = Omit<Task, "id" | "createdAt" | "updatedAt"> & {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};


// Combined type for the approvals page
export type ApprovalTask = (Task | Omit<any, 'status'>) & {
  type: 'tasks' | 'recurringTasks';
}
