import { onCall, HttpsError } from "firebase-functions/v2/https";
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
  role: string;
}

interface UpdateUserData {
  uid: string;
  name: string;
  role: string;
  permissions: string[];
}


export const createUser = onCall(
  // Define a região e outras opções aqui
  { region: "southamerica-east1" },
  async (request) => {
    // Tipa os dados recebidos
    const data: CreateUserData = request.data;
    logger.info("Função 'createUser' chamada com os dados:", data);

    // Validação de dados de entrada
    const { name, email, password, role } = data;
    if (!name || !email || !password || !role) {
      throw new HttpsError(
        "invalid-argument",
        "Faltam dados essenciais (nome, email, senha, cargo)."
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

      logger.info(`A criar documento no Firestore para UID: ${userRecord.uid}`);
      await db.collection("users").doc(userRecord.uid).set({
        name: name,
        email: email,
        role: role,
        permissions: [],
      });
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
    const { uid, name, role, permissions } = data;
    logger.info(`A atualizar o utilizador: ${uid}`, data);

    if (!uid || !name || !role || !Array.isArray(permissions)) {
      throw new HttpsError(
        "invalid-argument",
        "Faltam dados essenciais (uid, nome, cargo, permissões)."
      );
    }

    try {
      // Atualiza o documento no Firestore
      await db.collection("users").doc(uid).update({
        name: name,
        role: role,
        permissions: permissions,
      });

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
