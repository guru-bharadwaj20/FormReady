# ADR-0002: Svelte 5, Vite and TypeScript

Status: accepted. Date: 2026-11-16.

## Context

The UI is small (a picker, a dropzone, a checklist, a download button) but
must load fast on low-end phones over slow networks (NFR-4) and must be
easy for community contributors to localise.

## Options considered

- React + Vite: familiar, but ~45 KB of runtime before any app code.
- Vanilla TypeScript: smallest, but reactive checklists and i18n become
  hand-rolled boilerplate.
- Svelte 5 + Vite: compiles to plain DOM code, runtime of a few KB, first
  class TypeScript, static build output.

## Decision

Svelte 5 (runes) with Vite 7 and TypeScript 5.9 in strict mode. No UI
component library; a small set of CSS custom properties and hand-written
components keep the bundle tiny.

## Consequences

- Initial bundle target of under 150 KB gzipped is achievable with the
  codec, face and PDF modules lazy-loaded.
- Contributors need basic Svelte knowledge for UI changes; the registry and
  pure logic modules are framework-free.
