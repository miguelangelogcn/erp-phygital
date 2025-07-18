
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

// --- FUNÇÕES DE GESTÃO (onCall) ---

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  roleId?: string;
  teamId?: string;
  permissions?: string[];
}

export const createUser = functions.region("southamerica-east1").https.onCall(async (data: CreateUserData, context) => {
    logger.info("Função 'createUser' chamada com os dados:", data);
    const { name, email, password, roleId, teamId, permissions } = data;
    if (!name || !email || !password) {
      throw new functions.https.HttpsError("invalid-argument", "Faltam dados essenciais (nome, email, senha).");
    }
    try {
      const userRecord = await auth.createUser({ email, password, displayName: name });
      const userData: any = { name, email, permissions: permissions || [] };
      if (roleId) userData.roleId = roleId;
      if (teamId) userData.teamId = teamId;
      await db.collection("users").doc(userRecord.uid).set(userData);
      return { success: true, message: "Utilizador criado com sucesso!", uid: userRecord.uid };
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        throw new functions.https.HttpsError('already-exists', 'Este e-mail já está em uso.');
      }
      throw new functions.https.HttpsError("internal", "Ocorreu um erro inesperado no servidor.", error.message);
    }
});


interface UpdateUserData {
  uid: string;
  name: string;
  roleId?: string;
  teamId?: string;
  permissions: string[];
}

export const updateUser = functions.region("southamerica-east1").https.onCall(async (data: UpdateUserData, context) => {
    const { uid, name, roleId, teamId, permissions } = data;
    if (!uid || !name || !Array.isArray(permissions)) {
      throw new functions.https.HttpsError("invalid-argument", "Faltam dados essenciais (uid, nome, permissões).");
    }
    try {
      const updatePayload: any = { name, permissions };
      if (roleId) updatePayload.roleId = roleId;
      updatePayload.teamId = teamId ? teamId : admin.firestore.FieldValue.delete();
      await db.collection("users").doc(uid).update(updatePayload);
      await auth.updateUser(uid, { displayName: name });
      return { success: true, message: "Utilizador atualizado com sucesso!" };
    } catch (error: any) {
      throw new functions.https.HttpsError("internal", "Ocorreu um erro ao atualizar o utilizador.", error.message);
    }
});


interface DeleteUserData {
  uid: string;
}

export const deleteUser = functions.region("southamerica-east1").https.onCall(async (data: DeleteUserData, context) => {
    const { uid } = data;
    if (!uid) {
      throw new functions.https.HttpsError("invalid-argument", "O UID do utilizador é obrigatório.");
    }
    try {
      await auth.deleteUser(uid);
      await db.collection("users").doc(uid).delete();
      return { success: true, message: "Utilizador excluído com sucesso!" };
    } catch (error: any) {
      throw new functions.https.HttpsError("internal", "Ocorreu um erro ao excluir o utilizador.", error.message);
    }
});


interface DeleteTaskData {
  taskId: string;
}

export const deleteTask = functions.region("southamerica-east1").https.onCall(async (data: DeleteTaskData, context) => {
    const { taskId } = data;
    if (!taskId) {
        throw new functions.https.HttpsError("invalid-argument", "O ID da tarefa é obrigatório.");
    }
    try {
        await db.collection("tasks").doc(taskId).delete();
        return { success: true, message: "Tarefa excluída com sucesso!" };
    } catch (error: any) {
        throw new functions.https.HttpsError("internal", "Ocorreu um erro ao excluir a tarefa.", error.message);
    }
});


interface SubmitForApprovalData {
  taskId: string;
  taskType: "tasks" | "recurringTasks";
  proofs: { url: string; name: string }[];
  notes: string;
}

export const submitTaskForApproval = functions.region("southamerica-east1").https.onCall(async (data: SubmitForApprovalData, context) => {
    const { taskId, taskType, proofs, notes } = data;
    if (!taskId || !taskType || !proofs || proofs.length === 0) {
      throw new functions.https.HttpsError("invalid-argument", "Dados insuficientes para submeter para aprovação.");
    }
    const collectionName = taskType === 'tasks' ? 'tasks' : 'recurringTasks';
    try {
      await db.collection(collectionName).doc(taskId).update({
        approvalStatus: 'pending',
        proofs,
        approvalNotes: notes || "",
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        rejectionFeedback: admin.firestore.FieldValue.delete(),
      });
      return { success: true, message: "Tarefa submetida para aprovação!" };
    } catch (error: any) {
      throw new functions.https.HttpsError("internal", "Ocorreu um erro ao submeter a tarefa.", error.message);
    }
});


interface ReviewTaskData {
  taskId: string;
  taskType: "tasks" | "recurringTasks";
  decision: "approved" | "rejected";
  feedback?: { notes: string; files?: { url: string; name: string }[]; audioUrl?: string; };
}

