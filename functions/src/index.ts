import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// Garanta que a inicialização seja feita apenas uma vez.
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

export const createUser = onCall(async (request) => {
    logger.info("Função 'createUser' chamada com os dados:", request.data);

    // Verificação de autenticação (opcional, mas boa prática)
    // if (!request.auth) {
    //   throw new HttpsError(
    //     "unauthenticated",
    //     "O utilizador deve estar autenticado para criar outros utilizadores."
    //   );
    // }

    const { name, email, password, role } = request.data;

    if (!name || !email || !password || !role) {
        logger.warn("Tentativa de criar usuário com dados ausentes.", { name, email, role });
        throw new HttpsError(
            "invalid-argument",
            "Faltam dados essenciais (nome, email, senha, cargo)."
        );
    }

    try {
        logger.info(`A criar utilizador no Auth para: ${email}`);
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });
        logger.info(`Utilizador criado no Auth com UID: ${userRecord.uid}`);

        logger.info(`A criar documento no Firestore para UID: ${userRecord.uid}`);
        await db.collection("users").doc(userRecord.uid).set({
            name,
            email,
            role,
            permissions: [],
        });
        logger.info("Documento criado no Firestore com sucesso.");

        return { success: true, uid: userRecord.uid };

    } catch (error: any) {
        logger.error("ERRO DETALHADO dentro da função:", error);

        // Mapeia os erros comuns do Firebase para mensagens mais amigáveis
        if (error.code === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'Este endereço de e-mail já está em uso.');
        } else if (error.code === 'auth/invalid-password') {
             throw new HttpsError('invalid-argument', 'A senha fornecida é inválida. Deve ter pelo menos 6 caracteres.');
        }

        // Para outros erros, lança um erro HttpsError genérico para que o cliente receba uma mensagem clara
        throw new HttpsError(
            "internal",
            "Ocorreu um erro no servidor ao criar o utilizador.",
            error.message
        );
    }
});
