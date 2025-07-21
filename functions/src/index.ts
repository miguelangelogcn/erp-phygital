
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
    return { success: true, uid: userRecord.uid, message: "Funcionário adicionado com sucesso." };
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
        return { success: true, message: "Funcionário atualizado com sucesso." };
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
    return { success: true, message: "Funcionário excluído com sucesso." };
  } catch (error: any) {
    logger.error(`Erro ao apagar o utilizador ${uid}:`, error);
    throw new HttpsError("internal", "Ocorreu um erro ao apagar o utilizador.");
  }
});

// --- FUNÇÕES DE GESTÃO DE CLIENTES ---

export const deleteClient = onCall({ region: "southamerica-east1" }, async (request) => {
    const { clientId } = request.data;

    if (!clientId || typeof clientId !== 'string') {
        logger.error("Validação falhou: 'clientId' inválido.", { clientId });
        throw new HttpsError("invalid-argument", "O 'clientId' é inválido ou não foi fornecido.");
    }

    try {
        const clientDocRef = db.collection("clients").doc(clientId);
        await clientDocRef.delete();
        logger.info(`Cliente ${clientId} foi excluído com sucesso.`);
        return { success: true, message: "Cliente excluído com sucesso." };
    } catch (error: any) {
        logger.error(`Erro ao excluir o cliente ${clientId} no Firestore:`, error);
        throw new HttpsError("internal", "Ocorreu um erro interno ao tentar excluir o cliente.");
    }
});


// --- FUNÇÕES DE GESTÃO DE TAREFAS ---

export const deleteTask = onCall({ region: "southamerica-east1" }, async (request) => {
    logger.info("A iniciar 'deleteTask' com os dados recebidos:", request.data);

    const { taskId, taskType } = request.data;

    // Validação rigorosa dos tipos e da existência dos dados
    if (typeof taskId !== 'string' || taskId.trim() === '') {
        logger.error("Validação falhou: 'taskId' inválido.", { taskId, taskType });
        throw new HttpsError("invalid-argument", "O 'taskId' é inválido ou não foi fornecido.");
    }
    if (typeof taskType !== 'string' || !['tasks', 'recurringTasks'].includes(taskType)) {
        logger.error("Validação falhou: 'taskType' inválido.", { taskId, taskType });
        throw new HttpsError("invalid-argument", "O 'taskType' é inválido ou não foi fornecido.");
    }

    const collectionName = taskType; // Já sabemos que é 'tasks' ou 'recurringTasks'
    logger.info(`A tentar apagar o documento: ${taskId} da coleção: ${collectionName}`);

    try {
        const taskDocRef = db.collection(collectionName).doc(taskId);
        await taskDocRef.delete();
        logger.info(`Tarefa ${taskId} da coleção ${collectionName} foi apagada com sucesso.`);
        return { success: true, message: "Tarefa excluída com sucesso." };
    } catch (error: any) {
        logger.error(`Erro ao apagar a tarefa ${taskId} no Firestore:`, error);
        throw new HttpsError("internal", "Ocorreu um erro interno ao tentar apagar a tarefa.");
    }
});


// --- FUNÇÕES DE APROVAÇÃO E TAREFAS RECORRENTES ---

