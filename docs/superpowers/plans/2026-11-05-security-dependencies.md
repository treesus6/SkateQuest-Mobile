# Security dependency remediation plan

Goal: remove verified vulnerable dependency resolutions while preserving Expo SDK 57, React Native 0.86.3, signing, and app behavior.

Evidence: npm audit on main c111708 reported 28 affected packages (1 critical, 7 high, 14 moderate, 6 low). GitHub’s private alert inventory is inaccessible until browser authentication is approved; do not equate this audit with the screenshot’s 38 alerts.

- [x] Reproduce audit findings and inspect each affected dependency and consumer.
- [x] Update sanitizer and patched transitive dependencies; scope major overrides to consumers whose required APIs remain compatible.
- [x] Verify clean installation, dependency APIs, unit tests, TypeScript, lint, fingerprint generation, and Android/web bundling where available.
- [x] Run a fresh audit and document any remaining upstream vulnerabilities honestly. Do not suppress or dismiss findings.
- [ ] Commit and open a reviewable PR with exact evidence and access blockers.

No automatic merge or production release. The SDK remains on its existing line. Any unpatched dependencies must remain visible in the report.

Verification: 43 Jest suites / 354 tests, six dependency tests, TypeScript, ESLint, Expo Doctor21/21, fingerprint generation, and Android Hermes export passed. Final clean install from the final lockfile passed. Audit now has nine affected packages from two remaining dependency roots; private GitHub inventory access remains blocked.
