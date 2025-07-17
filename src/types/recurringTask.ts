// src/types/recurringTask.ts
import type { Timestamp } from "firebase/firestore";
import type { ApprovalStatus, TaskProof, Feedback } from './task';

// Monday = 1, Tuesday = 2, ..., Sunday = 7
export type DayOfWeekNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface RecurringChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface RecurringTask {
  id: string;
  title: string;
  description?: string;
  dayOfWeek: DayOfWeekNumber;
  isCompleted: boolean;
  order?: number;
  responsibleId?: string;
  assistantIds?: string[];
  clientId?: string;
  checklist?: RecurringChecklistItem[];
  createdAt: Timestamp;
  approvalRequired?: boolean; // Does this task need approval?
  approvalStatus?: ApprovalStatus;
  proofs?: TaskProof[];
  approvalNotes?: string;
  submittedAt?: Timestamp;
  approverId?: string;
  reviewedAt?: Timestamp;
  rejectionFeedback?: Feedback;
}

export type NewRecurringTask = Omit<RecurringTask, "id" | "createdAt" | "reviewedAt">;
