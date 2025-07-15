'use server';

import { getApps, initializeApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Função para inicializar o Firebase Admin SDK de forma segura
function initializeFirebaseAdmin(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0] as App;
  }

  // As credenciais são obtidas automaticamente das variáveis de ambiente
  // em ambientes como o Firebase App Hosting ou Cloud Functions.
  // Para desenvolvimento local, você precisará configurar um arquivo de conta de serviço.
  // Consulte a documentação do Firebase: https://firebase.google.com/docs/admin/setup
  return initializeApp();
}

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

    const adminApp = initializeFirebaseAdmin();
    const adminAuth = getAuth(adminApp);
    const adminDb = getFirestore(adminApp);

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
    }

    return { error: error.message || errorMessage };
  }
}
