// src/types/recurringTask.ts
import type { Timestamp } from "firebase/firestore";

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface RecurringChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface RecurringTask {
  id: string;
  title: string;
  description?: string;
  dayOfWeek: DayOfWeek;
  order?: number;
  responsibleId?: string;
  assistantIds?: string[];
  clientId?: string;
  checklist?: RecurringChecklistItem[];
  createdAt: Timestamp;
}

export type NewRecurringTask = Omit<RecurringTask, "id" | "createdAt">;
