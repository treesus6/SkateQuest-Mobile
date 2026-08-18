# SkateQuest Integration Guide

This file is a maintenance guide, not a claim that every feature is finished.

## Product integrity

SkateQuest production behavior must be real end to end. Do not add demo users, fabricated activity, fake views or likes, placeholder feeds, local-only success states, dead buttons, or UI that promises rewards the backend does not actually award.

When a screen depends on missing schema or an RPC, fix the real Supabase migration/RPC/RLS/storage contract and wire the screen to it. Do not hide the problem by removing the feature or pretending it succeeded.

## Source of truth

- Product rules: `CLAUDE.md` and `AGENTS.md`
- Current app behavior: `screens/`, `lib/`, `components/`
- Database history and backend contracts: `supabase/migrations/`
- Expo Router routes: `app/`

Do not follow historical instructions that reference `003_skatequest_full_features.sql`; that migration does not exist in this repository.

## Verified proof workflows

### Judge's Booth

Challenge and bounty proof use real uploaded videos and server-side RPCs. The backend contract is defined by current migrations, including `20260818152000_real_judges_booth_workflow.sql`.

- `submit_challenge_proof` creates a pending challenge submission.
- `submit_bounty_claim` creates a pending bounty submission.
- `judge_challenge_submission` records a real judge vote and resolves the challenge only when the configured threshold is reached.
- `judge_bounty_submission` records a real judge vote and resolves the bounty only when the configured threshold is reached.
- The submitter cannot judge their own proof.
- Duplicate judge votes are rejected.
- Reward XP is awarded by the server after approval, not by a client-side display calculation.

### Bounty Board

Official SkateQuest bounties are product-authored playable challenges, not fabricated user activity. They are stored in the real `bounties` table, require real video proof, and flow through the Judge's Booth. Community-created bounties remain attributable to the actual creator/crew.

Do not display a calculated bounty multiplier unless the backend persists and awards the same value. The old UI-only `BountyBadge` multiplier concept is retired.

### Daily quests

Only show quests whose completion can be verified against real server-side progress. XP claims must go through the server verification RPC rather than trusting a button press.

### Call Outs and QR flows

Call Out proof and QR actions must use their verified backend flows. Do not restore local-only completion paths or client-side reward awards.

## Empty states

An empty real feed is valid. Use an honest empty state such as "No clips yet" or "No open bounties right now." Never seed fake engagement to make a screen look populated.

## Before declaring a feature done

1. Confirm the screen reads real data.
2. Confirm every action writes through the intended backend contract.
3. Confirm RLS permits the intended user and blocks unintended users.
4. Confirm success is based on the backend result.
5. Confirm failure is visible and does not look successful.
6. Confirm rewards cannot be self-awarded from the client.
7. Run type-check/lint/tests that cover the change.
8. Test high-risk native behavior on Android when required.

If any of these checks are not complete, report the feature as needing verification rather than calling it finished.