export const reviewTask = functions.region("southamerica-east1").https.onCall(async (data: ReviewTaskData, context) => {
    const { taskId, taskType, decision, feedback } = data;
    const approverId = context.auth?.uid;
    if (!approverId) {
      throw new functions.https.HttpsError("unauthenticated", "O utilizador deve estar autenticado para rever tarefas.");
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
        const newFeedbackEntry = { ...(feedback || {}), rejectedBy: approverId, rejectedAt: admin.firestore.FieldValue.serverTimestamp() };
        updateData.rejectionFeedback = admin.firestore.FieldValue.arrayUnion(newFeedbackEntry);
        if (collectionName === 'tasks') {
          updateData.status = 'todo';
        } else {
          updateData.isCompleted = false;
        }
        updateData.proofs = admin.firestore.FieldValue.delete();
        updateData.approvalNotes = admin.firestore.FieldValue.delete();
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
      throw new functions.https.HttpsError("internal", "Ocorreu um erro ao processar a sua revisão.");
    }
});

// --- FUNÇÃO AGENDADA (onSchedule) ---

export const resetRecurringTasks = functions.region("southamerica-east1").pubsub.schedule("59 23 * * 0")
  .timeZone("America/Sao_Paulo")
  .onRun(async (context) => {
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
        rejectionFeedback: admin.firestore.FieldValue.delete(),
      };
      if (task.checklist && Array.isArray(task.checklist)) {
        updatePayload.checklist = task.checklist.map((item: any) => ({ ...item, isCompleted: false }));
      }
      batch.update(taskRef, updatePayload);
    });
    try {
      await batch.commit();
      logger.info(`Reset de tarefas recorrentes concluído com sucesso para ${snapshot.size} tarefas.`);
    } catch (error) {
      logger.error("Erro ao executar o batch de reset:", error);
    }
});


// --- FUNÇÕES DE GERAÇÃO DE NOTIFICAÇÕES (Triggers) ---

const createNotificationsForUsers = async (userIds: string[], message: string, linkTo: string, triggeredBy: string) => {
  const batch = db.batch();
  userIds.forEach((userId) => {
    if (userId) {
      const notificationRef = db.collection('users').doc(userId).collection('notifications').doc();
      batch.set(notificationRef, {
        message,
        linkTo,
        triggeredBy,
        status: 'unread',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
  await batch.commit();
};

export const onTaskCreated = functions.region("southamerica-east1").firestore
  .document('tasks/{taskId}')
  .onCreate(async (snap, context) => {
    const task = snap.data();
    if (!task) return null;
    
    // Assegura que responsibleId existe antes de chamar auth.getUser
    if (!task.responsibleId) {
        logger.error("A tarefa foi criada sem um responsibleId.", { taskId: context.params.taskId });
        return null;
    }
    
    const creatorUser = await auth.getUser(task.responsibleId);
    const creatorName = creatorUser.displayName || 'Sistema';
    
    const message = `${creatorName} criou uma nova tarefa: "${task.title}"`;
    const linkTo = `/dashboard/tasks?openTask=${context.params.taskId}`;
    
    const userIdsToNotify = [task.responsibleId, ...(task.assistantIds || [])];
    const uniqueUserIds = [...new Set(userIdsToNotify)];

    return createNotificationsForUsers(uniqueUserIds, message, linkTo, creatorName);
  });

export const onTaskUpdated = functions.region("southamerica-east1").firestore
  .document('tasks/{taskId}')
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();

    // Notificação para tarefa enviada para aprovação
    if (newValue.approvalStatus === 'pending' && previousValue.approvalStatus !== 'pending') {
      try {
        const taskCreatorDoc = await db.collection('users').doc(newValue.responsibleId).get();
        if (!taskCreatorDoc.exists) return null;

        const taskCreator = taskCreatorDoc.data();
        const teamId = taskCreator?.teamId;

        if (teamId) {
          const teamDoc = await db.collection('teams').doc(teamId).get();
          if (!teamDoc.exists) return null;
          
          const team = teamDoc.data();
          const leaderId = team?.leaderId;

          if (leaderId) {
            const message = `A tarefa "${newValue.title}" foi submetida para aprovação.`;
            const linkTo = `/dashboard/approvals`;
            const creatorName = taskCreator?.name || 'Um utilizador';
            await createNotificationsForUsers([leaderId], message, linkTo, creatorName);
          }
        }
      } catch (error) {
        logger.error(`Erro ao notificar líder para a tarefa ${context.params.taskId}:`, error);
      }
    }
    // Adicione aqui outras lógicas de notificação para edição, se desejar
    return null;
  });
