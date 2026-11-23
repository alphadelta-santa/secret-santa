// Sends one sample email to a single address, so you can check the email setup works.
import { initFirebase, emailHTML, sendAll } from "./lib.mjs";

const to = (process.env.TEST_TO || "").trim();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
  console.error("Enter a valid email address to send the test to.");
  process.exit(1);
}
const db = initFirebase();
const ev = (await db.doc("config/event").get()).data() || {};
await sendAll([{ email: to, name: "Santa's helper" }], (u) => ({
  subject: "Test email from Secret Santa",
  html: emailHTML({
    heading: "Test email",
    name: u.name,
    ev,
    paragraphs: ["If you're reading this, the Secret Santa emails are working. Reminders and the draw emails will look like this."],
    cta: "Open Secret Santa",
  }),
}));
