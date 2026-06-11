import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey?.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.substring(1, privateKey.length - 1);
}

if (!getApps().length && projectId && clientEmail && privateKey) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
}

const messaging = getMessaging();

export { messaging };
