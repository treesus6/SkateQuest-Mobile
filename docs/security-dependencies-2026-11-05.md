# Dependency security review — November 5, 2026

Baseline: `main` commit `c111708e30a4d20a52722d1022b53735662f71d6`.

## Scope and verified audit results

The owner reported a GitHub Security and quality badge of 38. The connected GitHub tools do not expose the private security inventory; unauthenticated code-scanning API access returns HTTP 401 and the browser is signed out. This dependency review does not establish the contents of that badge or claim that all GitHub findings are resolved.

| npm audit metric     | Before | After |
| -------------------- | -----: | ----: |
| Affected packages    |     28 |     9 |
| Critical             |      1 |     0 |
| High                 |      7 |     3 |
| Moderate             |     14 |     0 |
| Low                  |      6 |     6 |
| Unique advisory URLs |     35 |     3 |

Counts include inherited parent-package findings; nine affected packages do not mean nine independent vulnerabilities. Audit database observations are dated and must be refreshed.

## Resolved dependency updates

| Package / consumer                          | Before  | After  |
| ------------------------------------------- | ------- | ------ |
| `@xmldom/xmldom`                            | 0.8.13  | 0.8.15 |
| `sanitize-html`                             | 2.17.5  | 2.18.1 |
| `shell-quote`                               | 1.9.0   | 1.12.0 |
| `node-forge`                                | 1.4.0   | 1.4.3  |
| `source-map-js`                             | 1.2.1   | 1.2.2  |
| `zod`                                       | 3.25.76 | 4.6.7  |
| `uuid`                                      | 3.4.0   | 11.1.1 |
| Expo fingerprint `glob`                     | 13.0.6  | 14.0.3 |
| Fingerprint / TypeScript ESLint `minimatch` | 10.2.6  | 11.0.4 |

Native framework versions remain Expo 57.0.32 and React Native 0.86.3. Overrides preserve old glob7/minimatch3 consumers and scope UUID11 to ngrok, which uses its compatible `v4()` API. Zod4 is supported by React hooks lint's existing `^3.25.0 || ^4.0.0` range. The sanitizer's ESM parser dependencies are transformed by Jest, rather than mocked.

## Remaining security requirements

1. **URI decoding (high):** `expo-router@57.0.30` → `query-string@7.1.3` → `decode-uri-component@0.2.2`. Two advisories remain. Patched decoder0.5.1 is ESM and exports a default, while query-string7 calls `require('decode-uri-component')` as a function. A blind override breaks routing. Resolve with a reviewed compatibility adaptation or coordinated Router/SDK upgrade, with deep-link, auth callback, Unicode, malformed-input, Android and web acceptance tests. This PR does not waive the requirement.
2. **Jest config merging (low):** `jest-config@29.7.0` → `deepmerge@4.3.1`. Upstream publishes no patched version. After updating the sanitizer, this package is development-only. Keep the finding visible; do not downgrade outside the reported range and assume it is safe. A reviewed upstream fix or compatible replacement is still required.
3. **GitHub alert inventory:** authenticate the security view, enumerate the actual badge findings, and reconcile them with this patch. CodeQL success is not proof that existing alerts have closed.

References: [decoder advisory](https://github.com/advisories/GHSA-qr28-fpjm-wq7f), [deepmerge advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), [shell quoting advisory](https://github.com/advisories/GHSA-pqg4-j6r4-53mv), [XML serialization advisory](https://github.com/advisories/GHSA-w2rr-34g9-rvrj).

## Verification

- Three exploit regression cases failed against the earlier vulnerable packages, then passed with the updates (shell quote, XML element-name serialization, sanitizer textarea solidus close).
- All six dependency security/API tests pass, including fingerprint glob/minimatch, ngrok UUID creation/loading, and Zod validation.
- TypeScript and ESLint pass.
- Full Jest: 43 suites, 354 tests pass. An earlier cold run hit a five-second profile render timeout under concurrent load; the warm full rerun passed with the original timeout.
- Full Android fingerprint generation passes: `75a8411c693bb45e37577ed1bc6f2ea17f03f1d4`, 120 sources.
- Independent review found no new actionable compatibility defects, and confirmed the two remaining dependency roots.
- Android production Metro export passes, including the Hermes bytecode bundle (11 MB). This is a JavaScript bundle check, not an APK install or native runtime acceptance.
- Expo Doctor: 21/21 checks pass.
- Final clean `npm ci` from the regenerated lockfile passes (1,313 packages installed, normal lifecycle scripts enabled).

No merge, native binary acceptance, authenticated backend persistence test, store submission, production deployment, or signing change is claimed. Native acceptance is required before merging under AGENTS.md and issue#37.
