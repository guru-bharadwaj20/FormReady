# ADR-0004: Exact-KB targeting algorithm

Status: accepted. Date: 2026-11-16.

## Context

Portals specify a byte range such as 20 KB to 50 KB. Encoding at a guessed
quality usually overshoots or undershoots. People do this by hand today.

## Decision

Given a target `[min, max]` in bytes and a `RawImage` at the final pixel
dimensions:

1. Encode at quality 85. If within range, done.
2. Binary-search quality in `[5, 100]` for the highest quality whose size is
   at most `max`. At most 8 encodes.
3. If the result is below `min`, pad the file with a JPEG COM segment of
   the exact missing byte count (the portal measures bytes, not pixels).
4. If even quality 5 exceeds `max`, scale the image down by 10 % along both
   axes and repeat, as long as the spec allows a smaller size; otherwise
   report an honest failure.
5. Always write the JFIF DPI tag last, and account for its 18 bytes in the
   budget.

## Consequences

- Deterministic, bounded runtime (typically 4 to 8 encodes).
- Padding is lossless and invisible to viewers and to portal validators,
  which only measure file size.
- The "downscale when quality floor is hit" branch may produce a smaller
  image than the spec wants; the after-report shows this clearly.
