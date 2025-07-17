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
  where,
  QueryConstraint
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Task, TaskStatus, NewTask, ApprovalTask } from "@/types/task";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "../config";

const functions = getFunctions(auth.app, "southamerica-east1");
const deleteTaskCallable = httpsCallable(functions, 'deleteTask');

interface TaskViewConfig {
    uid: string;
    isLeader: boolean;
    memberIds?: string[];
}

/**
 * Listens for real-time updates on the 'tasks' collection in Firestore, based on user role.
 */
export function onTasksUpdate(
  viewConfig: TaskViewConfig | null,
  callback: (tasks: Task[]) => void,
  onError: (error: Error) => void
): () => void {
  if (!viewConfig) {
      // Return an empty unsubscribe function if config is not ready
      return () => {};
  }
  
  const { uid, isLeader, memberIds } = viewConfig;

  const tasksCollection = collection(db, "tasks");
  const queryConstraints: QueryConstraint[] = [];

  if (isLeader && memberIds && memberIds.length > 0) {
      // Leader sees all tasks for their team members
      queryConstraints.push(where("responsibleId", "in", memberIds));
  } else if (!isLeader) {
      // Employee sees tasks they are responsible for or assisting with
      queryConstraints.push(
        where("responsibleId", "==", uid)
        // Note: Firestore does not support 'OR' queries on different fields in this way.
        // A more complex solution (two separate queries or data duplication) would be needed
        // to also fetch tasks where the user is an assistant. For now, we fetch by responsibleId.
        // For a complete solution, one would fetch tasks where responsibleId === uid and another
        // where assistantIds array-contains uid, then merge the results client-side.
        // For simplicity here, we stick to the primary responsible user.
      );
  } else {
    // Leader with no members, or some other edge case. Return no tasks.
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
 * Fetches all tasks requiring approval for a given set of team members and their leader.
 * @param {string[]} memberIds - An array of user IDs for the team members.
 * @param {string} leaderId - The user ID of the team leader.
 * @returns {Promise<ApprovalTask[]>} A promise that resolves to an array of tasks for approval.
 */
export async function getTasksForApproval(memberIds: string[], leaderId: string): Promise<ApprovalTask[]> {
    // Combine memberIds and leaderId, and remove duplicates to form the full team list.
    const fullTeamIds = [...new Set([...memberIds, leaderId])];

    if (fullTeamIds.length === 0) return [];
    
    const tasksRef = collection(db, "tasks");
    const recurringTasksRef = collection(db, "recurringTasks");
    
    const qTasks = query(
        tasksRef,
        where("approvalStatus", "==", "pending"),
        where("responsibleId", "in", fullTeamIds)
    );
    const qRecurringTasks = query(
        recurringTasksRef,
        where("approvalStatus", "==", "pending"),
        where("responsibleId", "in", fullTeamIds)
    );

    try {
        const [tasksSnapshot, recurringTasksSnapshot] = await Promise.all([
            getDocs(qTasks),
            getDocs(qRecurringTasks),
        ]);

        const approvalTasks: ApprovalTask[] = [];

        tasksSnapshot.forEach(doc => {
            approvalTasks.push({ ...(doc.data() as Task), id: doc.id, type: 'tasks' });
        });
        recurringTasksSnapshot.forEach(doc => {
            approvalTasks.push({ ...(doc.data() as any), id: doc.id, type: 'recurringTasks' });
        });

        return approvalTasks;

    } catch (error) {
        console.error("Error fetching tasks for approval:", error);
        throw new Error("Failed to fetch tasks for approval.");
    }
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
        } else if (taskData.status === 'done' && taskData.approvalStatus === 'approved') {
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
