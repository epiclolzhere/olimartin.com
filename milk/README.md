# 46 Refreshment Rota

Live site: `https://<username>.github.io/<repo>/`

**The only file you edit is `rota.json`.** Every commit rebuilds the site and the calendar feeds (Actions tab, about a minute). If `rota.json` has a mistake, the build stops, the Actions log says what's wrong, and the live site stays as it was.

## Make a swap

Edit `rota.json` and add the date and the name of the person now doing it. A two-way swap is two lines:

```json
"swaps": {
  "2027-03-04": "Cox, RI",
  "2027-03-18": "Dart, LE"
}
```

The name must match `people` exactly, including the comma and initials. To undo a swap, delete its line. The last line inside `{ }` has no comma after it.

## Add a not-required week

Add it to `notRequired`. These weeks don't use a turn, so everyone after that date moves along one week.

## Calendar feeds

- Whole rota: `calendars/46-refreshment-rota.ics`
- Each person: `calendars/<surname>-<initials>.ics` (e.g. `gowen-sh.ics`), with a reminder at 9am the day before

## Files

| File | What it is |
|---|---|
| `rota.json` | The rota: people, start date, not-required weeks, swaps |
| `index.html` | The web page |
| `rota-core.js` | Rota and calendar logic shared by the page and the build |
| `build.js` | Checks `rota.json` and writes the calendar feeds |
| `.github/workflows/pages.yml` | Runs the build and publishes to GitHub Pages |
