// firebase.js - Configuración FIRESTORE

// 1) IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

// 2) CONFIGURACIÓN
const firebaseConfig = {
  apiKey: "AIzaSyBREhsmFkRObF6k-bHSfvKhDgCLm8vNTZY",
  authDomain: "vlack-f25d6.firebaseapp.com",
  projectId: "vlack-f25d6",
  storageBucket: "vlack-f25d6.appspot.com",
  messagingSenderId: "144475728138",
  appId: "1:144475728138:web:776eba022b91b1d4f6b2f3"
};

// 3) INICIAR
const app = initializeApp(firebaseConfig);

// 🔥 EXPORTAR SERVICIOS
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

