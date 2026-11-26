// Checks rota.json, then builds the site into _site/ with a calendar feed
// for the whole rota and one per person. Run by GitHub Actions on every push.
const fs = require("fs");
const path = require("path");
const core = require("./rota-core.js");

let cfg;
try {
  cfg = JSON.parse(fs.readFileSync("rota.json", "utf8"));
} catch (err) {
  console.error("rota.json isn't valid JSON, so nothing was published.");
  console.error("Usually a missing or extra comma, or a missing quote mark.");
  console.error(err.message);
  process.exit(1);
}

const problems = core.validate(cfg);
if (problems.length) {
  console.error("rota.json has problems, so nothing was published:");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

const rota = core.buildRota(cfg);
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const out = "_site";

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "calendars"), { recursive: true });
for (const f of ["index.html", "rota.json", "rota-core.js"]) fs.copyFileSync(f, path.join(out, f));

const write = (person) => {
  const file = core.feedFile(cfg, person);
  fs.writeFileSync(path.join(out, "calendars", file), core.makeIcs(cfg, rota, person, stamp));
  return file;
};

console.log("Built calendars:");
console.log("  " + write(null));
cfg.people.forEach((name, i) => {
  const n = rota.filter(r => r.p === i).length;
  console.log(`  ${write(i)}  (${name}: ${n} turns)`);
});
const swaps = rota.filter(r => r.swapped);
if (swaps.length) {
  console.log("Swaps applied:");
  for (const r of swaps) console.log(`  ${r.k}: ${cfg.people[r.p]} in for ${cfg.people[r.due]}`);
}
