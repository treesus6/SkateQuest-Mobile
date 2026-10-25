# Tree AI build status

## Implemented in this branch

- Supervisor with specialist routing.
- Planner, coder, researcher, SkateQuest, files, and QA specialist profiles.
- Bounded decision policy with `auto`, `auto_verify`, and `ask_owner` behavior.
- Outcome memory with smoothed success/quality scoring.
- Learned routing that can change which specialist is chosen after repeated outcomes.
- Rule-based reasoning fallback and a provider-agnostic reasoning interface.
- Tool registry interface for future GitHub/web/files/email/etc. adapters.
- Tests covering dangerous-action approval gates, code verification, and learning-based routing.

## Next milestone

1. Add a server-side hosted-model adapter behind `ReasoningEngine`.
2. Add a real execution loop that dispatches tool calls and records outcomes automatically.
3. Add GitHub read/write adapters with branch-only writes by default.
4. Add web research and file adapters.
5. Add persistent memory storage instead of in-process memory.
6. Add a small phone-friendly control UI showing plan, current agent, approvals, and results.
7. Add an independent QA pass before any action is marked complete.

## Safety invariant

Learning may improve routing, confidence, and strategy selection. It must never modify or bypass the approval policy. Agents cannot grant themselves additional permissions.
