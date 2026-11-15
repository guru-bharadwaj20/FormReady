# ADR-0007: No analytics or third-party network calls

Status: accepted. Date: 2026-11-16.

## Context

Trust is the product. Competing sites upload user photos and run ad
trackers.

## Decision

No analytics, no error reporting service, no CDN fonts, no third-party
scripts. The only network activity is fetching the app's own assets, which
the service worker caches. Adoption is measured by GitHub stars, issues and
spec pull requests.

## Consequences

- Product decisions rely on qualitative feedback from issues and exam
  community groups instead of funnels.
- The privacy statement on the landing page can be verified by anyone with
  the browser's network panel.
