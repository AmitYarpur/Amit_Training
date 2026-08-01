// Firebase config and data-access layer, kept separate from the page files.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
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

// Hardcoded for now; once the app supports multiple users this becomes
// whoever is signed in / selected, and every call below already takes
// the username as a parameter so nothing else has to change.
const CURRENT_USER = "Amit";

function bloodPressureCollection(username) {
  return collection(db, "users", username, "bloodPressureReadings");
}

// values: { systolic: number, diastolic: number, heart_rate: number }
// Saved as a single record under the user, so one submission = one row.
export async function saveReadings(values, username = CURRENT_USER) {
  await addDoc(bloodPressureCollection(username), {
    systolic: values.systolic,
    diastolic: values.diastolic,
    heart_rate: values.heart_rate,
    recordedAt: serverTimestamp(),
    recordedAtLocal: new Date().toString()
  });
}

// Returns one row per reading: { id, recordedAt: Date, systolic, diastolic, heart_rate }
// sorted oldest first.
export async function getBloodPressureSessions(username = CURRENT_USER) {
  const q = query(bloodPressureCollection(username), orderBy("recordedAt", "asc"));
  const snap = await getDocs(q);

  return snap.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      recordedAt: data.recordedAt ? data.recordedAt.toDate() : new Date(data.recordedAtLocal),
      systolic: data.systolic,
      diastolic: data.diastolic,
      heart_rate: data.heart_rate
    };
  });
}
