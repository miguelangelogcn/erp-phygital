// Ficheiro: functions/src/index.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Inicialização segura do Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

export const createUser = functions
  .region("southamerica-east1") // Especifica a região
  .https.onCall(async (data) => {
    // Validação de dados de entrada
    const {name, email, password, role} = data;
    if (!(typeof name === "string" && name.length > 0 &&
      typeof email === "string" && email.length > 0 &&
      typeof password === "string" && password.length > 0 &&
      typeof role === "string" && role.length > 0)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Dados inválidos ou em falta."
      );
    }

    try {
      // Cria o utilizador no Authentication
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: name,
      });

      // Cria o documento do utilizador no Firestore
      await db.collection("users").doc(userRecord.uid).set({
        name: name,
        email: email,
        role: role,
        permissions: [],
      });

      return {
        success: true,
        message: "Utilizador criado com sucesso!",
        uid: userRecord.uid,
      };
    } catch (error: any) {
      console.error("Erro ao criar utilizador:", error);
      // Converte erros do Auth para erros que o cliente entende
      if (error.code === "auth/email-already-exists") {
        throw new functions.https.HttpsError(
          "already-exists", "Este e-mail já está em uso."
        );
      }
      throw new functions.https.HttpsError(
        "internal", "Ocorreu um erro inesperado no servidor."
      );
    }
  });
