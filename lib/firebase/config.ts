// Importe as funções necessárias
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Cole o seu objeto firebaseConfig aqui
const firebaseConfig = {
  apiKey: "AIzaSyAR6yVtSS3ONIHQA2n_8MZZwcWzv925sII",
  authDomain: "phygital-login.firebaseapp.com",
  projectId: "phygital-login",
  storageBucket: "phygital-login.firebasestorage.app",
  messagingSenderId: "505157758099",
  appId: "1:505157758099:web:5a42382637f95900c27166"
};

// Inicialize o Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exporte as instâncias dos serviços para serem usadas em toda a aplicação
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
