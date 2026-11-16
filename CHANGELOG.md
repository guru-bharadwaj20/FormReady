# Changelog

All notable changes to FormReady are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-16

First public release.

### Added

- Portal spec registry with 25 forms across NTA, SSC, UPSC, IBPS, SBI, RRB,
  GATE, CBSE, NSP, PAN, Passport Seva, Indian e-Visa, US DS-160, IIM CAT,
  TNPSC, UPPSC and Indian Army, each with an official source and a
  verification date. JSON Schema and lint rules enforced in CI.
- Pure TypeScript image pipeline: decode, centre-weighted aspect crop, exact
  pixel resize, greyscale and signature threshold cleanup, JFIF DPI tag,
  metadata stripping, and a binary search over JPEG quality that lands the
  output inside the portal's byte window.
- PNG output via oxipng for portals that require it.
- PDF tools: compress to a chosen limit by re-rendering pages, merge images
  and PDFs, split into pages, extract page ranges, and image-to-PDF
  conversion when a portal wants a document as PDF.
- Advisory face framing check through the platform FaceDetector where
  available, and a background uniformity heuristic.
- Before and after compliance report listing every rule with pass, fail,
  warn or skip.
- Web Workers for all image and PDF work with transferable buffers, keeping
  the UI responsive on low-end phones.
- Eight languages: English, Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati
  and Kannada, with a CI check that every locale has every key.
- Installable progressive web app that works offline after the first visit,
  with an in-app update prompt.
- Accessible UI: keyboard navigation, skip link, live status regions,
  reduced motion and dark mode support.
- GitHub Actions for lint, type check, spec validation, unit tests,
  Playwright browser tests and GitHub Pages deployment.
- Issue templates for spec changes, portal requests and bugs; security
  policy; code of conduct; MIT license.
