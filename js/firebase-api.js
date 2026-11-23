// Live data layer: Firebase Auth (Google) + Firestore.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection,
  runTransaction, serverTimestamp, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const toUser = (u) => u && { uid: u.uid, email: u.email, name: u.displayName, photo: u.photoURL || "" };

export function onAuth(cb) {
  return onAuthStateChanged(auth, (u) => cb(toUser(u)));
}

export async function signIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(auth, provider);
}

export const signOut = () => fbSignOut(auth);

export async function getMyName(uid) {
  const s = await getDoc(doc(db, "users", uid));
  return s.exists() ? s.data().name : null;
}

export function watchPeople(cb) {
  return onSnapshot(collection(db, "people"), (snap) => {
    const m = {};
    snap.forEach((d) => (m[d.id] = d.data()));
    cb(m);
  }, (e) => console.error(e));
}

export function watchEvent(cb) {
  return onSnapshot(doc(db, "config", "event"), (s) => cb(s.exists() ? s.data() : {}), () => cb({}));
}

// Claim a name. The transaction + security rules guarantee one name per account
// and one account per name, and require the correct group code.
export async function claim(user, name, code) {
  await runTransaction(db, async (tx) => {
    const pRef = doc(db, "people", name);
    const uRef = doc(db, "users", user.uid);
    const p = await tx.get(pRef);
    const u = await tx.get(uRef);
    if (p.exists()) throw new Error("taken");
    if (u.exists()) throw new Error("already");
    const person = { uid: user.uid, bought: false, claimedAt: serverTimestamp() };
    if (user.photo && user.photo.startsWith("https://") && user.photo.length < 900) person.photo = user.photo;
    tx.set(pRef, person);
    tx.set(uRef, { name, email: user.email, joinCode: code, createdAt: serverTimestamp() });
  });
}

export function watchAssignment(name, cb) {
  return onSnapshot(doc(db, "assignments", name),
    (s) => cb(s.exists() ? s.data().recipient : null),
    () => cb(null));
}

// A wishlist doc holds the item list plus the "About me" profile.
export function watchWishlist(name, cb) {
  return onSnapshot(doc(db, "wishlists", name),
    (s) => cb(s.exists() ? { items: s.data().items || [], profile: s.data().profile || {} } : { items: [], profile: {} }),
    () => cb({ items: [], profile: {} }));
}

export async function saveWishlist(name, items, profile = {}) {
  await setDoc(doc(db, "wishlists", name), { items, profile, updatedAt: serverTimestamp() });
}

// Your own private account doc (name + what you spent). Only you can read it.
export function watchMe(uid, cb) {
  return onSnapshot(doc(db, "users", uid), (s) => cb(s.exists() ? s.data() : null), () => cb(null));
}

export async function setSpent(uid, spent) {
  await updateDoc(doc(db, "users", uid), { spent });
}

export async function setBought(name, bought) {
  await updateDoc(doc(db, "people", name), { bought });
}

// ---- admin only (enforced by firestore.rules) ----
export async function saveEvent(data) {
  await setDoc(doc(db, "config", "event"), data, { merge: true });
}

export async function getJoinCode() {
  const s = await getDoc(doc(db, "private", "settings"));
  return s.exists() ? s.data().joinCode : "";
}

export async function setJoinCode(code) {
  await setDoc(doc(db, "private", "settings"), { joinCode: code }, { merge: true });
}

export async function releaseName(name) {
  const p = await getDoc(doc(db, "people", name));
  if (!p.exists()) return;
  const b = writeBatch(db);
  b.delete(doc(db, "people", name));
  b.delete(doc(db, "users", p.data().uid));
  await b.commit();
}
