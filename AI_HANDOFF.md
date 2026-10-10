# SkateQuest AI Handoff

This file is the shared coordination contract for ChatGPT/Codex, Gemini, Copilot, and human contributors working on SkateQuest.

## Source of truth

- Repository: `treesus6/SkateQuest-Mobile`
- Default branch: `main`
- Alpha release coordination: GitHub issue #37
- Engineering rules: `AGENTS.md`
- Gemini project instructions: `GEMINI.md`
- Target: Android Alpha closed testing. Do not publish to production unless the owner explicitly changes the release target.

## Collaboration loop

1. Read `AGENTS.md`, `AI_HANDOFF.md`, issue #37, and the current PR before making recommendations.
2. Work from the current repository state. Never rely on a pasted copy when GitHub contains a newer version.
3. Gemini acts as an independent reviewer/scout. It identifies regressions, missing tests, unsafe assumptions, Android/web parity issues, and release blockers.
4. ChatGPT/Codex acts as implementation/release lead. It verifies findings, makes the smallest correct fix, runs relevant tests, and keeps release readiness honest.
5. Copilot or another agent may implement isolated tasks, but its work must pass the same review and verification gates.
6. Put findings and results on the PR or linked issue so the next agent can retrieve them directly from GitHub. The owner should not need to copy messages between agents.
7. Never mark a blocker resolved from static inspection alone when the requirement needs Supabase, Android hardware, auth, maps, camera, deep-link, or Play Console verification.

## Handoff format

Use this compact structure in PR comments or issue updates:

### Goal
What is being fixed or verified.

### Evidence
Exact files, logs, tests, screenshots, workflow runs, or runtime behavior that support the finding.

### Changes
What changed, including migrations or user-facing behavior.

### Verification
Commands/tests run and any device/web checks completed.

### Remaining blockers
Only unresolved items. Do not hide failures behind fallback behavior.

### Next smallest action
One concrete action that moves Alpha readiness forward.

## Release-critical areas

Treat these as high priority until Alpha is approved:

- Android preview install and crash-free launch
- Google auth and session persistence
- Map rendering and WebGL/location fallback behavior
- Add Spot coordinate placement, duplicate prevention, photo persistence, save/read-back
- Supabase migration/schema/RLS correctness
- Spot details, sessions, crews, quests/challenges, call-outs, SkateTV, and navigation
- Deep links and direct web route refresh behavior
- AAB package/signing/version/target-SDK verification
- Play Console disclosures and closed-testing readiness

## Safety rails

- Never commit API keys, service-role keys, signing files, or credentials.
- Never make destructive production database changes without explicit owner approval.
- Never replace a real feature with fake success, local-only state, a no-op, or placeholder behavior.
- Automated AI review must not auto-merge or publish a release.
- Avoid bot-to-bot commit loops. AI automation may review and hand off; implementation changes require a controlled branch/PR.

<!-- AI pair-review setup verification trigger: 2026-09-11 -->
