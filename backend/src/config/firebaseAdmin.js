/**
 * Firebase Admin SDK Configuration
 */

require('dotenv').config();
const admin = require('firebase-admin');

let firestoreDb = null;
let isInitialized = false;

function initFirebaseAdmin() {
  if (isInitialized) return firestoreDb;
  isInitialized = true;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firestoreDb = admin.firestore();
      console.log('[Firebase Admin] Successfully connected to Firebase via service account key.');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      firestoreDb = admin.firestore();
      console.log('[Firebase Admin] Successfully connected to Firebase via application default credentials.');
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      firestoreDb = admin.firestore();
      console.log(`[Firebase Admin] Initialized Firebase Admin for project: ${process.env.FIREBASE_PROJECT_ID}`);
    } else {
      console.log('[Firebase Admin] No Firebase credentials provided in env. Data store running in resilient local sync mode.');
    }
  } catch (err) {
    console.warn(`[Firebase Admin] Initialization notice: ${err.message}. Using resilient local store.`);
  }

  return firestoreDb;
}

module.exports = {
  admin,
  initFirebaseAdmin,
  getFirestore: () => firestoreDb || (isInitialized ? null : initFirebaseAdmin())
};
