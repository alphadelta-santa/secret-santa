// Randomly assigns Secret Santas on the server so nobody (not even the organizer) sees the pairs.
// Uses crypto-grade randomness and a single loop (A->B->C->...->A): nobody gets themselves,
// and no two people get each other.
import { randomInt } from "node:crypto";
import { initFirebase, NAMES, FieldValue, emailHTML, getRecipients, sendAll, esc } from "./lib.mjs";

if (process.env.CONFIRM !== "DRAW") {
  console.error('Not confirmed. Type DRAW in the "confirm" box when running the workflow.');
  process.exit(1);
}

const db = initFirebase();
const evRef = db.doc("config/event");
const ev = (await evRef.get()).data() || {};
const redraw = process.env.REDRAW === "true";

if (ev.drawDone && !redraw) {
  console.error("Names were already drawn. Run again with 'redraw' checked to start over.");
  process.exit(1);
}

const order = [...NAMES];
for (let i = order.length - 1; i > 0; i--) {
  const j = randomInt(i + 1);
  [order[i], order[j]] = [order[j], order[i]];
}

const batch = db.batch();
order.forEach((giver, i) => {
  batch.set(db.doc(`assignments/${giver}`), { recipient: order[(i + 1) % order.length], createdAt: FieldValue.serverTimestamp() });
});
if (redraw) {
  const people = await db.collection("people").get();
  people.forEach((d) => batch.update(d.ref, { bought: false }));
}
batch.set(evRef, { drawDone: true, drawnAt: FieldValue.serverTimestamp() }, { merge: true });
await batch.commit();
console.log(`Drew names for ${order.length} people. Pairs are stored privately and never printed.`);

if (process.env.SEND_EMAIL !== "false") {
  const list = await getRecipients(db);
  const fresh = (await evRef.get()).data();
  await sendAll(list, (u) => ({
    subject: "Names have been drawn!",
    text: `Hey ${u.name}! Secret Santa names are drawn. Log in to unwrap who you're shopping for. ${process.env.SITE_URL || ""}`,
    html: emailHTML({
      heading: "The elves have spoken!",
      name: u.name,
      ev: fresh,
      cta: "Unwrap my match",
      paragraphs: [
        "Secret Santa names have officially been drawn.",
        "Log in to <b>unwrap who you're shopping for</b> and check out their wishlist. Then make sure your own wishlist is filled in so your Santa isn't guessing.",
        esc("Remember: it's a secret."),
      ],
    }),
  }));
}
