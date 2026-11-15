# Security policy

FormReady runs entirely in the browser. There is no server, no account and no
database, so the attack surface is the client code and the supply chain that
produces it. We still take reports seriously.

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.x     | yes       |
| < 1.0   | no        |

Only the latest deployment at the project GitHub Pages URL and the latest
tagged release receive fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems.

Use GitHub private vulnerability reporting:
https://github.com/guru-bharadwaj20/FormReady/security/advisories/new

Include what you found, how to reproduce it and what impact you believe it
has. Proof-of-concept files are welcome; do not include real identity
documents or photographs of real people.

Targets:

- Acknowledgement within 72 hours.
- Triage and a fix plan within 14 days.
- Credit in the release notes if you want it.

## What counts

- Any way for user files or derived data to leave the device.
- Cross-site scripting through file names, metadata or spec content.
- Service worker or cache behaviour that serves a tampered build.
- Dependency vulnerabilities that are reachable from shipped code.

## Hardening already in place

- No network requests after load except the app's own cached assets.
- No analytics, third-party scripts, fonts or iframes.
- Strict Content Security Policy via meta tag.
- Heavy processing isolated in Web Workers.
- Dependencies pinned through the lockfile and watched by Dependabot.
- CI runs lint, type check, tests and spec validation on every push.
