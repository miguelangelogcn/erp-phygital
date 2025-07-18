
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated, onDocumentUpdated, Change } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Inicialização segura do Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

// Define a interface para os dados esperados
interface CreateUserData {
  name: string;
  email: string;
  password: string;
  roleId?: string;
  teamId?: string;
  permissions?: string[];
}

interface UpdateUserData {
  uid: string;
  name: string;
  roleId?: string;
  teamId?: string;
  permissions: string[];
}

interface DeleteUserData {
  uid: string;
}

interface DeleteTaskData {
  taskId: string;
}

interface SubmitForApprovalData {
  taskId: string;
  taskType: "tasks" | "recurringTasks";
  proofs: { url: string; name: string }[];
  notes: string;
}

interface ReviewTaskData {
  taskId: string;
  taskType: "tasks" | "recurringTasks";
  decision: "approved" | "rejected";
  feedback?: {
    notes: string;
    files?: { url: string; name: string }[];
    audioUrl?: string;
  };
}

export const createUser = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const data: CreateUserData = request.data;
    logger.info("Função 'createUser' chamada com os dados:", data);

    const { name, email, password, roleId, teamId, permissions } = data;
    if (!name || !email || !password) {
      throw new HttpsError(
        "invalid-argument",
        "Faltam dados essenciais (nome, email, senha)."
      );
    }

    try {
      logger.info(`A criar utilizador no Auth para: ${email}`);
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: name,
      });
      logger.info(`Utilizador criado no Auth com UID: ${userRecord.uid}`);

      const userData: any = {
        name: name,
        email: email,
        permissions: permissions || [],
      };

      if (roleId) userData.roleId = roleId;
      if (teamId) userData.teamId = teamId;


      logger.info(`A criar documento no Firestore para UID: ${userRecord.uid}`);
      await db.collection("users").doc(userRecord.uid).set(userData);
      logger.info("Documento criado no Firestore com sucesso.");

      return { success: true, message: "Utilizador criado com sucesso!", uid: userRecord.uid };

    } catch (error: any) {
      logger.error("ERRO DETALHADO dentro da função:", error);
      if (error.code === 'auth/email-already-exists') {
           throw new HttpsError('already-exists', 'Este e-mail já está em uso.');
      }
      throw new HttpsError("internal", "Ocorreu um erro inesperado no servidor.", error.message);
    }
  }
);


export const updateUser = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const data: UpdateUserData = request.data;
    const { uid, name, roleId, teamId, permissions } = data;
    logger.info(`A atualizar o utilizador: ${uid}`, data);

    if (!uid || !name || !Array.isArray(permissions)) {
      throw new HttpsError(
        "invalid-argument",
        "Faltam dados essenciais (uid, nome, permissões)."
      );
    }

    try {
      const updatePayload: any = {
        name: name,
        permissions: permissions,
      };

      if (roleId) updatePayload.roleId = roleId;
      if (teamId) {
        updatePayload.teamId = teamId;
      } else {
        updatePayload.teamId = admin.firestore.FieldValue.delete();
      }
      
      await db.collection("users").doc(uid).update(updatePayload);

      await auth.updateUser(uid, { displayName: name });

      logger.info(`Utilizador ${uid} atualizado com sucesso.`);
      return { success: true, message: "Utilizador atualizado com sucesso!" };

    } catch (error: any) {
      logger.error(`Erro ao atualizar o utilizador ${uid}:`, error);
      throw new HttpsError("internal", "Ocorreu um erro ao atualizar o utilizador.", error.message);
    }
  }
);

export const deleteUser = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const data: DeleteUserData = request.data;
    const { uid } = data;
    logger.info(`A excluir o utilizador: ${uid}`);

    if (!uid) {
      throw new HttpsError("invalid-argument", "O UID do utilizador é obrigatório.");
    }

    try {
      await auth.deleteUser(uid);
      logger.info(`Utilizador ${uid} excluído do Auth.`);

      await db.collection("users").doc(uid).delete();
      logger.info(`Documento do utilizador ${uid} excluído do Firestore.`);

      return { success: true, message: "Utilizador excluído com sucesso!" };

    } catch (error: any) {
      logger.error(`Erro ao excluir o utilizador ${uid}:`, error);
      throw new HttpsError("internal", "Ocorreu um erro ao excluir o utilizador.", error.message);
    }
  }
);


