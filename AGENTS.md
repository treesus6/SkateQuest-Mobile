# SkateQuest Engineering Rules

## Product integrity — mandatory

**NEVER REPLACE A REAL FEATURE WITH A LOCAL-ONLY STATE, NO-OP, PLACEHOLDER, FAKE SUCCESS, EMPTY FEED, OR BUTTON THAT ONLY APPEARS TO WORK.**

SkateQuest is a real mobile product. Passing TypeScript, lint, or CI is not sufficient if the user-facing action does not persist and work end-to-end.

### No-shortcuts completion gate

**NO SHORTCUTS. NO SUBSTITUTE FEATURES. NO “GOOD ENOUGH.” NO MOVING ON WHILE A REQUESTED REQUIREMENT IS BROKEN OR UNVERIFIED.**

- A failed or missing requirement remains an explicit blocker until it is fixed correctly and verified end-to-end.
- Do not change the requested behavior, reduce scope, choose an easier implementation, or work around the problem without the product owner's explicit approval.
- Do not classify a product failure as minor merely because builds, types, lint, or unrelated screens pass.
- Do not mark a task, milestone, PR, or release complete while any accepted requirement is silently deferred.
- If truly blocked by credentials, platform access, or a required product decision, stop and report the exact blocker, evidence, and required next action. Never conceal it with alternate UI or fake data.
- Temporary implementations require explicit product-owner approval, a visible tracking issue, and a removal condition. They are never the default response to failure.

### Required behavior

- If a screen needs a missing Supabase table, column, policy, storage bucket, trigger, or RPC, implement the correct backend contract and migration.
- Persist user-created state in Supabase unless the product explicitly defines it as device-only or offline cache.
- Verify writes with a read-back query and verify ownership/RLS behavior.
- Preserve existing functionality during schema repairs. Do not delete or silently downgrade it to make checks pass.
- If a feature cannot be completed safely, clearly disable or hide it and document the blocker. Never show success for an action that did not persist.
- Optimistic UI must roll back on failure and must reconcile with the server.
- Empty states must reflect real server results. Do not fabricate users, clips, missions, bounties, crews, reviews, or activity.
- Do not swallow persistence errors. Log them through the project logger and show a useful user-facing failure state.
- Before merge, test critical flows on Android and against the connected Supabase project.

### Pull request requirement

Every PR that changes a user action must state:

1. What database/API/storage operation powers it.
2. How persistence was verified.
3. What happens when the operation fails.
4. Which Android flow was tested.
5. Whether any behavior is intentionally local-only and why.

**A FEATURE IS NOT DONE UNTIL IT WORKS AFTER APP RESTART AND, WHEN APPLICABLE, ON A SECOND DEVICE SIGNED INTO THE SAME ACCOUNT.**