export const submitTaskForApproval = onCall({ region: "southamerica-east1" }, async (request) => {
    const { taskId, taskType, proof, notes } = request.data;
    if (!taskId || !taskType || !proof) {
        throw new HttpsError("invalid-argument", "Faltam dados essenciais.");
    }
    const collectionName = taskType === 'tasks' ? 'tasks' : 'recurringTasks';
    try {
        await db.collection(collectionName).doc(taskId).update({
            approvalStatus: 'pending',
            proof: proof,
            approvalNotes: notes || null,
            submittedAt: admin.firestore.FieldValue.serverTimestamp()
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
      const approverUser = await auth.getUser(approverId);
      const approverName = approverUser.displayName || "Líder";

      const updateData: { [key: string]: any } = {
        approvalStatus: decision,
        approverId: approverId,
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (decision === 'rejected') {
        const cleanFeedback: { [key: string]: any } = {};
        if (feedback.notes) cleanFeedback.notes = feedback.notes;
        if (feedback.audioUrl) cleanFeedback.audioUrl = feedback.audioUrl;
        if (feedback.files && Array.isArray(feedback.files) && feedback.files.length > 0) {
          cleanFeedback.files = feedback.files;
        }

        // Correção Definitiva: Usar new Date() para o timestamp dentro do array
        updateData.rejectionFeedback = admin.firestore.FieldValue.arrayUnion({
            ...cleanFeedback,
            rejectedAt: new Date(), // <-- AQUI ESTÁ A CORREÇÃO
            rejectedBy: approverName,
        });
        
        if (collectionName === 'tasks') {
          updateData.status = 'doing';
        } else {
          updateData.isCompleted = false;
        }
      } else if (decision === 'approved') {
        if (collectionName === 'tasks') {
          updateData.status = 'done';
          updateData.completedAt = admin.firestore.FieldValue.serverTimestamp();
        } else {
          updateData.isCompleted = true;
        }
      }

      await taskRef.update(updateData);
      return { success: true, message: "Revisão da tarefa concluída." };

    } catch (error: any) {
      logger.error(`[reviewTask] Erro ao rever a tarefa ${taskId}:`, error);
      throw new HttpsError("internal", "Ocorreu um erro ao processar a sua revisão.");
    }
});

export const resetRecurringTasks = onSchedule({
    schedule: "59 23 * * 0",
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1"
}, async (event) => {
    logger.info("A executar a função de reset de tarefas recorrentes...");
    const recurringTasksRef = db.collection("recurringTasks");
    const snapshot = await recurringTasksRef.get();

    if (snapshot.empty) {
      logger.info("Nenhuma tarefa recorrente encontrada para resetar.");
      return;
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
    return;
});


// --- FUNÇÕES DE GERAÇÃO DE NOTIFICAÇÕES ---

const createNotificationsForUsers = async (userIds: string[], message: string, linkTo: string, triggeredBy: string) => {
  const batch = db.batch();
  const uniqueUserIds = [...new Set(userIds.filter(id => id))];
  logger.info("A criar notificações para os seguintes UIDs:", uniqueUserIds);
  uniqueUserIds.forEach((userId) => {
    const notificationRef = db.collection('users').doc(userId).collection('notifications').doc();
    batch.set(notificationRef, { message, linkTo, triggeredBy, status: 'unread', createdAt: admin.firestore.FieldValue.serverTimestamp() });
  });
  if (uniqueUserIds.length > 0) {
    await batch.commit();
    logger.info(`${uniqueUserIds.length} notificações criadas com sucesso.`);
  }
};

const handleItemCreation = async (snap: admin.firestore.DocumentSnapshot, itemType: string, linkPath: string, eventId: string) => {
    logger.info(`[handleItemCreation] Acionado para ${itemType} com ID: ${snap.id}`);
    
    const data = snap.data();
    if (!data) {
        logger.warn("[handleItemCreation] Dados do documento estão vazios.");
        return;
    }

    if (!data.responsibleId) {
        logger.warn("[handleItemCreation] 'responsibleId' em falta.");
        return;
    }

    const creator = await auth.getUser(data.responsibleId);
    const creatorName = creator.displayName || 'Sistema';
    const message = `${creatorName} atribuiu-lhe ${itemType}: "${data.title}"`;
    const linkTo = `${linkPath}${eventId}`;
    
    let userIdsToNotify: string[] = [data.responsibleId];
    
    logger.info("[handleItemCreation] Lista final de IDs para notificar:", userIdsToNotify);
    return createNotificationsForUsers(userIdsToNotify, message, linkTo, creatorName);
};


const handleItemUpdate = async (
    change: { before: admin.firestore.DocumentSnapshot; after: admin.firestore.DocumentSnapshot },
    itemType: string,
    linkPath: string,
    eventId: string
) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (!beforeData || !afterData) {
        logger.warn(`[handleItemUpdate] Dados em falta para ${itemType} com ID: ${change.after.id}`);
        return;
    }

    // Notificação para tarefa enviada para aprovação
    if (afterData.approvalStatus === 'pending' && beforeData.approvalStatus !== 'pending') {
        const taskCreatorDoc = await db.collection('users').doc(afterData.responsibleId).get();
        const teamId = taskCreatorDoc.data()?.teamId;
        if (teamId) {
            const team = await db.collection('teams').doc(teamId).get();
            const leaderId = team.data()?.leaderId;
            if (leaderId) {
                const message = `A ${itemType} "${afterData.title}" foi submetida para aprovação.`;
                const linkTo = `/dashboard/approvals`;
                const creatorName = taskCreatorDoc.data()?.name || 'Um utilizador';
                await createNotificationsForUsers([leaderId], message, linkTo, creatorName);
            }
        }
    }

    // Notificação para novos assistentes
    const beforeAssistants = new Set(beforeData.assistantIds || []);
    const afterAssistants = afterData.assistantIds || [];
    const newAssistants = afterAssistants.filter((id: string) => !beforeAssistants.has(id));

    if (newAssistants.length > 0) {
        const editorName = 'Sistema'; 
        const message = `Você foi adicionado como auxiliar na ${itemType}: "${afterData.title}"`;
        const linkTo = `${linkPath}${eventId}`;
        await createNotificationsForUsers(newAssistants, message, linkTo, editorName);
    }
};


// --- Gatilhos para a coleção 'tasks' ---
export const onTaskCreated = onDocumentCreated({ document: "tasks/{taskId}", region: "southamerica-east1" }, (event) => {
    if (!event.data) return;
    return handleItemCreation(event.data, "uma nova tarefa", "/dashboard/tasks?openTask=", event.params.taskId);
});

export const onTaskUpdated = onDocumentUpdated({ document: "tasks/{taskId}", region: "southamerica-east1" }, async (event) => {
    if (!event.data) return;
    return handleItemUpdate(event.data, "tarefa", "/dashboard/tasks?openTask=", event.params.taskId);
});

// --- Gatilhos para a coleção 'recurringTasks' ---
export const onRecurringTaskCreated = onDocumentCreated({ document: "recurringTasks/{taskId}", region: "southamerica-east1" }, (event) => {
    if (!event.data) return;
    return handleItemCreation(event.data, "uma nova tarefa recorrente", "/dashboard/tasks?tab=recurring&openTask=", event.params.taskId);
});

export const onRecurringTaskUpdated = onDocumentUpdated({ document: "recurringTasks/{taskId}", region: "southamerica-east1" }, async (event) => {
    if (!event.data) return;
    return handleItemUpdate(event.data, "tarefa recorrente", "/dashboard/tasks?tab=recurring&openTask=", event.params.taskId);
});

// --- Gatilhos para a coleção 'calendarEvents' ---
export const onCalendarEventCreated = onDocumentCreated({ document: "calendarEvents/{eventId}", region: "southamerica-east1" }, (event) => {
    if (!event.data) return;
    return handleItemCreation(event.data, "um novo evento", "/dashboard/calendar?openEvent=", event.params.eventId);
});

export const onCalendarEventUpdated = onDocumentUpdated({ document: "calendarEvents/{eventId}", region: "southamerica-east1" }, async (event) => {
    if (!event.data) return;
    return handleItemUpdate(event.data, "evento", "/dashboard/calendar?openEvent=", event.params.eventId);
});

    

    
