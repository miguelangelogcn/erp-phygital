'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Condicionalmente inicializa o Firebase Admin SDK
// Em produção (onde as variáveis de ambiente não estão definidas), usa as credenciais padrão do ambiente.
// Em desenvolvimento local, usa as credenciais do arquivo .env.local.
if (!getApps().length) {
  if (process.env.FIREBASE_PROJECT_ID) {
    // Ambiente de desenvolvimento local com .env.local
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Ambiente de produção (Firebase App Hosting, Cloud Functions, etc.)
    initializeApp();
  }
}

const adminAuth = getAuth();
const adminDb = getFirestore();

/**
 * Cria um novo usuário no Firebase Authentication e um documento correspondente no Firestore.
 * @param formData - Os dados do formulário contendo name, email, password e role.
 * @returns Um objeto indicando sucesso ou um erro.
 */
export async function createUserAction(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as string;

    // Validação básica dos dados
    if (!name || !email || !password || !role) {
      throw new Error('Todos os campos são obrigatórios.');
    }
     if (password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }

    // 1. Criar usuário no Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Criar documento no Firestore
    await adminDb.collection('users').doc(userRecord.uid).set({
      name,
      email,
      role,
      permissions: [], // Como solicitado, um array vazio de permissões
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error creating user:', error);

    // Mapeia os erros comuns do Firebase para mensagens mais amigáveis
    let errorMessage = 'Ocorreu um erro desconhecido.';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'Este endereço de e-mail já está em uso.';
    } else if (error.code === 'auth/invalid-password') {
        errorMessage = 'A senha fornecida é inválida. Deve ter pelo menos 6 caracteres.';
    } else {
        errorMessage = error.message;
    }

    return { error: errorMessage };
  }
}
