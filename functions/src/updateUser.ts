
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Inicialização segura do Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface UpdateUserData {
  uid: string;
  name: string;
  role: string;
  permissions: string[];
}

export const updateUser = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const data: UpdateUserData = request.data;
    logger.info("Função 'updateUser' chamada com os dados:", data);

    const { uid, name, role, permissions } = data;
    if (!uid || !name || !role || !Array.isArray(permissions)) {
      throw new HttpsError(
        "invalid-argument",
        "Faltam dados essenciais (uid, nome, cargo, permissões)."
      );
    }

    try {
      logger.info(`A atualizar documento no Firestore para UID: ${uid}`);
      await db.collection("users").doc(uid).update({
        name: name,
        role: role,
        permissions: permissions,
      });
      logger.info("Documento atualizado no Firestore com sucesso.");

      return { success: true, message: "Funcionário atualizado com sucesso!" };

    } catch (error: any) {
      logger.error("ERRO DETALHADO ao atualizar função:", error);
      throw new HttpsError("internal", "Ocorreu um erro inesperado no servidor.", error.message);
    }
  }
);
