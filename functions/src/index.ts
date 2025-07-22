
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import axios from "axios";
import * as dotenv from "dotenv";
import * as crypto from "crypto";
import cors from "cors";
import { defineString } from "firebase-functions/params";

const corsHandler = cors({ origin: true });

// Defina as suas variáveis de ambiente para segurança
const metaAppId = defineString("META_APP_ID");
const metaAppSecret = defineString("META_APP_SECRET");


dotenv.config();

// Configurações de encriptação (NÃO MUDE A CHAVE APÓS DEFINIDA)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const IV_LENGTH = 16;


// Inicialização segura do Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();


// --- FUNÇÕES DE ENCRIPTAÇÃO ---

function decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}


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
  const { uid, ...dataToUpdate } = request.data;
  
  if (!uid) {
    throw new HttpsError("invalid-argument", "O UID do utilizador é obrigatório.");
  }

  try {
    const userDocRef = db.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Utilizador não encontrado.");
    }

    const existingData = userDoc.data();
    const finalData = { ...existingData, ...dataToUpdate };

    if (!finalData.name || !Array.isArray(finalData.permissions)) {
        throw new HttpsError("invalid-argument", "Os dados finais estão incompletos (nome, permissões).");
    }

    await userDocRef.update(finalData);

    if (dataToUpdate.roleId && dataToUpdate.roleId !== existingData?.roleId) {
      await auth.setCustomUserClaims(uid, { roleId: dataToUpdate.roleId });
    }
    
    return { success: true, message: "Utilizador atualizado com sucesso." };
  } catch (error: any) {
    logger.error("Erro ao atualizar o utilizador:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
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

    if (typeof taskId !== 'string' || taskId.trim() === '') {
        logger.error("Validação falhou: 'taskId' inválido.", { taskId, taskType });
        throw new HttpsError("invalid-argument", "O 'taskId' é inválido ou não foi fornecido.");
    }
    if (typeof taskType !== 'string' || !['tasks', 'recurringTasks'].includes(taskType)) {
        logger.error("Validação falhou: 'taskType' inválido.", { taskId, taskType });
        throw new HttpsError("invalid-argument", "O 'taskType' é inválido ou não foi fornecido.");
    }

    const collectionName = taskType;
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
    const { taskId, taskType, proofs, notes } = request.data;
    if (!taskId || !taskType || !proofs || !Array.isArray(proofs)) {
        throw new HttpsError("invalid-argument", "Faltam dados essenciais ou o formato das provas é inválido.");
    }
    const collectionName = taskType === 'tasks' ? 'tasks' : 'recurringTasks';
    try {
        await db.collection(collectionName).doc(taskId).update({
            approvalStatus: 'pending',
            proofs: proofs,
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

        updateData.rejectionFeedback = admin.firestore.FieldValue.arrayUnion({
            ...cleanFeedback,
            rejectedAt: new Date(), 
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
          proofs: [],
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

// --- INTEGRAÇÃO COM A META ---

export const startMetaAuth = onRequest({ region: "southamerica-east1" }, (req, res) => {
    corsHandler(req, res, () => {
        const { clientId } = req.query;
        if (typeof clientId !== 'string') {
            res.status(400).send("Client ID is required.");
            return;
        }

        const redirectUri = `https://southamerica-east1-phygital-login.cloudfunctions.net/metaAuthCallback`;
        const scope = "ads_read,read_insights";
        const state = JSON.stringify({ clientId }); // Passando o clientId através do state

        const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${metaAppId.value()}&redirect_uri=${redirectUri}&state=${encodeURIComponent(state)}&scope=${scope}`;
        
        logger.info(`Redirecting user to Meta for auth for clientId: ${clientId}`);
        res.redirect(authUrl);
    });
});

export const metaAuthCallback = onRequest({ region: "southamerica-east1" }, async (req, res) => {
    corsHandler(req, res, async () => {
        const { code, state } = req.query;

        if (typeof code !== 'string' || typeof state !== 'string') {
            res.status(400).send("Authorization code and state are required.");
            return;
        }

        const { clientId } = JSON.parse(decodeURIComponent(state));
        const redirectUri = `https://southamerica-east1-phygital-login.cloudfunctions.net/metaAuthCallback`;

        try {
            // Trocar código por token de acesso
            const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token`;
            const tokenResponse = await axios.get(tokenUrl, {
                params: {
                    client_id: metaAppId.value(),
                    redirect_uri: redirectUri,
                    client_secret: metaAppSecret.value(),
                    code: code,
                }
            });

            const accessToken = tokenResponse.data.access_token;

            // Buscar as contas de anúncios do utilizador
            const adAccountsUrl = `https://graph.facebook.com/v20.0/me/adaccounts?access_token=${accessToken}&fields=account_id,name`;
            const adAccountsResponse = await axios.get(adAccountsUrl);
            const adAccounts = adAccountsResponse.data.data;

            if (!adAccounts || adAccounts.length === 0) {
                 res.status(404).send("Nenhuma conta de anúncios encontrada para este utilizador.");
                 return;
            }

            // Por simplicidade, vamos usar a primeira conta de anúncios encontrada
            const adAccountId = adAccounts[0].account_id;
            
            // Salvar no Firestore
            await db.collection('clients').doc(clientId).update({
                'metaIntegration.adAccountId': adAccountId,
                'metaIntegration.userAccessToken': accessToken,
            });

            res.send("<script>window.close();</script>");

        } catch (error: any) {
            logger.error("Error in Meta OAuth callback:", error.response?.data || error.message);
            res.status(500).send("Ocorreu um erro ao vincular a conta.");
        }
    });
});


export const syncMetaCampaigns = onSchedule({
    schedule: "every 2 hours", // "0 */2 * * *"
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1"
}, async (event) => {
    logger.info("A iniciar a sincronização das campanhas da Meta...");
    const clientsRef = db.collection("clients");
    const integratedClientsQuery = clientsRef.where("metaIntegration.adAccountId", "!=", null);
    
    const querySnapshot = await integratedClientsQuery.get();
    if (querySnapshot.empty) {
        logger.info("Nenhum cliente com integração da Meta encontrada.");
        return;
    }

    for (const clientDoc of querySnapshot.docs) {
        const clientData = clientDoc.data();
        const clientId = clientDoc.id;
        const adAccountId = clientData.metaIntegration.adAccountId;
        const encryptedToken = clientData.metaIntegration.userAccessToken;
        const tokenExpiresAt = clientData.metaIntegration.tokenExpiresAt.toDate();

        if (new Date() > tokenExpiresAt) {
            logger.warn(`Token para o cliente ${clientId} expirou. A ignorar a sincronização.`);
            // TODO: Adicionar lógica para notificar sobre token expirado
            continue;
        }

        try {
            const accessToken = decrypt(encryptedToken);
            const campaignsUrl = new URL(`https://graph.facebook.com/v19.0/${adAccountId}/campaigns`);
            const fields = "id,name,objective,status,insights.fields(spend,impressions,clicks,cpc,cpm,ctr)";
            campaignsUrl.searchParams.append("fields", fields);
            campaignsUrl.searchParams.append("access_token", accessToken);

            const response = await axios.get(campaignsUrl.toString());
            const campaigns = response.data.data;

            if (!campaigns || campaigns.length === 0) {
                logger.info(`Nenhuma campanha encontrada para o cliente ${clientId}.`);
                continue;
            }

            const batch = db.batch();
            const campaignsCollectionRef = clientDoc.ref.collection("metaCampaigns");
            
            campaigns.forEach((campaign: any) => {
                const campaignRef = campaignsCollectionRef.doc(campaign.id);
                const insights = campaign.insights ? campaign.insights.data[0] : {};

                const campaignData = {
                    id: campaign.id,
                    name: campaign.name,
                    objective: campaign.objective,
                    status: campaign.status,
                    spend: parseFloat(insights.spend || '0'),
                    impressions: parseInt(insights.impressions || '0', 10),
                    clicks: parseInt(insights.clicks || '0', 10),
                    cpc: parseFloat(insights.cpc || '0'),
                    cpm: parseFloat(insights.cpm || '0'),
                    ctr: parseFloat(insights.ctr || '0'),
                    lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
                };
                batch.set(campaignRef, campaignData, { merge: true });
            });
            
            await batch.commit();
            logger.info(`Sincronizadas ${campaigns.length} campanhas para o cliente ${clientId}.`);

        } catch (error: any) {
            logger.error(`Erro ao sincronizar campanhas para o cliente ${clientId}:`, error.response ? error.response.data : error.message);
        }
    }
});


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
