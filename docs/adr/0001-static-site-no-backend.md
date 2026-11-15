# ADR-0001: Static site with no backend

Status: accepted. Date: 2026-11-16.

## Context

The product promise is "nothing leaves your browser". The budget is Rs 0.
The audience peaks at lakhs of users in the same week of an exam
notification.

## Decision

Ship FormReady as a static site. All image, PDF and validation work runs in
the visitor's browser (Web Workers and WebAssembly). Host on GitHub Pages.

## Consequences

- Hosting cost is zero at any traffic level.
- Privacy is structural, not a policy: there is no server to receive data.
- Features that need a server (accounts, history sync, server-side OCR) are
  out of scope by design.
- Browser capability differences must be handled on the client with
  graceful degradation.
