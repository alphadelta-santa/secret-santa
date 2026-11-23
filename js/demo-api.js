// Preview mode: fake in-memory data so you can see the site before Firebase is set up.
const NAMES = await (await fetch("names.json")).json();
const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));

const pool = [
  { text: "Cozy fuzzy socks, size M", price: 12 },
  { text: "Anything matcha", price: 18 },
  { text: "Polaroid film", url: "https://www.target.com/", price: 22 },
  { text: "A good thriller novel", price: 16 },
  { text: "Hot sauce sampler", price: 24 },
  { text: "Lego botanical set", url: "https://www.lego.com/", price: 49 },
  { text: "Dark green hoodie, size L", price: 35 },
  { text: "Desk plant that's hard to kill" },
];
const INTERESTS = ["Gaming", "Coffee", "Snowboarding", "Music", "Cooking", "Anime", "Fitness", "Books", "Skincare", "Photography", "Sneakers", "Plants"];
const profileFor = (name) => {
  const k = name.charCodeAt(0) + name.length;
  return {
    interests: [0, 3, 7].map((j) => INTERESTS[(k + j) % INTERESTS.length]),
    colors: ["Forest green, black", "Pastel pink", "Navy and cream", "Anything red"][k % 4],
    treats: ["Sour gummies, matcha", "Dark chocolate", "Spicy chips", "Boba"][k % 4],
    stores: ["Uniqlo, Target", "Nike, Lululemon", "Trader Joe's", "Barnes & Noble"][k % 4],
    shirt: ["S", "M", "L"][k % 3], shoe: String(7 + (k % 6)),
    avoid: k % 2 ? "Nothing with peanuts please" : "",
    notes: k % 3 ? "Just moved into a new dorm, could use cozy stuff." : "",
  };
};

const db = {
  people: {
    Arun: { uid: "d1", bought: true }, Kavya: { uid: "d2", bought: false },
    Noam: { uid: "d3", bought: true }, Siya: { uid: "d4", bought: false },
    William: { uid: "d5", bought: true }, Diya: { uid: "d6", bought: false },
  },
  users: {},
  event: { date: "2026-12-11", location: "TBD", budget: 35, wishlistDeadline: "2026-12-01", notes: "Preview data. Plug in Firebase to go live.", drawDone: true },
  wishlists: {},
  assignments: {},
  joinCode: "jingle",
};
const L = { people: new Set(), event: new Set(), assign: {}, wish: {} };
const bucket = (o, k) => (o[k] ??= new Set());
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const emit = (set, v) => set?.forEach((cb) => cb(clone(v)));
function on(set, cb, get) {
  set.add(cb);
  queueMicrotask(() => cb(clone(get())));
  return () => set.delete(cb);
}
function seed(name) {
  if (!db.wishlists[name]) {
    const n = (name.length % 4) + 1;
    db.wishlists[name] = { items: Array.from({ length: n }, (_, i) => pool[(name.charCodeAt(0) + i * 3) % pool.length]), profile: profileFor(name) };
  }
  return db.wishlists[name];
}

let authCb = null, user = null;
export function onAuth(cb) { authCb = cb; queueMicrotask(() => cb(user)); return () => {}; }
export async function signIn() { await wait(400); user = { uid: "demo-you", email: "you@example.com", name: "You", photo: "" }; authCb?.(user); }
export async function signOut() { user = null; authCb?.(null); }
export async function getMyName(uid) { return db.users[uid]?.name ?? null; }
export const watchPeople = (cb) => on(L.people, cb, () => db.people);
export const watchEvent = (cb) => on(L.event, cb, () => db.event);

export async function claim(u, name, code) {
  await wait();
  if (db.people[name]) throw new Error("taken");
  if (code !== db.joinCode) throw Object.assign(new Error("permission"), { code: "permission-denied" });
  db.people[name] = { uid: u.uid, bought: false };
  db.users[u.uid] = { name, email: u.email };
  db.wishlists[name] = { items: [], profile: {} };
  const others = NAMES.filter((n) => n !== name);
  db.assignments[name] = { recipient: others[Math.floor(Math.random() * others.length)] };
  emit(L.people, db.people);
}

export const watchAssignment = (name, cb) => on(bucket(L.assign, name), cb, () => db.assignments[name]?.recipient ?? null);
export const watchWishlist = (name, cb) => on(bucket(L.wish, name), cb, () => seed(name));
export async function saveWishlist(name, items, profile = {}) { await wait(120); db.wishlists[name] = { items, profile }; emit(L.wish[name], db.wishlists[name]); }
const meL = {};
export const watchMe = (uid, cb) => on(bucket(meL, uid), cb, () => db.users[uid] ?? null);
export async function setSpent(uid, spent) { await wait(120); db.users[uid].spent = spent; emit(meL[uid], db.users[uid]); }
export async function setBought(name, v) { await wait(120); db.people[name].bought = v; emit(L.people, db.people); }
export async function saveEvent(d) { await wait(); Object.assign(db.event, d); emit(L.event, db.event); }
export async function getJoinCode() { return db.joinCode; }
export async function setJoinCode(c) { db.joinCode = c; }
export async function releaseName(name) {
  delete db.people[name];
  for (const k in db.users) if (db.users[k].name === name) delete db.users[k];
  emit(L.people, db.people);
}
