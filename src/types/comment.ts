// src/types/comment.ts
import type { Timestamp } from "firebase/firestore";

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: Timestamp;
}

export type NewComment = Omit<Comment, 'id' | 'createdAt'>;
