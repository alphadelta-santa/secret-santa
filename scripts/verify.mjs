// Checks the draw without showing who has who. Prints only pass/fail counts.
import { initFirebase, NAMES } from "./lib.mjs";

const db = initFirebase();
const snap = await db.collection("assignments").get();
const map = {};
snap.forEach((d) => { map[d.id] = d.data().recipient; });
const givers = Object.keys(map);
const recips = Object.values(map);

const missingGivers = NAMES.filter((n) => !(n in map)).length;
const extraGivers = givers.filter((g) => !NAMES.includes(g)).length;
const selfPicks = givers.filter((g) => map[g] === g).length;
const unknownRecips = recips.filter((r) => !NAMES.includes(r)).length;
const dupes = recips.length - new Set(recips).size;
const neverPicked = NAMES.filter((n) => !recips.includes(n)).length;
// follow the chain from one person: a single loop through everyone means no small closed groups
let loop = 0, cur = NAMES[0];
const seen = new Set();
while (cur && !seen.has(cur)) { seen.add(cur); cur = map[cur]; loop++; }

const checks = [
  ["People in the draw", `${givers.length} of ${NAMES.length}`, givers.length === NAMES.length && !missingGivers && !extraGivers],
  ["Anyone who got themselves", selfPicks, selfPicks === 0],
  ["People picked by more than one Santa", dupes, dupes === 0],
  ["People nobody picked", neverPicked, neverPicked === 0],
  ["Unknown names", unknownRecips, unknownRecips === 0],
  ["One big gift loop through everyone", loop === NAMES.length ? "yes" : `no (loop of ${loop})`, loop === NAMES.length],
];
for (const [label, val, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${label}: ${val}`);
const allOk = checks.every((c) => c[2]);
console.log(allOk ? "\nThe draw is good: everyone gives to one different person and gets from one different person." : "\nSomething is off. Re-run the draw with Start over checked.");
if (!allOk) process.exit(1);
