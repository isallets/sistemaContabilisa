import * as admin from "firebase-admin";
import * as dotenv from "dotenv";

dotenv.config();

// Evita inicialização duplicada em serverless
if (!admin.apps.length) {
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY ||
    !process.env.FIREBASE_DATABASE_URL
  ) {
    console.error("Variáveis de ambiente do Firebase ausentes!");
    throw new Error("Firebase config error");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process
        .env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), // Corrige quebra de linha
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

export const db = admin.database();
