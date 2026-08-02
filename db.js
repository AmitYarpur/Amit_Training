// Firebase config and data-access layer, kept separate from the page files.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
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

const SESSION_KEY = "helth_user";
const THEME_KEY = "helth_theme";

// --- Auth (lightweight, no backend) -----------------------------------
// There's no server here to keep a password check secret, so this is a
// basic "is this the right password" gate against a hashed value in
// Firestore - good enough to give each person their own space on a
// shared family app, not bank-grade security.

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function credentialRef(username) {
  return doc(db, "credentials", username);
}

export async function signup(username, password) {
  username = username.trim();
  if (!username || !password) {
    throw new Error("Please enter a username and password.");
  }

  const ref = credentialRef(username);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error("That username is already taken.");
  }

  const passwordHash = await hashPassword(password);
  await setDoc(ref, { passwordHash, createdAt: serverTimestamp() });
  setCurrentUser(username);
  return username;
}

export async function login(username, password) {
  username = username.trim();
  const ref = credentialRef(username);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("No account found with that username.");
  }

  const passwordHash = await hashPassword(password);
  if (snap.data().passwordHash !== passwordHash) {
    throw new Error("Incorrect password.");
  }

  setCurrentUser(username);
  return username;
}

export function getCurrentUser() {
  return localStorage.getItem(SESSION_KEY);
}

function setCurrentUser(username) {
  localStorage.setItem(SESSION_KEY, username);
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

// --- Per-user settings (currently just light/dark appearance) ---------

function userDocRef(username) {
  return doc(db, "users", username);
}

// theme: "light" | "dark"
export async function saveThemePreference(theme, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  await setDoc(userDocRef(username), { theme }, { merge: true });
  localStorage.setItem(THEME_KEY, theme);
}

export async function getThemePreference(username = getCurrentUser()) {
  if (!username) return null;
  const snap = await getDoc(userDocRef(username));
  return snap.exists() ? (snap.data().theme || null) : null;
}

// --- Blood pressure readings, scoped under the current user -----------

function bloodPressureCollection(username) {
  return collection(db, "users", username, "bloodPressureReadings");
}

// values: { systolic: number, diastolic: number, heart_rate: number }
// Saved as a single record under the user, so one submission = one row.
export async function saveReadings(values, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
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
export async function getBloodPressureSessions(username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
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
