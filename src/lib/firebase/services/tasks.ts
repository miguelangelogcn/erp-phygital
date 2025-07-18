// src/lib/firebase/services/tasks.ts
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  getDocs,
  where,
  QueryConstraint,
  addDoc
} from "firebase/firestore";
import { db, functions } from "@/lib/firebase/config";
import type { Task, TaskStatus, NewTask, ApprovalTask } from "@/types/task";
import { httpsCallable } from "firebase/functions";

const deleteTaskCallable = httpsCallable(functions, 'deleteTask');
const createTaskCallable = httpsCallable(functions, 'createTask');


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
      queryConstraints.push(where("responsibleId", "in", memberIds));
  } else if (!isLeader) {
      queryConstraints.push(
        where("responsibleId", "==", uid)
      );
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
 */
export async function getTasksForApproval(memberIds: string[], leaderId: string): Promise<ApprovalTask[]> {
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
 * Adds a new task to the 'tasks' collection by calling a cloud function.
 * @param {NewTask} taskData - The data for the new task.
 * @returns {Promise<any>} The result from the cloud function.
 */
export async function addTask(taskData: NewTask): Promise<any> {
  try {
    console.log("Chamando a função 'createTask' com os seguintes dados:", taskData);
    const result = await createTaskCallable(taskData);
    return result;
  } catch (error) {
    console.error("Error calling createTask function: ", error);
    throw new Error("Failed to add task.");
  }
}

/**
 * Updates an existing task in Firestore.
 */
export async function updateTask(taskId: string, taskData: Partial<Task>): Promise<void> {
  try {
    const taskDocRef = doc(db, "tasks", taskId);

    const updateData: any = {
        ...taskData,
        updatedAt: serverTimestamp(),
    };
    
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

    if (sourceColumnId !== destColumnId) {
        sourceTasks.forEach((task, index) => {
            const taskRef = doc(db, "tasks", task.id);
            batch.update(taskRef, { order: index });
        });
    }

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
 */
export async function deleteTask(taskId: string): Promise<void> {
    try {
        await deleteTaskCallable({ taskId, taskType: 'tasks' });
    } catch (error: any) {
        console.error("Error calling deleteTask function: ", error);
        throw error;
    }
}
