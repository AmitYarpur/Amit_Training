// Firebase config and data-access layer, kept separate from the page files.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
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

// type: "systolic" | "diastolic" | "heart_rate"
export async function saveReading(type, value) {
  await addDoc(collection(db, "readings"), {
    person: PERSON,
    type,
    value,
    recordedAt: serverTimestamp(),
    recordedAtLocal: new Date().toString()
  });
}
