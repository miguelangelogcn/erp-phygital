import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Inicialização segura do Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

// --- FUNÇÕES DE GESTÃO DE UTILIZADORES ---

export const createUser = onCall({ region: "southamerica-east1" }, async (request) => {
  const { name, email, password, roleId, teamId, permissions } = request.data;
  if (!name || !email || !password || !roleId) {
    throw new HttpsError("invalid-argument", "Faltam dados essenciais.");
  }
  try {
    const userRecord = await auth.createUser({ email, password, displayName: name });
    await db.collection("users").doc(userRecord.uid).set({
      name,
      email,
      roleId,
      teamId: teamId || null,
      permissions: permissions || [],
    });
    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    logger.error("Erro ao criar utilizador:", error);
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Este e-mail já está em uso.');
    }
    throw new HttpsError("internal", "Ocorreu um erro ao criar o utilizador.");
  }
});

export const updateUser = onCall({ region: "southamerica-east1" }, async (request) => {
    const { uid, name, roleId, teamId, permissions } = request.data;
    if (!uid || !name || !roleId || !permissions) {
        throw new HttpsError("invalid-argument", "Faltam dados essenciais (uid, nome, roleId, permissões).");
    }
    try {
        await db.collection("users").doc(uid).update({ name, roleId, teamId: teamId || null, permissions });
        await auth.updateUser(uid, { displayName: name });
        return { success: true };
    } catch (error: any) {
        logger.error(`Erro ao atualizar o utilizador ${uid}:`, error);
        throw new HttpsError("internal", "Ocorreu um erro ao atualizar o utilizador.");
    }
});

export const deleteUser = onCall({ region: "southamerica-east1" }, async (request) => {
  const { uid } = request.data;
  if (!uid) {
    throw new HttpsError("invalid-argument", "O UID do utilizador é obrigatório.");
  }
  try {
    await auth.deleteUser(uid);
    await db.collection("users").doc(uid).delete();
    return { success: true };
  } catch (error: any) {
    logger.error(`Erro ao apagar o utilizador ${uid}:`, error);
    throw new HttpsError("internal", "Ocorreu um erro ao apagar o utilizador.");
  }
});


// --- FUNÇÕES DE GESTÃO DE TAREFAS ---

export const deleteTask = onCall({ region: "southamerica-east1" }, async (request) => {
    const { taskId, taskType } = request.data;
    if (!taskId || !taskType) {
        throw new HttpsError("invalid-argument", "Faltam dados essenciais.");
    }
    const collectionName = taskType === 'tasks' ? 'tasks' : 'recurringTasks';
    try {
        await db.collection(collectionName).doc(taskId).delete();
        return { success: true };
    } catch (error: any) {
        logger.error(`Erro ao apagar a tarefa ${taskId}:`, error);
        throw new HttpsError("internal", "Ocorreu um erro ao apagar a tarefa.");
    }
});


// --- FUNÇÕES DE APROVAÇÃO E TAREFAS RECORRENTES ---

export const submitTaskForApproval = onCall({ region: "southamerica-east1" }, async (request) => {
    const { taskId, taskType, proof } = request.data;
    if (!taskId || !taskType || !proof) {
        throw new HttpsError("invalid-argument", "Faltam dados essenciais.");
    }
    const collectionName = taskType === 'tasks' ? 'tasks' : 'recurringTasks';
    try {
        await db.collection(collectionName).doc(taskId).update({
            approvalStatus: 'pending',
            proof: proof,
        });
        return { success: true };
    } catch (error: any) {
        logger.error(`Erro ao submeter a tarefa ${taskId} para aprovação:`, error);
        throw new HttpsError("internal", "Ocorreu um erro ao submeter a tarefa.");
    }
});