export const deleteTask = onCall(
  { region: "southamerica-east1" },
  async(request) => {
    const data: DeleteTaskData = request.data;
    const { taskId } = data;
    logger.info(`A excluir a tarefa: ${taskId}`);

    if (!taskId) {
      throw new HttpsError("invalid-argument", "O ID da tarefa é obrigatório.");
    }

    try {
      await db.collection("tasks").doc(taskId).delete();
      logger.info(`Tarefa ${taskId} excluída do Firestore.`);
      return { success: true, message: "Tarefa excluída com sucesso!" };
    } catch(error: any) {
      logger.error(`Erro ao excluir a tarefa ${taskId}:`, error);
      throw new HttpsError("internal", "Ocorreu um erro ao excluir a tarefa.", error.message)
    }
  }
);


export const submitTaskForApproval = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const data: SubmitForApprovalData = request.data;
    const { taskId, taskType, proofs, notes } = data;

    logger.info(`Submetendo tarefa para aprovação: ${taskId} do tipo ${taskType}`);

    if (!taskId || !taskType || !proofs || proofs.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Dados insuficientes para submeter para aprovação."
      );
    }

    const collectionName = taskType === 'tasks' ? 'tasks' : 'recurringTasks';

    try {
      const taskDocRef = db.collection(collectionName).doc(taskId);
      await taskDocRef.update({
        approvalStatus: 'pending',
        proofs: proofs,
        approvalNotes: notes || "",
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Limpar o feedback anterior ao resubmeter
        feedback: admin.firestore.FieldValue.delete(),
        rejectionFeedback: admin.firestore.FieldValue.delete(),
      });

      logger.info(`Tarefa ${taskId} atualizada para 'pending' com sucesso.`);
      return { success: true, message: "Tarefa submetida para aprovação!" };
    } catch (error: any) {
      logger.error(`Erro ao submeter a tarefa ${taskId}:`, error);
      throw new HttpsError("internal", "Ocorreu um erro ao submeter a tarefa.", error.message);
    }
  }
);

export const reviewTask = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    // Log para depuração: ver exatamente o que a função recebe
    logger.info("Função 'reviewTask' chamada com os dados:", request.data);

    const { taskId, taskType, decision, feedback } = request.data as ReviewTaskData;
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
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (decision === 'rejected') {
        const newFeedbackEntry = { 
            ...(feedback || {}),
            rejectedBy: approverId,
            rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Adiciona o novo feedback a um array, criando um histórico
        updateData.rejectionFeedback = admin.firestore.FieldValue.arrayUnion(newFeedbackEntry);
        
        // Devolve a tarefa para o estado de trabalho
        if (collectionName === 'tasks') {
          updateData.status = 'todo';
        } else {
          updateData.isCompleted = false;
        }
         // Limpa os campos de aprovação antigos para consistência
         updateData.proofs = admin.firestore.FieldValue.delete();
         updateData.approvalNotes = admin.firestore.FieldValue.delete();

      } else if (decision === 'approved') {
        // Se aprovada, limpa qualquer feedback antigo e marca como concluída
        // Não limpamos o histórico de rejeições para manter o registo.
        if (collectionName === 'tasks') {
          updateData.status = 'done';
          updateData.completedAt = admin.firestore.FieldValue.serverTimestamp();
        } else {
          updateData.isCompleted = true;
        }
      }

      await taskRef.update(updateData);
      logger.info(`Tarefa ${taskId} atualizada com sucesso com a decisão: ${decision}`);
      return { success: true, message: "Revisão da tarefa concluída." };

    } catch (error: any) {
      logger.error(`Erro ao rever a tarefa ${taskId}:`, error);
      throw new HttpsError("internal", "Ocorreu um erro ao processar a sua revisão.");
    }
  }
);


