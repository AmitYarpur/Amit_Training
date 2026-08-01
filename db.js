// Firebase config and data-access layer, kept separate from the page files.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_gmhGlVunyg5Y6IjNmW4Lu-VRew5y_4M",
  authDomain: "training-amit.firebaseapp.com",
  projectId: "training-amit",
  storageBucket: "training-amit.firebasestorage.app",
  messagingSenderId: "1007095389957",
  appId: "1:1007095389957:web:1fa474773bac59cb5ee16c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PERSON = "Amit";

// values: { systolic: number, diastolic: number, heart_rate: number }
// Saved as 3 documents sharing one sessionId, so a single reading session
// (all 3 numbers taken together) can later be grouped back into one row.
export async function saveReadings(values) {
  const sessionId = crypto.randomUUID();
  const recordedAtLocal = new Date().toString();
  const batch = writeBatch(db);

  for (const [type, value] of Object.entries(values)) {
    const ref = doc(collection(db, "readings"));
    batch.set(ref, {
      person: PERSON,
      type,
      value,
      sessionId,
      recordedAt: serverTimestamp(),
      recordedAtLocal
    });
  }

  await batch.commit();
}
