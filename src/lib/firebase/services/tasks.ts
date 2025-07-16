// src/lib/firebase/services/tasks.ts
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Task, TaskStatus } from "@/types/task";

/**
 * Listens for real-time updates on the 'tasks' collection in Firestore.
 * @param {(tasks: Task[]) => void} callback - The function to call with the tasks array.
 * @param {(error: Error) => void} onError - The function to call on error.
 * @returns {() => void} An unsubscribe function to stop listening for updates.
 */
export function onTasksUpdate(
  callback: (tasks: Task[]) => void,
  onError: (error: Error) => void
): () => void {
  const tasksCollection = collection(db, "tasks");
  const q = query(tasksCollection);

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const tasks = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];
      callback(tasks);
    },
    (error) => {
      console.error("Error listening to tasks collection: ", error);
      onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Updates the status of a specific task in Firestore.
 * @param {string} taskId - The ID of the task to update.
 * @param {TaskStatus} newStatus - The new status for the task.
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 */
export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus
): Promise<void> {
  try {
    const taskDocRef = doc(db, "tasks", taskId);
    await updateDoc(taskDocRef, {
      status: newStatus,
      updatedAt: serverTimestamp() 
    });
  } catch (error) {
    console.error("Error updating task status: ", error);
    throw new Error("Failed to update task status in Firestore.");
  }
}
