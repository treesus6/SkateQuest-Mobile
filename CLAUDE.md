# SkateQuest-Mobile — Claude Context

## Project
React Native / Expo app mapping 27,000+ skateparks globally. Community-first, built for skaters by skaters. Features: interactive map, XP/leveling, check-ins, video uploads, daily tricks, city wars, crew battles, skate shop directory.

**Repo**: `treesus6/SkateQuest-Mobile`
**Stack**: React Native 0.81.5 · Expo SDK 54 · Supabase · Mapbox v11 · NativeWind · Sentry · React Navigation · Zustand

---

## Commands
```bash
npx tsc --noEmit          # type check — run before declaring anything done
npm run lint              # lint
npm test                  # tests
npx expo-doctor           # run before any build
git commit --no-verify -m "message"  # Termux — always bypass husky
git push origin main
```

---

## Critical Env Variables (GitHub Secrets)
- `EXPO_PUBLIC_MAPBOX_TOKEN` — **missing = white screen on launch**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_TOKEN` — EAS robot bot
- `GOOGLE_SERVICE_ACCOUNT_KEY` — Play Store submission

---

## TypeScript Rules
- **No `any`** — call it out and fix it
- Every component needs `interface Props {}` above it
- `npx tsc --noEmit` must pass before any feature is "done"

---

## React Native Rules
- No `div`, `span`, `button`, `onClick` — this is NOT web
- All screens need auth guards
- All touch targets minimum 44x44px
- `Pressable` over `TouchableOpacity`
- `expo-image` for all images
- NativeWind for styling — no inline style objects in render

---

## Database (Supabase — hreeuqdgrwvnxquxohod)
Tables: `skateparks` · `profiles` · `skate_shops` · `shop_members` · `user_crews` · `city_war_stats` · `daily_tricks` · `blocked_users`
**All new tables must have RLS enabled + policies.**

---

## Known Fixed Issues — Never Reintroduce
- Missing `expo-splash-screen` → white screen
- Mapbox init at app start → crash (112MB RAM device)
- `return null` during auth loading → gray screen
- `this.lock is not a function` → use `processLock` from `@supabase/auth-js`
- Sentry v8 + RN 0.81 conflict → resolved, don't change Sentry version

---

## Portal Dimension
Kevin's shop (Newport, OR) has a map marker at 44.6368/-124.0537. Community favor — not a sponsor. Do NOT remove.

---

## Active Skills
- [sq-typescript](./.claude/skills/sq-typescript)
- [sq-navigation](./.claude/skills/sq-navigation)
- [sq-data](./.claude/skills/sq-data)
- [sq-qa](./.claude/skills/sq-qa)
- [sq-perf](./.claude/skills/sq-perf)
- [sq-devops](./.claude/skills/sq-devops)
- [sq-mobile-dev](./.claude/skills/sq-mobile-dev)
