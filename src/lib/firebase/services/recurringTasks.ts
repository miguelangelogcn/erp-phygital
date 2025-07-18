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
  where,
  QueryConstraint
} from "firebase/firestore";
import { db, functions } from "@/lib/firebase/config";
import { httpsCallable } from "firebase/functions";
import type {
  RecurringTask,
  NewRecurringTask,
  DayOfWeekNumber,
  RecurringChecklistItem,
} from "@/types/recurringTask";

const createRecurringTaskCallable = httpsCallable(functions, 'createRecurringTaskWithNotifications');
const deleteTaskCallable = httpsCallable(functions, 'deleteTask');

interface TaskViewConfig {
    uid: string;
    isLeader: boolean;
    memberIds?: string[];
}

/**
 * Listens for real-time updates on the 'recurringTasks' collection, based on user role.
 */
export function onRecurringTasksUpdate(
  viewConfig: TaskViewConfig | null,
  callback: (tasks: RecurringTask[]) => void,
  onError: (error: Error) => void
): () => void {
   if (!viewConfig) {
      return () => {};
  }
  
  const { uid, isLeader, memberIds } = viewConfig;

  const tasksCollection = collection(db, "recurringTasks");
  const queryConstraints: QueryConstraint[] = [];

  if (isLeader && memberIds && memberIds.length > 0) {
      queryConstraints.push(where("responsibleId", "in", memberIds));
  } else if (!isLeader) {
      queryConstraints.push(where("responsibleId", "==", uid));
  } else {
      callback([]);
      return () => {};
  }

  const q = query(tasksCollection, ...queryConstraints);

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
 * Adds a new recurring task by calling a Cloud Function.
 * @param {NewRecurringTask} taskData - The data for the new task.
 * @returns {Promise<string>} The ID of the newly created task.
 */
export async function addRecurringTask(
  taskData: NewRecurringTask
): Promise<string> {
  try {
    const result: any = await createRecurringTaskCallable(taskData);
    if (result.data.success) {
        return result.data.id;
    } else {
        throw new Error(result.data.message || 'Failed to create recurring task.');
    }
  } catch (error) {
    console.error("Error calling createRecurringTaskWithNotifications function: ", error);
    throw error;
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
 * Updates just the checklist for a recurring task.
 */
export async function updateRecurringTaskChecklist(taskId: string, checklist: RecurringChecklistItem[]): Promise<void> {
  try {
    const taskDocRef = doc(db, "recurringTasks", taskId);
    await updateDoc(taskDocRef, { checklist: checklist });
  } catch (error)
 {
    console.error("Error updating recurring task checklist: ", error);
    throw new Error("Failed to update checklist.");
  }
}

/**
 * Updates the completion status of a recurring task.
 */
export async function updateRecurringTaskCompletion(taskId: string, isCompleted: boolean): Promise<void> {
  try {
    const taskDocRef = doc(db, "recurringTasks", taskId);
    await updateDoc(taskDocRef, { isCompleted });
  } catch (error) {
    console.error("Error updating task completion: ", error);
    throw new Error("Failed to update task completion.");
  }
}


/**
 * Deletes a recurring task.
 */
export async function deleteRecurringTask(taskId: string): Promise<void> {
  try {
    await deleteTaskCallable({ taskId, taskType: 'recurringTasks' });
  } catch (error) {
    console.error("Error deleting recurring task: ", error);
    throw error;
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
