# Tree AI

Tree AI is an experimental, general-purpose multi-agent supervisor that can route work to specialist agents, make bounded decisions, learn from outcomes, and ask for approval only when an action is risky or hard to reverse.

This folder is intentionally isolated from the SkateQuest mobile runtime. It does not contain API keys, production credentials, or code that is imported by the Expo app.

## First milestone

The first milestone provides:

- a supervisor that accepts a goal and selects a specialist;
- specialist profiles for planning, coding, research, SkateQuest, files, and QA;
- a decision policy with three autonomy levels: `auto`, `auto_verify`, and `ask_owner`;
- an outcome memory that changes future routing based on which agents actually succeed;
- explicit approval gates for sending, publishing, spending, deleting, production changes, and sensitive writes;
- a pluggable model/tool boundary so a real LLM and external tools can be added without rewriting the core.

## Decision loop

```text
Goal
  -> Supervisor
  -> Build candidate actions
  -> Rank specialist agents
  -> Policy check
  -> Execute or request approval
  -> Verify when required
  -> Record outcome
  -> Update routing score for future tasks
```

The system does **not** allow an agent to grant itself more permissions. Learning changes routing scores and strategy selection, not the safety policy.

## Autonomy levels

- `auto`: reversible reading, research, planning, calculations, local analysis, and tests.
- `auto_verify`: code edits, configuration edits, structured writes, and other actions that should be checked by another agent before being treated as complete.
- `ask_owner`: sending messages, public publishing, production changes, destructive deletion, purchases/spending, signing/agreements, or other difficult-to-reverse actions.

## Current status

This is the foundation, not a finished autonomous product. The core runs without external AI dependencies so its routing and permission behavior can be tested first. The next milestone is a server-side model adapter plus real tool adapters for GitHub, web research, files, and approved communication actions.

## Important architecture rule

Never put service-role keys, GitHub tokens, OpenAI keys, or other secrets in the React Native bundle. Tool execution that needs secrets belongs in a server-side worker or protected backend function.
