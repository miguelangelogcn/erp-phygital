// src/types/notification.ts
import type { Timestamp } from "firebase/firestore";

export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface Notification {
  id: string;
  message: string;
  link: string;
  status: NotificationStatus;
  createdAt: Timestamp;
}
