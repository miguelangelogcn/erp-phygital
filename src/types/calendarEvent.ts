// src/types/calendarEvent.ts
import type { Timestamp } from "firebase/firestore";

export interface Script {
  id: string;
  title?: string;
  targetAudience?: string;
  hook?: string;
  development?: string;
  cta?: string;
}

export interface EventChecklistItem {
    id: string;
    text: string;
    isCompleted: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startDateTime: Timestamp;
  endDateTime: Timestamp;
  clientId?: string;
  responsibleId?: string;
  assistantIds?: string[];
  scripts?: Script[];
  checklist?: EventChecklistItem[];
  color?: string; // e.g., hex code
}

export type NewCalendarEvent = Omit<CalendarEvent, 'id'>;
