# Security Policy

## Supported version

SkateQuest is currently a pre-release product. Security fixes are applied to the current `main` branch and the active release-candidate branch; older snapshots are not supported.

## Reporting a vulnerability

Report suspected vulnerabilities privately to `support@skatequest.me`. Do not include access tokens, passwords, private user media, or production database exports in an issue or other public channel.

Include the affected surface, reproduction steps, impact, and the smallest safe proof of concept. The maintainers will acknowledge the report, assess severity, and coordinate remediation and disclosure. Please avoid accessing other users' data or degrading production while testing.

## Repository rules

- Never commit service-role keys, signing credentials, OAuth client secrets, or production access tokens.
- Expo `EXPO_PUBLIC_*` values and the Supabase anon key are public client configuration; their safety depends on RLS, Storage policies, and RPC authorization.
- Competitive state, XP, challenge completion, and privileged actions must be authorized and validated server-side.
- Production migrations must be reviewed, reversible where practical, and reconciled before they are applied.