export const reviewTask = onCall({ region: "southamerica-east1" }, async (request) => {
    const { taskId, taskType, decision, feedback } = request.data;
    const approverId = request.auth?.uid;

    if (!approverId) {
      throw new HttpsError("unauthenticated", "O utilizador deve estar autenticado para rever tarefas.");
    }
    if (!taskId || !taskType || (decision !== 'approved' && decision !== 'rejected')) {
      throw new HttpsError("invalid-argument", "Faltam dados essenciais ou a decisão é inválida.");
    }

    const collectionName = taskType === 'tasks' ? 'tasks' : 'recurringTasks';
    const taskRef = db.collection(collectionName).doc(taskId);

    try {
      const updateData: { [key: string]: any } = {
        approvalStatus: decision,
        approverId: approverId,
      };

      if (decision === 'rejected') {
        updateData.rejectionFeedback = admin.firestore.FieldValue.arrayUnion({
            ...feedback,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        if (collectionName === 'tasks') {
          updateData.status = 'doing';
        } else {
          updateData.isCompleted = false;
        }
      } else if (decision === 'approved') {
        if (collectionName === 'tasks') {
          updateData.status = 'done';
        } else {
          updateData.isCompleted = true;
        }
      }

      await taskRef.update(updateData);
      return { success: true, message: "Revisão da tarefa concluída." };

    } catch (error: any) {
      logger.error(`Erro ao rever a tarefa ${taskId}:`, error);
      throw new HttpsError("internal", "Ocorreu um erro ao processar a sua revisão.");
    }
});

export const resetRecurringTasks = onSchedule({
    schedule: "59 23 * * 0", // Todos os Domingos às 23:59
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1"
}, async (event) => {
    logger.info("A executar a função de reset de tarefas recorrentes...");
    const recurringTasksRef = db.collection("recurringTasks");
    const snapshot = await recurringTasksRef.get();

    if (snapshot.empty) {
      logger.info("Nenhuma tarefa recorrente encontrada para resetar.");
      return null;
    }

    const batch = db.batch();
    snapshot.forEach((doc) => {
      const task = doc.data();
      const newChecklist = task.checklist ? task.checklist.map((item: any) => ({ ...item, isCompleted: false })) : [];
      batch.update(doc.ref, { 
          isCompleted: false, 
          checklist: newChecklist,
          approvalStatus: null,
          rejectionFeedback: [],
          proof: [],
      });
    });

    await batch.commit();
    logger.info(`Reset concluído para ${snapshot.size} tarefas.`);
    return null;
});


// --- FUNÇÕES DE GERAÇÃO DE NOTIFICAÇÕES ---

// Função auxiliar para criar notificações
const createNotificationsForUsers = async (userIds: string[], message: string, linkTo: string, triggeredBy: string) => {
  const batch = db.batch();
  const uniqueUserIds = [...new Set(userIds.filter(id => id))];

  uniqueUserIds.forEach((userId) => {
    const notificationRef = db.collection('users').doc(userId).collection('notifications').doc();
    batch.set(notificationRef, {
      message,
      linkTo,
      triggeredBy,
      status: 'unread',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  if (uniqueUserIds.length > 0) {
    await batch.commit();
  }
};

// Acionada quando uma NOVA tarefa pontual é criada
export const onTaskCreated = onDocumentCreated({ document: "tasks/{taskId}", region: "southamerica-east1" }, async (event) => {
    const snap = event.data;
    if (!snap) return;

    const task = snap.data();
    const creator = await auth.getUser(task.responsibleId);
    const creatorName = creator.displayName || 'Sistema';
    
    const message = `${creatorName} criou uma nova tarefa: "${task.title}"`;
    const linkTo = `/dashboard/tasks?openTask=${event.params.taskId}`;
    
    const userIdsToNotify = [task.responsibleId, ...(task.assistantIds || [])];

    return createNotificationsForUsers(userIdsToNotify, message, linkTo, creatorName);
});

// Acionada quando uma tarefa é ATUALIZADA
export const onTaskUpdated = onDocumentUpdated({ document: "tasks/{taskId}", region: "southamerica-east1" }, async (event) => {
    const afterData = event.data?.after.data();
    const beforeData = event.data?.before.data();

    if (!afterData || !beforeData) return;

    // Notificação para tarefa enviada para aprovação
    if (afterData.approvalStatus === 'pending' && beforeData.approvalStatus !== 'pending') {
      const taskCreatorDoc = await db.collection('users').doc(afterData.responsibleId).get();
      const teamId = taskCreatorDoc.data()?.teamId;

      if (teamId) {
        const team = await db.collection('teams').doc(teamId).get();
        const leaderId = team.data()?.leaderId;

        if (leaderId) {
          const message = `A tarefa "${afterData.title}" foi submetida para aprovação.`;
          const linkTo = `/dashboard/approvals`;
          const creatorName = taskCreatorDoc.data()?.name || 'Um utilizador';
          await createNotificationsForUsers([leaderId], message, linkTo, creatorName);
        }
      }
    }
    return null;
});
