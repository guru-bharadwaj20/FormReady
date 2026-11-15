# ADR-0003: Pure-TypeScript pixel pipeline with WASM codecs

Status: accepted. Date: 2026-11-16.

## Context

Resizing, cropping and signature thresholding can be done with Canvas, but
Canvas is not available in Node, so the core logic could not be unit tested
with byte-exact assertions. Canvas JPEG output also varies by browser,
which makes "20 to 50 KB" claims unprovable.

## Decision

Represent images as a plain `RawImage { width, height, data: Uint8ClampedArray }`
and implement resize (area-average downscale, bilinear upscale), crop,
greyscale, threshold and trim as pure TypeScript functions. Encode and
decode JPEG/PNG with the jSquash WebAssembly builds of mozjpeg and the
Squoosh PNG codec. Use the browser's `createImageBitmap` only as a fast
path for decoding exotic inputs (HEIC, WebP) in the worker.

## Consequences

- The same code path runs in Vitest on Node and in the browser worker, so
  fixture tests prove the byte ranges the UI promises.
- Pure TS resizing is slower than GPU canvas resizing, which is why inputs
  are downscaled first (NFR-3) and work runs in a worker (FR-3.7).
- The mozjpeg WASM (~100 KB) is lazy-loaded on first fix.
