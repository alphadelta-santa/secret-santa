// Firebase web config for the live site. These values are meant to be public:
// security comes from firestore.rules, not from hiding this.

export const firebaseConfig = {
  apiKey: "AIzaSyB2EMdwvOcbuX9YYxoQGLSSeUeOTebeO-4",
  authDomain: "alphadelta-secret-santa.firebaseapp.com",
  projectId: "alphadelta-secret-santa",
  storageBucket: "alphadelta-secret-santa.firebasestorage.app",
  messagingSenderId: "290887329772",
  appId: "1:290887329772:web:efd682828105c81f9d42c9",
};

export const ADMIN_EMAILS = ["rlewisbangerter@gmail.com"];

// Used until the organizer changes them in the Admin tab.
export const DEFAULTS = {
  date: "2026-12-11",             // event day (YYYY-MM-DD, or YYYY-MM-DDTHH:MM for a time)
  budget: 35,                     // dollars per gift
  wishlistDeadline: "2026-12-01", // YYYY-MM-DD
};
