// Firebase config and data-access layer, kept separate from the page files.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  query,
  orderBy,
  getDocs
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

// Returns one row per reading session: { sessionId, recordedAt: Date, systolic, diastolic, heart_rate }
// sorted oldest first. Readings saved without a sessionId (from early testing)
// each become their own row, keyed by their document id.
export async function getBloodPressureSessions() {
  const q = query(collection(db, "readings"), orderBy("recordedAt", "asc"));
  const snap = await getDocs(q);

  const sessions = new Map();

  snap.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (data.person !== PERSON) return;

    const key = data.sessionId || docSnap.id;
    if (!sessions.has(key)) {
      sessions.set(key, {
        sessionId: key,
        recordedAt: data.recordedAt ? data.recordedAt.toDate() : new Date(data.recordedAtLocal)
      });
    }
    sessions.get(key)[data.type] = data.value;
  });

  return Array.from(sessions.values()).sort((a, b) => a.recordedAt - b.recordedAt);
}
