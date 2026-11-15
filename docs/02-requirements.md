# 2. Requirements

Requirement IDs are stable and referenced from code comments, tests and
commit messages.

## Functional requirements

### FR-1 Spec registry

- FR-1.1 One JSON file per portal form, e.g. `specs/ssc/cgl-2026.json`.
- FR-1.2 Every spec declares `portal`, `form`, `sourceUrl`, `lastVerified`
  and a list of `assets` (photo, signature, document, ...).
- FR-1.3 Each asset declares rules for: format, file size range, pixel
  dimensions, physical dimensions (cm/mm) with DPI, aspect ratio tolerance,
  colour mode, background, face framing, and PDF page constraints.
- FR-1.4 A JSON Schema validates every spec in CI; invalid specs fail the build.
- FR-1.5 The app bundles all specs at build time and offers search by portal
  name, form name and aliases.
- FR-1.6 Every spec view shows the last-verified date and a one-click
  "report a change" link that opens a pre-filled GitHub issue.

### FR-2 Validation

- FR-2.1 Validation is a pure function: `(fileFacts, assetSpec) -> CheckResult[]`.
- FR-2.2 Each `CheckResult` carries an id, a status (pass, fail, warn, skip),
  the observed value, the expected value and a plain-language explanation.
- FR-2.3 Validation runs before and after fixing; both reports are shown.
- FR-2.4 Advisory checks (face framing, background) never block download.

### FR-3 Image fixing

- FR-3.1 Decode JPEG, PNG, WebP, HEIC (where the browser supports it), BMP.
- FR-3.2 Resize and crop to target pixel dimensions, or to physical
  dimensions at the spec DPI, preserving the aspect ratio by centre crop.
- FR-3.3 Write the DPI into the JFIF APP0 segment of the output JPEG.
- FR-3.4 Hit a target byte range exactly by binary-searching JPEG quality
  with a real encoder (mozjpeg via WebAssembly). If the minimum is not
  reachable at quality 100, pad with a harmless COM segment; if the maximum
  is not reachable at the floor quality, downscale and retry.
- FR-3.5 Convert colour mode (e.g. force RGB, or greyscale where required).
- FR-3.6 Strip EXIF and other metadata from outputs.
- FR-3.7 All heavy work runs in a Web Worker so the UI stays responsive.

### FR-4 Signature cleanup

- FR-4.1 Convert to greyscale, threshold to pure white background, trim
  whitespace with padding, and fit to the spec box.

### FR-5 Face and background checks (advisory)

- FR-5.1 Detect the largest face using the browser `FaceDetector` API when
  available; otherwise skip with a clear "not checked" status.
- FR-5.2 Report face height as a percentage of image height and compare to
  the spec range.
- FR-5.3 Estimate background plainness from border pixel variance and
  lightness; report pass/warn.

### FR-6 PDF tools

- FR-6.1 Compress a PDF under a byte limit by rendering pages and
  re-encoding as JPEG at a searched quality and scale.
- FR-6.2 Merge several PDFs or images into one PDF.
- FR-6.3 Split a PDF into selected page ranges.
- FR-6.4 Strip metadata from output PDFs.

### FR-7 Offline and installability

- FR-7.1 Service worker precaches the whole app; the app runs with no
  network after first load.
- FR-7.2 Web app manifest allows "Add to home screen".

### FR-8 Localisation

- FR-8.1 All UI strings live in per-language JSON files.
- FR-8.2 Ship English and Hindi at launch plus at least five more Indian
  languages; language auto-detected from the browser and switchable.

### FR-9 Output

- FR-9.1 Output is downloaded with a sensible filename, e.g.
  `ssc-cgl-2026-photo.jpg`. Nothing is uploaded anywhere.

## Non-functional requirements

- NFR-1 Privacy: zero network requests after load other than the app's own
  cached assets. No analytics, no third-party scripts, no fonts from CDNs.
- NFR-2 Performance: a 12 MP photo is processed in under 3 s on a 2019
  mid-range Android phone; the UI thread never blocks for more than 50 ms.
- NFR-3 Memory: inputs are downscaled to at most 4000 px on the long edge
  before heavy work.
- NFR-4 Bundle: initial JS under 150 KB gzipped; WASM and PDF libraries are
  lazy-loaded on first use.
- NFR-5 Accessibility: keyboard navigable, visible focus, WCAG AA contrast,
  every check readable by a screen reader.
- NFR-6 Compatibility: last two versions of Chrome, Edge, Firefox, Safari
  and Android Chrome; graceful degradation when OffscreenCanvas or
  FaceDetector are missing.
- NFR-7 Cost: Rs 0 to run. Static hosting on GitHub Pages.
- NFR-8 Quality: unit tests for all pure logic, byte-range fixture tests for
  the encoder, end-to-end browser test for the main flow, all on every push.
- NFR-9 Licence: permissive open-source licence; all dependencies permissive.

## Constraints and assumptions

- No backend, no login, no database, by design.
- Face checks are heuristic and advisory; the applicant decides.
- Portal rules are captured as published in the official notification linked
  from each spec; the registry does not guess undocumented behaviour.
