// src/lib/firebase/services/tasks.ts
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Task, TaskStatus, NewTask } from "@/types/task";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "../config";

const functions = getFunctions(auth.app, "southamerica-east1");
const deleteTaskCallable = httpsCallable(functions, 'deleteTask');


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

    const updateData: any = {
        ...taskData,
        updatedAt: serverTimestamp(),
    };
    
    // Add timestamps based on status change
    if (taskData.status) {
        if (taskData.status === 'doing') {
            updateData.startedAt = serverTimestamp();
        } else if (taskData.status === 'done') {
            updateData.completedAt = serverTimestamp();
        }
    }

    await updateDoc(taskDocRef, updateData);
  } catch (error) {
    console.error("Error updating task: ", error);
    throw new Error("Failed to update task in Firestore.");
  }
}


/**
 * Updates the status of a specific task and the order of affected tasks in a batch.
 * @param {string} taskId - The ID of the task to update.
 * @param {TaskStatus} newStatus - The new status for the task.
 * @param {Task[]} sourceTasks - The list of tasks from the source column.
 * @param {Task[]} destTasks - The list of tasks from the destination column.
 * @param {string} sourceColumnId - The ID of the source column.
 * @param {string} destColumnId - The ID of the destination column.
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 */
export async function updateTaskStatusAndOrder(
  taskId: string,
  newStatus: TaskStatus,
  sourceTasks: Task[],
  destTasks: Task[],
  sourceColumnId: string,
  destColumnId: string
): Promise<void> {
    const batch = writeBatch(db);
    
    const taskRef = doc(db, "tasks", taskId);
    const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp(),
    };

    if (newStatus === 'doing') {
        updateData.startedAt = serverTimestamp();
    } else if (newStatus === 'done') {
        updateData.completedAt = serverTimestamp();
    }
    
    batch.update(taskRef, updateData);

    // Update order for source column if it's different from destination
    if (sourceColumnId !== destColumnId) {
        sourceTasks.forEach((task, index) => {
            const taskRef = doc(db, "tasks", task.id);
            batch.update(taskRef, { order: index });
        });
    }

    // Update order for destination column
    destTasks.forEach((task, index) => {
        const taskRef = doc(db, "tasks", task.id);
        batch.update(taskRef, { order: index });
    });

    try {
        await batch.commit();
    } catch (error) {
        console.error("Error updating task status and order in batch: ", error);
        throw new Error("Failed to update tasks in Firestore.");
    }
}


/**
 * Deletes a task from Firestore using a Cloud Function.
 * @param {string} taskId - The ID of the task to delete.
 * @returns {Promise<void>}
 */
export async function deleteTask(taskId: string): Promise<void> {
    try {
        await deleteTaskCallable({ taskId });
    } catch (error) {
        console.error("Error calling deleteTask function: ", error);
        throw new Error("Failed to delete task.");
    }
}