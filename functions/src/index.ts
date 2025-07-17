import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
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


export const createUser = onCall(
  // Define a região e outras opções aqui
  { region: "southamerica-east1" },
  async (request) => {
    // Tipa os dados recebidos
    const data: CreateUserData = request.data;
    logger.info("Função 'createUser' chamada com os dados:", data);

    // Validação de dados de entrada
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
      
      // Atualiza o documento no Firestore
      await db.collection("users").doc(uid).update(updatePayload);

      // Opcional: Atualiza também o nome no Firebase Auth
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
      // Exclui o utilizador do Firebase Authentication
      await auth.deleteUser(uid);
      logger.info(`Utilizador ${uid} excluído do Auth.`);

      // Exclui o documento do utilizador do Firestore
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
      const updatePayload: any = { isCompleted: false };

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