export const resetRecurringTasks = onSchedule(
  {
    schedule: "59 23 * * 0", // Every Sunday at 23:59
    timeZone: "America/Sao_Paulo", // Or your preferred timezone
    region: "southamerica-east1",
  },
  async (event) => {
    logger.info("A executar a função de reset de tarefas recorrentes...");

    const tasksCollectionRef = db.collection("recurringTasks");
    const snapshot = await tasksCollectionRef.get();

    if (snapshot.empty) {
      logger.info("Nenhuma tarefa recorrente encontrada para resetar.");
      return;
    }

    const batch = db.batch();

    snapshot.forEach((doc) => {
      const task = doc.data();
      const taskRef = tasksCollectionRef.doc(doc.id);
      const updatePayload: any = { 
          isCompleted: false,
          approvalStatus: admin.firestore.FieldValue.delete(),
          proofs: admin.firestore.FieldValue.delete(),
          approvalNotes: admin.firestore.FieldValue.delete(),
          submittedAt: admin.firestore.FieldValue.delete(),
          feedback: admin.firestore.FieldValue.delete(), // Also reset feedback
          rejectionFeedback: admin.firestore.FieldValue.delete(), // Also reset new feedback field
      };

      if (task.checklist && Array.isArray(task.checklist)) {
        const resetChecklist = task.checklist.map((item: any) => ({
          ...item,
          isCompleted: false,
        }));
        updatePayload.checklist = resetChecklist;
      }
      
      batch.update(taskRef, updatePayload);
      logger.info(`A tarefa ${doc.id} foi agendada para reset no batch.`);
    });

    try {
      await batch.commit();
      logger.info(
        `Reset de tarefas recorrentes concluído com sucesso para ${snapshot.size} tarefas.`
      );
    } catch (error) {
      logger.error("Erro ao executar o batch de reset:", error);
    }
  }
);


// --- Funções de Notificação ---

/**
 * Cria uma notificação para um utilizador específico.
 */
async function createNotification(userId: string, message: string, link: string) {
    if (!userId) return;
    try {
        await db.collection("users").doc(userId).collection("notifications").add({
            message,
            link,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`Notificação criada para o utilizador ${userId}: "${message}"`);
    } catch (error) {
        logger.error(`Erro ao criar notificação para ${userId}:`, error);
    }
}

/**
 * Acionada quando uma nova tarefa, tarefa recorrente ou evento de calendário é criado.
 */
export const onTaskCreated = onDocumentCreated(
    { document: "{collectionId}/{docId}", region: "southamerica-east1" },
    async (event) => {
        const { collectionId, docId } = event.params;
        const data = event.data?.data();

        if (!['tasks', 'recurringTasks', 'calendarEvents'].includes(collectionId) || !data) {
            return;
        }

        const title = data.title || "uma nova tarefa";
        const responsibleId = data.responsibleId;
        const assistantIds = data.assistantIds || [];

        const allUserIds = [...new Set([responsibleId, ...assistantIds])].filter(Boolean);

        const message = `Você foi adicionado a uma nova atividade: ${title}`;
        const link = `/dashboard/tasks`; // Link genérico por enquanto

        for (const userId of allUserIds) {
            await createNotification(userId, message, link);
        }
    }
);


/**
 * Acionada quando uma tarefa, tarefa recorrente ou evento de calendário é atualizado.
 */
export const onTaskUpdated = onDocumentUpdated(
    { document: "{collectionId}/{docId}", region: "southamerica-east1" },
    async (event) => {
        const { collectionId, docId } = event.params;
        const dataAfter = event.data?.after.data();
        const dataBefore = event.data?.before.data();

        if (!['tasks', 'recurringTasks', 'calendarEvents'].includes(collectionId) || !dataAfter || !dataBefore) {
            return;
        }

        const title = dataAfter.title || "uma tarefa";
        const responsibleId = dataAfter.responsibleId;
        const assistantIds = dataAfter.assistantIds || [];
        const allUserIds = [...new Set([responsibleId, ...assistantIds])].filter(Boolean);

        // Notificação de atualização geral
        const updateMessage = `A atividade "${title}" foi atualizada.`;
        const link = `/dashboard/tasks`; // Link genérico

        for (const userId of allUserIds) {
            await createNotification(userId, updateMessage, link);
        }

        // Notificação de aprovação pendente
        if (dataAfter.approvalStatus === 'pending' && dataBefore.approvalStatus !== 'pending') {
            try {
                const userDoc = await db.collection("users").doc(responsibleId).get();
                if (!userDoc.exists) return;

                const teamId = userDoc.data()?.teamId;
                if (!teamId) return;

                const teamDoc = await db.collection("teams").doc(teamId).get();
                if (!teamDoc.exists) return;

                const leaderId = teamDoc.data()?.leaderId;
                if (leaderId) {
                    const approvalMessage = `Uma nova tarefa ("${title}") aguarda a sua aprovação.`;
                    const approvalLink = "/dashboard/approvals";
                    await createNotification(leaderId, approvalMessage, approvalLink);
                }
            } catch (error) {
                logger.error(`Erro ao notificar líder sobre aprovação para a tarefa ${docId}:`, error);
            }
        }
    }
);
