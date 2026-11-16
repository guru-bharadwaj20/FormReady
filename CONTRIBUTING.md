# Contributing to FormReady

Thank you for helping applicants get their uploads accepted. The most
valuable contribution by far is a correct, sourced portal spec. Code
contributions are welcome too.

By participating you agree to the [code of conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Report a wrong or outdated rule.** Use the
  [spec change template](https://github.com/guru-bharadwaj20/FormReady/issues/new?template=spec_change.yml).
  Link the official notification or the portal page that states the rule.
- **Ask for a new portal.** Use the
  [portal request template](https://github.com/guru-bharadwaj20/FormReady/issues/new?template=portal_request.yml).
- **Report a bug** with the
  [bug template](https://github.com/guru-bharadwaj20/FormReady/issues/new?template=bug_report.yml).
  Include the browser, the portal and asset you selected, and the before
  report if you can.
- **Translate.** Locale files are under `src/lib/i18n/locales/`. Copy
  `en.json`, translate the values, keep the keys, and add the locale to
  `src/lib/i18n/locales.ts`.
- **Report a security problem** privately through
  [GitHub security advisories](https://github.com/guru-bharadwaj20/FormReady/security/advisories/new).
  See [SECURITY.md](SECURITY.md).

## Adding or changing a portal spec

Specs live under `specs/<portal>/<form>.json`. One file per form or
application season. The schema is `specs/schema.json` and every spec must
satisfy it plus the cross-field rules in `src/lib/specs/lint.ts`.

1. Find the official notification or the upload instructions on the portal.
   Only official sources count. Coaching sites and blogs are not sources.
2. Copy the closest existing spec and edit it. Minimal example:

   ```json
   {
     "$schema": "../schema.json",
     "id": "nta/cuet-ug-2026",
     "portal": "NTA",
     "portalFullName": "National Testing Agency",
     "form": "CUET UG 2026",
     "country": "IN",
     "category": "exam",
     "aliases": ["cuet", "cuet ug"],
     "sourceUrl": "https://cuet.nta.nic.in/",
     "lastVerified": "2026-11-15",
     "assets": [
       {
         "id": "photo",
         "kind": "photo",
         "label": "Photograph",
         "formats": ["jpeg"],
         "size": { "minBytes": 10240, "maxBytes": 204800 },
         "pixels": { "width": 276, "height": 354, "tolerance": 0.05 },
         "physical": { "widthMm": 35, "heightMm": 45, "dpi": 200 },
         "dpi": 200,
         "colour": "colour",
         "face": { "minHeightFraction": 0.5, "maxHeightFraction": 0.85 },
         "background": { "kind": "white" }
       }
     ]
   }
   ```

3. Follow these conventions.
   - `id` is `<portal-folder>/<file-name>` in lowercase kebab case.
   - `aliases` are the words people actually type: abbreviations, old names,
     common misspellings.
   - Give sizes in bytes. When a portal says "10 KB to 200 KB" it means
     10 × 1024 and 200 × 1024.
   - Give `pixels` when the portal states them. Give `physical` when it
     states millimetres and DPI. If both are given the linter checks they
     agree.
   - `formats` lists what the portal accepts, not what we produce. Use
     `jpeg`, `png` or `pdf`.
   - Set `lastVerified` to the day you checked the source. Do not guess.
   - Put anything the applicant must know but the app cannot enforce in
     `notes`, for example "photo must be taken after 1 January 2026".
4. Run the checks:

   ```sh
   npm run specs:validate
   npm test
   ```

5. Open a pull request. In the description, quote the exact rule text from
   the source and link to it. A reviewer will verify it against the source
   before merging.

## Code contributions

```sh
npm ci
npm run dev
```

Before you push:

```sh
npm run lint
npm run check
npm run format
npm test
npm run test:e2e   # needs: npx playwright install chromium
```

Guidelines:

- **No network calls.** The app must keep working with the network cable
  pulled. No analytics, no fonts from a CDN, no telemetry, no third-party
  scripts. Pull requests that add any of these will be declined.
- **Pure functions in `src/lib/`.** Image, PDF and validation code is plain
  TypeScript with no DOM access, so it runs in workers and in Node tests.
  Keep it that way.
- **Workers own the heavy lifting.** Anything that takes more than a few
  milliseconds belongs in `src/workers/`, not on the main thread.
- **Every user-visible string goes through i18n.** Add the key to
  `src/lib/i18n/locales/en.json`; `npm run i18n:check` will tell you which
  other locales need it.
- **Tests go with the change.** Unit tests under `tests/unit/`, browser flows
  under `tests/e2e/`.
- **Commits** follow Conventional Commits: `feat(scope): ...`,
  `fix(scope): ...`, `spec(portal): ...`, `docs: ...`, `test: ...`,
  `ci: ...`, `chore: ...`.

Larger design changes should be discussed in an issue first and, if agreed,
recorded as an Architecture Decision Record under `docs/adr/`.

## Release process

Maintainers release from `main`.

1. Update `CHANGELOG.md`.
2. Bump `version` in `package.json`.
3. Tag `vX.Y.Z` and push the tag.
4. Create a GitHub release from the tag. The deploy workflow publishes
   `main` to GitHub Pages on every push, so the tag is for provenance.
