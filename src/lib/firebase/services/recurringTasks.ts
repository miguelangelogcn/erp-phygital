// src/lib/firebase/services/recurringTasks.ts
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
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type {
  RecurringTask,
  NewRecurringTask,
  DayOfWeekNumber,
} from "@/types/recurringTask";

/**
 * Listens for real-time updates on the 'recurringTasks' collection.
 */
export function onRecurringTasksUpdate(
  callback: (tasks: RecurringTask[]) => void,
  onError: (error: Error) => void
): () => void {
  const tasksCollection = collection(db, "recurringTasks");
  const q = query(tasksCollection, orderBy("order", "asc"));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const tasks = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as RecurringTask[];
      callback(tasks);
    },
    (error) => {
      console.error("Error listening to recurring tasks: ", error);
      onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Adds a new recurring task.
 */
export async function addRecurringTask(
  taskData: NewRecurringTask
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "recurringTasks"), {
      ...taskData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding recurring task: ", error);
    throw new Error("Failed to add recurring task.");
  }
}

/**
 * Updates an existing recurring task.
 */
export async function updateRecurringTask(
  taskId: string,
  taskData: Partial<RecurringTask>
): Promise<void> {
  try {
    const taskDocRef = doc(db, "recurringTasks", taskId);
    await updateDoc(taskDocRef, taskData);
  } catch (error) {
    console.error("Error updating recurring task: ", error);
    throw new Error("Failed to update recurring task.");
  }
}

/**
 * Deletes a recurring task.
 */
export async function deleteRecurringTask(taskId: string): Promise<void> {
  try {
    const taskDocRef = doc(db, "recurringTasks", taskId);
    await deleteDoc(taskDocRef);
  } catch (error) {
    console.error("Error deleting recurring task: ", error);
    throw new Error("Failed to delete recurring task.");
  }
}

/**
 * Updates the day and order of recurring tasks in a batch.
 */
export async function updateRecurringTaskOrderAndDay(
  taskId: string,
  newDay: DayOfWeekNumber,
  sourceTasks: RecurringTask[],
  destTasks: RecurringTask[],
  sourceDay: DayOfWeekNumber,
  destDay: DayOfWeekNumber
): Promise<void> {
  const batch = writeBatch(db);

  const taskRef = doc(db, "recurringTasks", taskId);
  batch.update(taskRef, { dayOfWeek: newDay });

  if (sourceDay !== destDay) {
    sourceTasks.forEach((task, index) => {
      const taskRef = doc(db, "recurringTasks", task.id);
      batch.update(taskRef, { order: index });
    });
  }

  destTasks.forEach((task, index) => {
    const taskRef = doc(db, "recurringTasks", task.id);
    batch.update(taskRef, { order: index });
  });

  try {
    await batch.commit();
  } catch (error) {
    console.error("Error updating recurring task order: ", error);
    throw new Error("Failed to update recurring tasks.");
  }
}
