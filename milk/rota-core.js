/* Shared by the web page (index.html) and the calendar build (build.js).
   You shouldn't need to edit this file: change rota.json instead. */
(function (root) {
  "use strict";
  const DAY = 86400000;
  const parse = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  /* One entry per Thursday: { t, k, p, due, swapped, note }
     p = index of the person doing it (null = not required)
     due = index of the person the rotation gave it to */
  function buildRota(cfg) {
    const out = [];
    const start = parse(cfg.start);
    let turn = 0;
    for (let i = 0; i < cfg.weeks; i++) {
      const t = start + i * 7 * DAY, k = iso(t);
      const off = cfg.notRequired && cfg.notRequired[k];
      if (off) { out.push({ t, k, p: null, due: null, swapped: false, note: off }); continue; }
      const due = turn % cfg.people.length;
      turn++;
      let p = due;
      const sw = cfg.swaps && cfg.swaps[k];
      if (sw) { const j = cfg.people.indexOf(sw); if (j >= 0) p = j; }
      out.push({ t, k, p, due, swapped: p !== due });
    }
    return out;
  }

  /* Returns a list of problems with rota.json (empty if it's fine). */
  function validate(cfg) {
    const e = [];
    if (!cfg || typeof cfg !== "object") return ["rota.json is empty or not an object"];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cfg.start || "")) e.push('"start" must be a date written like 2026-12-03');
    else if (new Date(parse(cfg.start)).getUTCDay() !== 4) e.push(`"start" (${cfg.start}) isn't a Thursday`);
    if (!Number.isInteger(cfg.weeks) || cfg.weeks < 1) e.push('"weeks" must be a whole number above 0');
    if (!Array.isArray(cfg.people) || cfg.people.length === 0) e.push('"people" must list at least one name');
    if (e.length) return e;

    const dates = new Set();
    for (let i = 0; i < cfg.weeks; i++) dates.add(iso(parse(cfg.start) + i * 7 * DAY));
    for (const k of Object.keys(cfg.notRequired || {})) {
      if (!dates.has(k)) e.push(`notRequired: ${k} isn't a Thursday on this rota`);
    }
    for (const [k, name] of Object.entries(cfg.swaps || {})) {
      if (!dates.has(k)) e.push(`swaps: ${k} isn't a Thursday on this rota`);
      else if (cfg.notRequired && cfg.notRequired[k]) e.push(`swaps: ${k} is a not-required week`);
      if (!cfg.people.includes(name)) e.push(`swaps: "${name}" on ${k} doesn't match a name in "people" (check spelling, comma and initials)`);
    }
    return e;
  }

  /* ---------- Calendar (.ics) files ---------- */
  const esc = s => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const enc = new TextEncoder();
  function fold(line) {
    if (enc.encode(line).length <= 75) return line;
    const parts = []; let cur = "", len = 0;
    for (const ch of line) {
      const n = enc.encode(ch).length;
      if (len + n > 75) { parts.push(cur); cur = " "; len = 1; }
      cur += ch; len += n;
    }
    parts.push(cur);
    return parts.join("\r\n");
  }

  const feedFile = (cfg, person) => person == null ? slug(cfg.title) + ".ics" : slug(cfg.people[person]) + ".ics";

  /* person: index for a personal calendar (with reminders), or null for the whole rota */
  function makeIcs(cfg, rota, person, stamp) {
    const whole = person == null;
    const uidBase = slug(cfg.title);
    const eventTitle = cfg.eventTitle || cfg.title;
    const calName = whole ? cfg.title : `${eventTitle} \u2013 ${cfg.people[person]}`;
    const L = [
      "BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${cfg.title}//EN`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "X-WR-CALNAME:" + esc(calName),
      "X-WR-CALDESC:" + esc(whole ? "Every Thursday" : "Your Thursdays on the rota"),
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
      "X-PUBLISHED-TTL:PT1H"
    ];
    const entries = whole ? rota : rota.filter(r => r.p === person);
    for (const r of entries) {
      const s = r.k.replace(/-/g, ""), en = iso(r.t + DAY).replace(/-/g, "");
      const who = r.p === null ? `Not required (${r.note})` : cfg.people[r.p];
      L.push("BEGIN:VEVENT",
        `UID:${s}${whole ? "" : "-" + slug(cfg.people[person])}@${uidBase}`,
        "DTSTAMP:" + stamp,
        "DTSTART;VALUE=DATE:" + s,
        "DTEND;VALUE=DATE:" + en,
        "SUMMARY:" + esc(`${eventTitle} \u2013 ${who}`),
        "TRANSP:TRANSPARENT");
      if (r.swapped) L.push("DESCRIPTION:" + esc(`Swap: ${cfg.people[r.p]} in for ${cfg.people[r.due]}`));
      if (!whole) L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc(`${eventTitle} tomorrow`), "TRIGGER:-PT15H", "END:VALARM");
      L.push("END:VEVENT");
    }
    L.push("END:VCALENDAR");
    return L.map(fold).join("\r\n") + "\r\n";
  }

  const api = { DAY, parse, iso, slug, buildRota, validate, makeIcs, feedFile };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RotaCore = api;
})(this);
