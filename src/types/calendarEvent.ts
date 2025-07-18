// src/types/calendarEvent.ts
import type { Timestamp } from "firebase/firestore";

export interface CalendarEvent {
  id: string;
  title: string;
  startDateTime: Timestamp;
  endDateTime: Timestamp;
  clientId?: string;
  responsibleId?: string;
  scripts?: string;
  color?: string; // e.g., hex code
}

export type NewCalendarEvent = Omit<CalendarEvent, 'id'>;
