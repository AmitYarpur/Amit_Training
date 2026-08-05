// Firebase config and data-access layer, kept separate from the page files.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
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

// Registers the static-shell cache once per page load. Runs on every page
// since every page imports this module. Firebase/Firestore traffic itself
// is untouched by the service worker (see sw.js) - this only speeds up and
// adds resilience to loading the app's own HTML/CSS/JS.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

const SESSION_KEY = "helth_user";
const THEME_KEY = "helth_theme";
const LANG_KEY = "helth_lang";

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
  // Avoid the next person to use this device/browser seeing a flash of
  // whoever was previously signed in's theme before it's reconciled.
  localStorage.removeItem(THEME_KEY);
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

// Applies the signed-in user's saved theme to the page, correcting any
// stale/leftover value in the shared localStorage cache (e.g. from a
// previous account on the same device). No-op if nobody is logged in.
// Call this on every page after the instant cached-theme bootstrap runs,
// so each page reconciles with Firestore instead of trusting the cache.
export async function applyUserTheme() {
  const username = getCurrentUser();
  if (!username) return;

  let theme = "light";
  try {
    theme = (await getThemePreference(username)) || "light";
  } catch (e) {
    return; // keep whatever's already applied rather than fail loudly here
  }

  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem(THEME_KEY, theme);
}

// language: "en" | "he"
export async function saveLanguagePreference(language, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  await setDoc(userDocRef(username), { language }, { merge: true });
  localStorage.setItem(LANG_KEY, language);
}

export async function getLanguagePreference(username = getCurrentUser()) {
  if (!username) return null;
  const snap = await getDoc(userDocRef(username));
  return snap.exists() ? (snap.data().language || null) : null;
}

// Resolves the signed-in user's saved language (defaulting to "en"),
// corrects the localStorage cache, sets the page's dir attribute, and
// returns the resolved language so the caller can run translatePage().
export async function applyUserLanguage() {
  const cached = localStorage.getItem(LANG_KEY) || "en";
  const username = getCurrentUser();
  if (!username) return cached;

  let language = "en";
  try {
    language = (await getLanguagePreference(username)) || "en";
  } catch (e) {
    return cached; // keep whatever's already applied rather than fail loudly here
  }

  document.documentElement.setAttribute("dir", language === "he" ? "rtl" : "ltr");
  localStorage.setItem(LANG_KEY, language);
  return language;
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

export async function updateBloodPressureReading(id, values, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  await updateDoc(doc(db, "users", username, "bloodPressureReadings", id), {
    systolic: values.systolic,
    diastolic: values.diastolic,
    heart_rate: values.heart_rate
  });
}

export async function deleteBloodPressureReading(id, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  await deleteDoc(doc(db, "users", username, "bloodPressureReadings", id));
}

// --- Weight readings, scoped under the current user (kg) ---------------

function weightCollection(username) {
  return collection(db, "users", username, "weightReadings");
}

export async function saveWeight(value, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  await addDoc(weightCollection(username), {
    value,
    recordedAt: serverTimestamp(),
    recordedAtLocal: new Date().toString()
  });
}

// Returns one row per reading: { id, recordedAt: Date, value } sorted oldest first.
export async function getWeightSessions(username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  const q = query(weightCollection(username), orderBy("recordedAt", "asc"));
  const snap = await getDocs(q);

  return snap.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      recordedAt: data.recordedAt ? data.recordedAt.toDate() : new Date(data.recordedAtLocal),
      value: data.value
    };
  });
}

export async function updateWeight(id, value, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  await updateDoc(doc(db, "users", username, "weightReadings", id), { value });
}

export async function deleteWeight(id, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  await deleteDoc(doc(db, "users", username, "weightReadings", id));
}

// --- Training sessions (running, walking, pulldown, ...), scoped under ----
// --- the current user. Each exercise type has its own field shape ---------
// --- (e.g. running/walking: distance + time; pulldown: sessions + weight).

function trainingCollection(kind, username) {
  return collection(db, "users", username, kind + "Sessions");
}

// values: a flat object of whatever fields this exercise type tracks
export async function saveTrainingSession(kind, values, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  await addDoc(trainingCollection(kind, username), {
    ...values,
    recordedAt: serverTimestamp(),
    recordedAtLocal: new Date().toString()
  });
}

// Returns one row per session: { id, recordedAt: Date, ...whatever fields
// were saved } sorted oldest first.
export async function getTrainingSessions(kind, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  const q = query(trainingCollection(kind, username), orderBy("recordedAt", "asc"));
  const snap = await getDocs(q);

  return snap.docs.map(docSnap => {
    const { recordedAt, recordedAtLocal, ...fields } = docSnap.data();
    return {
      id: docSnap.id,
      recordedAt: recordedAt ? recordedAt.toDate() : new Date(recordedAtLocal),
      ...fields
    };
  });
}

// values: a flat object of whatever fields this exercise type tracks
export async function updateTrainingSession(kind, id, values, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  await updateDoc(doc(db, "users", username, kind + "Sessions", id), { ...values });
}

export async function deleteTrainingSession(kind, id, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  await deleteDoc(doc(db, "users", username, kind + "Sessions", id));
}
