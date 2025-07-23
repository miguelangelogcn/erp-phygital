// src/lib/firebase/services/comments.ts
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Comment, NewComment } from "@/types/comment";

const COMMENTS_SUBCOLLECTION = "comments";

/**
 * Listens for real-time updates on a document's 'comments' subcollection.
 * @param {string} docPath - The path to the parent document (e.g., 'tasks/taskId123').
 * @param {function(Comment[]): void} callback - Function to call with the updated comments.
 * @param {function(Error): void} onError - Function to call on error.
 * @returns {function(): void} An unsubscribe function.
 */
export function onCommentsUpdate(
  docPath: string,
  callback: (comments: Comment[]) => void,
  onError: (error: Error) => void
): () => void {
  if (!docPath) {
    onError(new Error("Document path is required for comments."));
    return () => {};
  }
  
  const parentDocRef = doc(db, docPath);
  const commentsRef = collection(parentDocRef, COMMENTS_SUBCOLLECTION);
  const q = query(commentsRef, orderBy("createdAt", "asc"));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const comments = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Comment)
      );
      callback(comments);
    },
    (error) => {
      console.error(`Error listening to comments on ${docPath}: `, error);
      onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Adds a new comment to a document's 'comments' subcollection.
 * @param {string} docPath - The path to the parent document.
 * @param {NewComment} commentData - The data for the new comment.
 * @returns {Promise<string>} The ID of the newly created comment document.
 */
export async function addComment(docPath: string, commentData: NewComment): Promise<string> {
   if (!docPath) {
    throw new Error("Document path is required for comments.");
  }
  try {
    const parentDocRef = doc(db, docPath);
    const commentsRef = collection(parentDocRef, COMMENTS_SUBCOLLECTION);
    const docRef = await addDoc(commentsRef, {
      ...commentData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error adding comment to ${docPath}: `, error);
    throw new Error("Failed to add comment.");
  }
}
