// src/lib/firebase/services/tasks.ts
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Task, TaskStatus, NewTask } from "@/types/task";

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
 * Adds a new task to the 'tasks' collection.
 * @param {NewTask} taskData - The data for the new task.
 * @returns {Promise<string>} The ID of the newly created task.
 */
export async function addTask(taskData: NewTask): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "tasks"), {
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding task: ", error);
    throw new Error("Failed to add task to Firestore.");
  }
}

/**
 * Updates an existing task in Firestore.
 * @param {string} taskId - The ID of the task to update.
 * @param {Partial<Task>} taskData - An object with the fields to update.
 * @returns {Promise<void>}
 */
export async function updateTask(taskId: string, taskData: Partial<Task>): Promise<void> {
  try {
    const taskDocRef = doc(db, "tasks", taskId);
    await updateDoc(taskDocRef, {
      ...taskData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating task: ", error);
    throw new Error("Failed to update task in Firestore.");
  }
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

/**
 * Deletes a task from Firestore.
 * @param {string} taskId - The ID of the task to delete.
 * @returns {Promise<void>}
 */
export async function deleteTask(taskId: string): Promise<void> {
    try {
        const taskDocRef = doc(db, "tasks", taskId);
        await deleteDoc(taskDocRef);
    } catch (error) {
        console.error("Error deleting task: ", error);
        throw new Error("Failed to delete task from Firestore.");
    }
}
