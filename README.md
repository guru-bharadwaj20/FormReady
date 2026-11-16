# FormReady

**Make your photo, signature and documents pass exam and government portal uploads on the first try.**

[![CI](https://github.com/guru-bharadwaj20/FormReady/actions/workflows/ci.yml/badge.svg)](https://github.com/guru-bharadwaj20/FormReady/actions/workflows/ci.yml)
[![Deploy](https://github.com/guru-bharadwaj20/FormReady/actions/workflows/deploy.yml/badge.svg)](https://github.com/guru-bharadwaj20/FormReady/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Specs](https://img.shields.io/badge/portal%20specs-25-c2410c.svg)](specs/)
[![Languages](https://img.shields.io/badge/languages-8-c2410c.svg)](src/lib/i18n/locales/)

Live app: **https://guru-bharadwaj20.github.io/FormReady/**

Every exam and government portal in India wants the same few things in slightly
different shapes: a photograph between 10 KB and 200 KB at 276×354 pixels, a
signature under 30 KB, a certificate as a PDF under 300 KB. Applicants lose
hours and sometimes deadlines to "file size exceeds limit" errors and
third-party resizer sites that upload their ID documents to unknown servers.

FormReady fixes the file in the browser. Nothing leaves the device.

## What it does

- **Pick a portal, drop a file, press Fix.** The app knows the exact rules for
  25 forms across NTA, SSC, UPSC, IBPS, SBI, RRB, GATE, CBSE, NSP, PAN,
  Passport Seva, Indian e-Visa, US DS-160 and more.
- **Exact size targeting.** A binary search over JPEG quality lands the output
  inside the portal's byte window, not just under the maximum.
- **Correct pixels, aspect and DPI.** Centre-weighted crop to the required
  aspect ratio, resize to the exact pixel box, and a real JFIF DPI tag that
  portals actually read.
- **Signatures and greyscale.** Automatic threshold cleanup for signature
  scans, and forced greyscale where a portal demands black and white.
- **Face framing check.** Where the browser supports it, an advisory check
  that the face occupies the fraction of the frame the portal expects.
- **PDF tools.** Compress to a chosen limit, merge images and PDFs, split or
  extract page ranges.
- **Before and after report.** Every rule is listed with a pass, fail, warn or
  skip so you can see what changed and why.
- **Eight languages.** English, Hindi, Bengali, Telugu, Marathi, Tamil,
  Gujarati and Kannada.
- **Works offline.** Installable progressive web app. After the first visit
  it runs with no network at all.

## Privacy

There is no server. The site is static HTML, CSS, JavaScript and WebAssembly
served from GitHub Pages. Files are decoded, measured and re-encoded inside
Web Workers on your device and the result is downloaded straight back to you.

- No uploads, ever.
- No analytics, cookies, fingerprinting or third-party scripts.
- The only outbound links are to the official portal pages and this
  repository.
- Output files have their metadata stripped, so your camera model, location
  and timestamps do not travel with your photo.

See [docs/adr/0001-static-site-no-backend.md](docs/adr/0001-static-site-no-backend.md)
and [docs/adr/0007-no-analytics.md](docs/adr/0007-no-analytics.md) for the
reasoning.

## How it works

```
Browser tab
└── Svelte UI (main thread)
    ├── spec registry      bundled JSON, searched by portal name or alias
    ├── validator          pure functions: file facts + rules in, report out
    ├── image worker       decode, crop, resize, DPI tag, exact-KB JPEG search
    ├── face check         platform FaceDetector on the main thread (advisory)
    ├── pdf worker         pdf.js render -> image pipeline -> pdf-lib assemble
    └── service worker     precaches the whole app for offline use
```

1. You pick the portal and the asset you are uploading. The matching spec is
   looked up from the registry bundled into the app.
2. You drop a file. It is transferred to a worker, decoded, downscaled if it
   is enormous, and measured. The validator produces the "before" report.
3. You press Fix. The worker crops, resizes, converts colour mode if needed,
   encodes with a quality search until the bytes land in the window, writes
   the DPI tag and strips metadata. PDFs are re-rendered page by page at
   decreasing DPI until they fit.
4. The "after" report is produced from the output. You download it with a
   filename shaped the way most portals expect.

The full design is in [docs/03-architecture.md](docs/03-architecture.md).

## Portal specs

Rules live as JSON under [specs/](specs/), one folder per portal, validated
against [specs/schema.json](specs/schema.json) in CI. Each spec records the
official source URL and the date it was last verified, and the app links to
both so you can check for yourself.

Portals change their rules without notice. If you find a spec that is wrong
or out of date, open a
[spec change issue](https://github.com/guru-bharadwaj20/FormReady/issues/new?template=spec_change.yml)
or a pull request. To ask for a portal that is missing, use the
[portal request template](https://github.com/guru-bharadwaj20/FormReady/issues/new?template=portal_request.yml).

[CONTRIBUTING.md](CONTRIBUTING.md) explains the spec format.

## Development

Requires Node 20 or newer.

```sh
npm ci
npm run dev          # Vite dev server
npm run build        # production build into dist/
npm run preview      # serve the production build
```

Quality gates, all of which run in CI:

```sh
npm run lint           # ESLint
npm run check          # svelte-check (TypeScript strict)
npm run format:check   # Prettier
npm run specs:validate # every spec against the JSON schema and lint rules
npm run i18n:check     # every locale has every key
npm test               # Vitest unit tests
npm run test:e2e       # Playwright browser tests against the built app
```

### Stack

| Layer   | Choice                                   |
| ------- | ---------------------------------------- |
| UI      | Svelte 5, TypeScript, Vite               |
| Image   | pure TypeScript pixel pipeline, jSquash  |
|         | (mozjpeg and oxipng WebAssembly codecs)  |
| PDF     | pdf.js for rendering, pdf-lib for output |
| Offline | vite-plugin-pwa, Workbox precache        |
| Tests   | Vitest, Playwright                       |
| Hosting | GitHub Pages                             |

Why these and not others is recorded in [docs/adr/](docs/adr/).

### Browser support

Current Chrome, Edge, Firefox and Safari on desktop and Android or iOS. The
face framing check needs the platform FaceDetector API, which today means
Chromium on Android and some desktop builds. Everywhere else the check is
skipped and reported as such.

## Project documents

- [Problem statement](docs/01-problem-statement.md)
- [Requirements](docs/02-requirements.md)
- [Architecture](docs/03-architecture.md)
- [Architecture decision records](docs/adr/)
- [Changelog](CHANGELOG.md)
- [Security policy](SECURITY.md)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

[MIT](LICENSE). Portal rules are facts about public forms and carry no
license of their own; the official notifications they are taken from remain
the property of their publishers.
