# ADR-0006: Face and background checks are advisory

Status: accepted. Date: 2026-11-16.

## Context

Face detection on device is possible with the platform `FaceDetector` API
(Chrome/Edge on Android and desktop behind a flag or origin trial) or with a
~1 MB WASM model. Detection can be wrong on dark backgrounds, with glasses
or in poor light.

## Decision

Use the platform `FaceDetector` when present and otherwise mark the check
as "not checked on this browser". Face framing and background plainness
are reported as pass/warn only and never block download. A WASM model may
be added later as an optional, lazily loaded upgrade.

## Consequences

- No model download at launch; bundle stays small.
- Applicants on Firefox or Safari still get every blocking check (size,
  dimensions, DPI, format) and a clear note about what was not checked.
