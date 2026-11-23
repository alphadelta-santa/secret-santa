// Reminder emails. The workflow runs this every day; the script decides who gets what.
//
// Wishlist nudges (until the wishlist deadline, Dec 1 by default):
//   - go to anyone whose wishlist is empty (no items AND no interests)
//   - sent Mondays + Thursdays, then EVERY day in the last 3 days, plus a "last call" on deadline day
//   - also go to people who never joined, if you add their emails in the ROSTER_EMAILS secret
//   - after the deadline (and before the draw), late people still get nudged Mondays + Thursdays
// Gift nudges (after the draw): Mondays + Thursdays to people who haven't hit "I bought the gift".
//
// Running it by hand (Actions > Send reminders > Run workflow) sends right away, whatever the day.
import {
  initFirebase, emailHTML, getRecipients, sendAll, esc, fmtEvent, NAMES,
  deadlineOf, nyToday, nyWeekday, daysBetween, fmtDay,
} from "./lib.mjs";

const db = initFirebase();
const ev = (await db.doc("config/event").get()).data() || {};
const manual = process.env.GITHUB_EVENT_NAME === "workflow_dispatch";
const custom = (process.env.MESSAGE || "").trim().slice(0, 600);

const deadline = deadlineOf(ev);
const daysLeft = daysBetween(nyToday(), deadline);
const dow = nyWeekday();
const monThu = dow === 1 || dow === 4;

const wishlistDay = manual || (daysLeft >= 0 ? daysLeft <= 3 || monThu : monThu && !ev.drawDone);
const giftDay = manual || monThu;

// ---- who's done what
const people = Object.fromEntries((await db.collection("people").get()).docs.map((d) => [d.id, d.data()]));
const filled = Object.fromEntries((await db.collection("wishlists").get()).docs.map((d) => {
  const w = d.data();
  return [d.id, (w.items || []).length > 0 || (w.profile?.interests || []).length > 0];
}));

const joined = await getRecipients(db); // [{ name, email }]
let roster = {};
try { roster = JSON.parse(process.env.ROSTER_EMAILS || "{}"); } catch { console.log("ROSTER_EMAILS is not valid JSON, ignoring it."); }
const notJoined = NAMES.filter((n) => !people[n] && typeof roster[n] === "string" && roster[n].includes("@"))
  .map((n) => ({ name: n, email: roster[n], notJoined: true }));

// ---- build one email per person
const dueText = daysLeft > 1 ? `in ${daysLeft} days` : daysLeft === 1 ? "tomorrow" : daysLeft === 0 ? "today" : "already";
const dueLine = daysLeft >= 0
  ? `Wishlists are due <b>${esc(fmtDay(deadline))}</b> (${dueText}).`
  : `Wishlists were due <b>${esc(fmtDay(deadline))}</b>. You're late, but there's still time before your Santa shops!`;

const outbox = [];
for (const u of [...joined, ...notJoined]) {
  const p = [];
  let subject = "";
  const needsWishlist = u.notJoined || !filled[u.name];

  if (wishlistDay && needsWishlist && daysLeft >= -14 && !(ev.drawDone && daysLeft < 0)) {
    if (u.notJoined) {
      p.push("You haven't joined Secret Santa yet! Sign in with Google, claim your name, and fill out your wishlist.");
    } else {
      p.push("Your <b>wishlist is still empty</b>. Add a few things you'd love, or at least pick some interests, so your Santa isn't stuck guessing.");
    }
    p.push(dueLine);
    subject = daysLeft === 0 ? "Last call: your Secret Santa wishlist is due today"
      : daysLeft === 1 ? "Your Secret Santa wishlist is due tomorrow"
      : daysLeft < 0 ? "Your Secret Santa wishlist is overdue"
      : `Fill out your Secret Santa wishlist by ${fmtDay(deadline).split(", ")[1]}`;
  }

  if (ev.drawDone && giftDay && !u.notJoined && !people[u.name]?.bought) {
    p.push("Friendly elf reminder: you still need to grab a gift for your Secret Santa match!");
    p.push("Log in to see who you have, their interests and wishlist. When you've got it, hit <b>I bought the gift</b>.");
    subject ||= "Secret Santa reminder: time to shop";
  }

  if (custom && manual) { p.unshift(esc(custom)); subject ||= "A message from Secret Santa"; }
  if (!p.length) continue;
  outbox.push({ u, p, subject });
}

console.log(`Today: ${nyToday()} · deadline ${deadline} (${daysLeft} days) · wishlist day: ${wishlistDay} · gift day: ${giftDay}`);
console.log(`Emails to send: ${outbox.length} (not-joined people included: ${outbox.filter((o) => o.u.notJoined).length})`);
if (!outbox.length) process.exit(0);

const byEmail = new Map(outbox.map((o) => [o.u.email, o]));
await sendAll([...byEmail.values()].map((o) => ({ ...o.u, _o: o })), (u) => ({
  subject: u._o.subject,
  text: `Hey ${u.name}! ${u._o.p.map((t) => t.replace(/<[^>]+>/g, "")).join(" ")} Event: ${fmtEvent(ev)}. ${process.env.SITE_URL || ""}`,
  html: emailHTML({ heading: "Ho ho ho, reminder time!", name: u.name, ev, paragraphs: u._o.p, cta: u.notJoined ? "Join Secret Santa" : "Open Secret Santa" }),
}));
