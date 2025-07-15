import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

export const createUser = onCall(async (request) => {
    // Note: Checking for auth is a good practice for callable functions.
    // if (!request.auth) {
    //   throw new HttpsError("unauthenticated", "Você deve estar autenticado para criar um usuário.");
    // }

    const { name, email, password, role } = request.data;

    logger.info("Tentativa de criação de usuário:", { email, role });

    // Validação dos dados
    if (!name || !email || !password || !role) {
        throw new HttpsError("invalid-argument", "Todos os campos são obrigatórios.");
    }
    if (password.length < 6) {
        throw new HttpsError("invalid-argument", "A senha deve ter pelo menos 6 caracteres.");
    }

    try {
        // 1. Criar usuário no Firebase Authentication
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });

        logger.info("Usuário criado no Auth com UID:", userRecord.uid);

        // 2. Criar documento no Firestore
        await db.collection("users").doc(userRecord.uid).set({
            name,
            email,
            role,
            permissions: [],
        });

        logger.info("Documento do usuário criado no Firestore para UID:", userRecord.uid);


        return { success: true, uid: userRecord.uid };
    } catch (error: any) {
        logger.error("Erro ao criar usuário:", error);

        // Mapeia os erros comuns do Firebase para mensagens mais amigáveis
        let message = "Ocorreu um erro desconhecido.";
        if (error.code === "auth/email-already-exists") {
            message = "Este endereço de e-mail já está em uso.";
        } else if (error.code === "auth/invalid-password") {
            message = "A senha fornecida é inválida. Deve ter pelo menos 6 caracteres.";
        }
        
        throw new HttpsError("internal", message, error);
    }
});
