# Standalone Android Signing Implementation Plan

> Execute inline using executing-plans; the owner requested continuous execution.

**Goal:** Deliver a standalone APK and use the existing Expo upload credentials consistently.
**Architecture:** Replace the APK workflow's debug build and stale GitHub keystore with an EAS local release APK. Reuse the already successful Expo-backed AAB workflow. Fail artifact publication when bundle, manifest, configuration or certificate validation fails.
**Tech Stack:** EAS, GitHub Actions, Android SDK, Python standard library.
**Spec:** Owner's October 12 request: fix developer launcher and signing, explain and keep working.

## Global Constraints
- No merges or Play publishing in this repair; produce reviewable branch artifacts.
- Never expose credentials or weaken signature checking.
- Target package com.treesus6.skatequest; existing expected upload SHA-256 2FC959AD2A2940BA8B831B3B5250ADCF45FB8148F9C83C50C3F84BAA3C8A3A0B.

## Review Focus
Missing bundle, debuggable manifest, wrong certificate, missing runtime settings, missing build credentials must fail before uploading artifacts.

## Task 1: Guard standalone APK artifacts
- [x] Add Python tests using small ZIP fixtures for bundle/configuration checks and real Android tool-output formats.
- [x] Run tests and observe failure before implementing verifier.
- [x] Implement scripts/verify_standalone_apk.py with validate_apk(path, badging, certificates, expected_sha256).
- [ ] Run tests; verify the downloaded APK with Android tools if available.

## Task 2: Use Expo credentials for both output formats
- [x] Replace APK workflow with EAS local production-apk profile, remote credentials, no developer client, no debug fallback.
- [x] Preserve required configuration and permissions checks.
- [x] Enable the two build workflows on this exact repair branch for verification; no app-store submission.
- [ ] Validate YAML and shell syntax; push isolated branch and open draft PR.
- [ ] Inspect resulting build logs and artifacts. Keep device startup and Play acceptance explicitly unverified until observed.

## Execution notes
- Fresh clone isolated on codex/android-standalone-signing-20261012 from 53205db.
- APK 11733023892 was downloaded and inspected; bundled JavaScript and runtime settings present.
- GitHub APK key C2B969... differs from expected Expo upload key 2FC959...; Oct 9 Expo AAB confirms correct key remains available.

- Verifier RED: 8 meaningful rejection tests failed against empty implementation. GREEN: 9/9 pass.
- YAML and bash syntax pass; npm ci succeeds; TypeScript passes.
- Downloaded interim APK manifest: package com.treesus6.skatequest, version 1.0.2/code 1, debuggable=false, MainActivity launcher, C2B969... internal-test certificate. Do not label as Play-ready.
- Working preference saved separately; global ChatGPT memory write tool unavailable.
