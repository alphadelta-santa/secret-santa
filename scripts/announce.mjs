// One-off announcement email about the event, sent to a list of addresses (one email each).
import { initFirebase, emailHTML, sendAll } from "./lib.mjs";

const list = (process.env.TO || "").split(/[\s,;]+/).map((s) => s.trim()).filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
if (!list.length) { console.error("No valid email addresses given."); process.exit(1); }
const db = initFirebase();
const ev = (await db.doc("config/event").get()).data() || {};
const site = process.env.SITE_URL || "https://alphadelta-santa.github.io/secret-santa/";
await sendAll(list.map((email) => ({ email, name: "everyone" })), (u) => ({
  subject: "Secret Santa & Sips on Friday, Dec 11",
  html: emailHTML({
    heading: "Secret Santa & Sips",
    name: u.name,
    ev,
    paragraphs: [
      "Secret Santa is happening! We're starting around 6 or 7 PM on Friday, Dec 11. The exact time and place are still TBD, more details to come.",
      "<b>What to do now:</b><br>1. Open the Secret Santa site (button below)<br>2. Sign in with Google and claim your name. The code is <b>alphadelta</b><br>3. Fill out your wishlist and interests so your Santa isn't guessing<br>4. Names are already drawn, so open the present on the home page to see who you're buying for. Keep it secret!",
    ],
    cta: "Open Secret Santa",
  }),
  text: `Hey everyone!\n\nSecret Santa is happening! We're starting around 6 or 7 PM on Friday, Dec 11. The exact time and place are still TBD, more details to come.\n\nBudget: $35 max\nWishlists due: Friday, Nov 27\n\nWhat to do now:\n1. Go to ${site}\n2. Sign in with Google and claim your name. The code is alphadelta\n3. Fill out your wishlist and interests so your Santa isn't guessing\n4. Names are already drawn, so open the present on the home page to see who you're buying for. Keep it secret!\n\nThe Secret Santa elves`,
}));
