# ADR-0005: Spec registry as versioned JSON with a schema

Status: accepted. Date: 2026-11-16.

## Context

Portal rules change silently between notifications. The registry must be
editable by non-programmers through pull requests and must be verifiable.

## Decision

One JSON file per portal form under `specs/<portal>/<form>.json`, with a
JSON Schema at `specs/schema.json` validated in CI. Each spec carries the
official source URL and a `lastVerified` date. The build step bundles all
specs into one typed module; the app never fetches specs at runtime.

## Consequences

- Diffs are reviewable line by line; history is in git.
- Anyone can propose a change; the schema stops malformed submissions.
- The registry is reusable by other tools as a plain dataset.
