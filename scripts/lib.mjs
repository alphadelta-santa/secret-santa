// Shared helpers for the GitHub Actions scripts.
// IMPORTANT: Actions logs are public on public repos. Never log emails or pairs.
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { readFileSync } from "node:fs";

export const NAMES = JSON.parse(readFileSync(new URL("../names.json", import.meta.url), "utf8"));
export const SITE_URL = process.env.SITE_URL || "";
export const TZ = process.env.TIMEZONE || "America/New_York";
export const FieldValue = admin.firestore.FieldValue;

export function initFirebase() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT secret.");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  return admin.firestore();
}

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const DEFAULT_BUDGET = Number(process.env.DEFAULT_BUDGET || 35);
export const DEFAULT_DEADLINE = process.env.WISHLIST_DEADLINE || "2026-11-27";
export const deadlineOf = (ev) => ev?.wishlistDeadline || DEFAULT_DEADLINE;

// Calendar math in New York time
export function nyToday() { return new Date().toLocaleDateString("en-CA", { timeZone: TZ }); }
export function nyWeekday() { return new Date(new Date().toLocaleString("en-US", { timeZone: TZ })).getDay(); }
export function daysBetween(a, b) {
  const [y1, m1, d1] = a.split("-").map(Number), [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
}
export function fmtDay(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
}

export function fmtBudget(ev) {
  const b = ev?.budget ?? DEFAULT_BUDGET;
  if (typeof b === "number" && b > 0) return `$${b} max per gift`;
  return b ? String(b) : "TBD";
}

export const DEFAULT_DATE = process.env.EVENT_DATE || "2026-12-11";
export function fmtEvent(ev) {
  const raw = ev?.date || DEFAULT_DATE;
  if (!raw) return "TBD";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${fmtDay(raw)} (time TBD)`;
  const d = new Date(raw);
  if (isNaN(d)) return "TBD";
  return d.toLocaleString("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// paragraphs must already be escaped (they may contain <b> tags)
export function emailHTML({ heading, name, paragraphs, ev, cta = "Open Secret Santa" }) {
  const p = paragraphs.map((t) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#1d2340">${t}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#0b1026;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fffaf3;border-radius:18px;overflow:hidden">
<tr><td style="background-color:#c1121f;background:linear-gradient(135deg,#ff3b5c,#c1121f);padding:28px 24px;text-align:center;color:#fff">
<div style="font-size:13px;letter-spacing:6px;color:#ffd166">&#9733; &#9733; &#9733;</div>
<h1 style="margin:12px 0 0;font-size:26px;font-family:Georgia,serif">${esc(heading)}</h1></td></tr>
<tr><td style="padding:26px 24px 10px">
<p style="margin:0 0 14px;font-size:18px;color:#1d2340"><b>Hey ${esc(name)}!</b></p>${p}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef6ff;border-radius:12px"><tr><td style="padding:14px 16px;font-size:15px;line-height:1.7;color:#1d2340">
<b>When:</b> ${esc(fmtEvent(ev))}<br><b>Where:</b> ${esc(ev?.location || "TBD")}<br><b>Budget:</b> ${esc(fmtBudget(ev))}<br><b>Wishlists due:</b> ${esc(fmtDay(deadlineOf(ev)))}
</td></tr></table>
${SITE_URL ? `<p style="text-align:center;margin:26px 0 10px"><a href="${esc(SITE_URL)}" style="background:#1f9d55;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold;display:inline-block">${esc(cta)} →</a></p>` : ""}
</td></tr>
<tr><td style="padding:14px;text-align:center;font-size:12px;color:#8a8fa8;background:#f4efe6">Sent by the Secret Santa elves. Your match is only shown when you log in.</td></tr>
</table></td></tr></table></body></html>`;
}

export async function getRecipients(db) {
  const snap = await db.collection("users").get();
  return snap.docs.map((d) => d.data()).filter((u) => u.email && NAMES.includes(u.name));
}

export async function sendAll(list, build) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log("Email secrets not set. Skipping emails.");
    return;
  }
  const t = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
  let ok = 0, fail = 0;
  for (const u of list) {
    try {
      const m = build(u);
      await t.sendMail({ from: `"Secret Santa" <${process.env.GMAIL_USER}>`, to: u.email, ...m });
      ok++;
    } catch (e) {
      fail++;
      console.error("One email failed:", e.code || e.message);
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  console.log(`Emails sent: ${ok}. Failed: ${fail}.`);
}
