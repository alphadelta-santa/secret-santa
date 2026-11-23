// 1) Paste your Firebase web config here (Firebase console > Project settings > Your apps).
//    These values are meant to be public. Security comes from firestore.rules, not from hiding this.
// 2) Put the organizer's Google email in ADMIN_EMAILS (and in firestore.rules).
//
// While apiKey still says PASTE, the site runs in PREVIEW MODE with fake data.

export const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  appId: "PASTE_YOUR_APP_ID",
};

export const ADMIN_EMAILS = ["your.email@gmail.com"];

// Used until the organizer changes them in the Admin tab.
export const DEFAULTS = {
  date: "2026-12-11",             // event day (YYYY-MM-DD, or YYYY-MM-DDTHH:MM for a time)
  budget: 35,                     // dollars per gift
  wishlistDeadline: "2026-12-01", // YYYY-MM-DD
};
