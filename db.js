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

// --- Diagnostics: rotating client-side log ------------------------------
// There's no backend to send logs to, so this keeps the last N timestamped
// events in localStorage instead - enough to see what a hung/slow report
// load was actually doing (which request, stuck or timed out) after the
// fact, viewable from Settings, without needing to reproduce it live.
const LOG_KEY = "helth_diag_log";
const LOG_MAX_ENTRIES = 150;

function logEvent(type, detail) {
  let entries;
  try {
    entries = JSON.parse(localStorage.getItem(LOG_KEY)) || [];
  } catch (e) {
    entries = [];
  }
  entries.push({ t: new Date().toISOString(), type, detail: detail || "" });
  if (entries.length > LOG_MAX_ENTRIES) {
    entries = entries.slice(entries.length - LOG_MAX_ENTRIES);
  }
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(entries));
  } catch (e) {
    // storage full/unavailable - logging must never break the app
  }
}

export function getDiagnosticLog() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY)) || [];
  } catch (e) {
    return [];
  }
}

export function clearDiagnosticLog() {
  localStorage.removeItem(LOG_KEY);
}

logEvent("page:load", location.pathname);
document.addEventListener("visibilitychange", () => {
  logEvent("page:visibility", document.visibilityState);
});

// A hung request (e.g. a socket iOS silently killed while the PWA was
// suspended in the background) never rejects on its own - it just leaves
// the caller awaiting forever. Every Firestore call below is wrapped with
// this so a stuck request fails after REQUEST_TIMEOUT_MS instead of
// leaving a report page stuck on "Loading..." with no way to recover
// short of force-closing the app.
const REQUEST_TIMEOUT_MS = 10000;

function withTimeout(promise, label) {
  logEvent("request:start", label);
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      logEvent("request:timeout", label);
      reject(new Error("Request timed out. Check your connection and try again."));
    }, REQUEST_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).then(
    result => { clearTimeout(timer); logEvent("request:success", label); return result; },
    err => { clearTimeout(timer); logEvent("request:error", label + ": " + err.message); throw err; }
  );
}

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
  const existing = await withTimeout(getDoc(ref), "signup:getDoc");
  if (existing.exists()) {
    throw new Error("That username is already taken.");
  }

  const passwordHash = await hashPassword(password);
  await withTimeout(setDoc(ref, { passwordHash, createdAt: serverTimestamp() }), "signup:setDoc");
  setCurrentUser(username);
  return username;
}

export async function login(username, password) {
  username = username.trim();
  const ref = credentialRef(username);
  const snap = await withTimeout(getDoc(ref), "login:getDoc");
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
  await withTimeout(setDoc(userDocRef(username), { theme }, { merge: true }), "theme:save");
  localStorage.setItem(THEME_KEY, theme);
}

export async function getThemePreference(username = getCurrentUser()) {
  if (!username) return null;
  const snap = await withTimeout(getDoc(userDocRef(username)), "theme:get");
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
  await withTimeout(setDoc(userDocRef(username), { language }, { merge: true }), "language:save");
  localStorage.setItem(LANG_KEY, language);
}

export async function getLanguagePreference(username = getCurrentUser()) {
  if (!username) return null;
  const snap = await withTimeout(getDoc(userDocRef(username)), "language:get");
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
  await withTimeout(addDoc(bloodPressureCollection(username), {
    systolic: values.systolic,
    diastolic: values.diastolic,
    heart_rate: values.heart_rate,
    recordedAt: serverTimestamp(),
    recordedAtLocal: new Date().toString()
  }), "bp:save");
}

// Returns one row per reading: { id, recordedAt: Date, systolic, diastolic, heart_rate }
// sorted oldest first.
export async function getBloodPressureSessions(username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  const q = query(bloodPressureCollection(username), orderBy("recordedAt", "asc"));
  const snap = await withTimeout(getDocs(q), "bp:get");

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
  await withTimeout(updateDoc(doc(db, "users", username, "bloodPressureReadings", id), {
    systolic: values.systolic,
    diastolic: values.diastolic,
    heart_rate: values.heart_rate
  }), "bp:update");
}

export async function deleteBloodPressureReading(id, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  await withTimeout(deleteDoc(doc(db, "users", username, "bloodPressureReadings", id)), "bp:delete");
}

// --- Weight readings, scoped under the current user (kg) ---------------

function weightCollection(username) {
  return collection(db, "users", username, "weightReadings");
}

export async function saveWeight(value, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  await withTimeout(addDoc(weightCollection(username), {
    value,
    recordedAt: serverTimestamp(),
    recordedAtLocal: new Date().toString()
  }), "weight:save");
}

// Returns one row per reading: { id, recordedAt: Date, value } sorted oldest first.
export async function getWeightSessions(username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  const q = query(weightCollection(username), orderBy("recordedAt", "asc"));
  const snap = await withTimeout(getDocs(q), "weight:get");

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
  await withTimeout(updateDoc(doc(db, "users", username, "weightReadings", id), { value }), "weight:update");
}

export async function deleteWeight(id, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  await withTimeout(deleteDoc(doc(db, "users", username, "weightReadings", id)), "weight:delete");
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
  await withTimeout(addDoc(trainingCollection(kind, username), {
    ...values,
    recordedAt: serverTimestamp(),
    recordedAtLocal: new Date().toString()
  }), kind + ":save");
}

// Returns one row per session: { id, recordedAt: Date, ...whatever fields
// were saved } sorted oldest first.
export async function getTrainingSessions(kind, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  const q = query(trainingCollection(kind, username), orderBy("recordedAt", "asc"));
  const snap = await withTimeout(getDocs(q), kind + ":get");

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
  await withTimeout(updateDoc(doc(db, "users", username, kind + "Sessions", id), { ...values }), kind + ":update");
}

export async function deleteTrainingSession(kind, id, username = getCurrentUser()) {
  if (!username) throw new Error("Not logged in.");
  await withTimeout(deleteDoc(doc(db, "users", username, kind + "Sessions", id)), kind + ":delete");
}
