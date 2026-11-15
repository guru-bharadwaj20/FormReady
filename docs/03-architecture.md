# 3. System design and architecture

## Shape

FormReady is a static single-page application. There is no server, no
database and no login. Every byte of processing happens on the visitor's
device, which is what makes the privacy promise and the Rs 0 hosting bill
both true at any scale.

```
Browser tab
└── Svelte UI (main thread)
    ├── spec registry      bundled JSON, searched by portal name/alias
    ├── validator          pure functions: facts + rules in, checks out
    ├── image worker       Web Worker: decode, resize, crop, DPI tag,
    │                      exact-KB search with mozjpeg (WASM)
    ├── face check         FaceDetector API on main thread (advisory)
    ├── pdf worker         Web Worker: pdf.js render -> image pipeline ->
    │                      pdf-lib assemble
    └── service worker     precaches the whole app for offline use
```

Output is downloaded to the device. Nothing is uploaded, ever.

## Module map

| Path                      | Responsibility                                     | Runs in       |
| ------------------------- | -------------------------------------------------- | ------------- |
| `specs/**/*.json`         | Portal specification registry (data, not code)     | build time    |
| `specs/schema.json`       | JSON Schema every spec must satisfy                | CI            |
| `src/lib/specs/`          | Typed loader, search index, spec helpers           | main thread   |
| `src/lib/validate/`       | Pure validation rules and report model             | main + worker |
| `src/lib/image/`          | Pure pixel ops on `RawImage`, JFIF writer, KB search | worker      |
| `src/lib/codec/`          | Encoder/decoder adapters (mozjpeg WASM, canvas)    | worker        |
| `src/lib/face/`           | Face framing and background heuristics             | main thread   |
| `src/lib/pdf/`            | Compress, merge, split                             | worker        |
| `src/workers/`            | Worker entry points and typed message protocol     | worker        |
| `src/lib/i18n/`           | String tables and locale selection                 | main thread   |
| `src/ui/`                 | Svelte components                                  | main thread   |

## Data flow for the photo path

1. The applicant picks a portal. The spec for that form is looked up from the
   bundled registry.
2. The applicant drops a file. The main thread reads it into an
   `ArrayBuffer`, transfers it to the image worker.
3. The worker decodes the image, downscales to at most 4000 px on the long
   edge (NFR-3), and reports `FileFacts` (format, bytes, width, height, DPI,
   colour mode) back. The validator produces the "before" report.
4. The applicant clicks Fix. The worker runs the pipeline:
   `crop/resize -> colour mode -> encode with KB search -> write DPI tag ->
   strip metadata`.
5. The worker returns the output bytes plus the new `FileFacts`. The
   validator produces the "after" report; face/background checks run on the
   main thread if the spec asks for them.
6. The applicant downloads the file with a portal-specific filename.

## Key design decisions

Each decision has a full Architecture Decision Record under `docs/adr/`.

- ADR-0001 Static site, no backend.
- ADR-0002 Svelte 5 + Vite + TypeScript.
- ADR-0003 Pure-TypeScript pixel pipeline with WASM encoders, so the same
  code runs in the browser worker and in Node tests.
- ADR-0004 Exact-KB targeting algorithm.
- ADR-0005 Spec registry as JSON with a schema and CI validation.
- ADR-0006 Face checks are advisory and use the platform `FaceDetector`.
- ADR-0007 No analytics or third-party network calls.

## Error handling

Every worker message has a request id; failures are returned as typed
errors with a user-facing message key. The UI never shows a stack trace.
Unsupported inputs (HEIC on Firefox, corrupted files) produce a single clear
line and a suggestion.

## Testing strategy

- Unit tests (Vitest, Node) for validator, spec loader, pixel ops, JFIF
  writer and the KB search. The encoder is the same mozjpeg WASM module in
  Node and in the browser, so byte-range assertions are meaningful.
- Spec registry tests validate every JSON file against the schema and check
  cross-field sanity (min < max, DPI present when cm given).
- End-to-end test (Playwright) drives the real UI: pick portal, drop a
  fixture photo, fix, assert the download is within range.
- CI runs lint, type-check, unit tests, spec validation and build on every
  push; Pages deploy only from `main`.

## Deployment

GitHub Actions builds `dist/` and deploys to GitHub Pages. The site is a
set of hashed static assets plus `sw.js`; a new deploy is picked up by the
service worker and offered as "update available".
