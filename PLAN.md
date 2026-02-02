# SkateQuest Master Engine Integration Plan

## Summary

This plan covers integrating the SkateQuest Master Engine code you shared, including bug fixes, code review findings, refactoring, new features, and integration into the app.

---

## Part 1: Code Review Findings

### Issues Found in Pasted Code

1. **Import Path Issues**
   - `SkateQuestEngine.ts` imports `from './supabase'` but should be `from '../lib/supabase'` or `from '../../lib/supabase'` depending on placement
   - `AddSpotForm.tsx` imports `ObstacleType` but the engine exports `Obstacle`

2. **Type Mismatch in AddSpotForm.tsx**
   - Uses `ObstacleType` which doesn't exist; should use `Obstacle` from engine
   - References `BustRiskLevel` type correctly

3. **Duplicate JudgesBooth Code**
   - User pasted JudgesBooth.tsx twice
   - A better version with swipe gestures already exists at `src/screens/JudgesBooth.tsx`

4. **SQL Schema Issues**
   - The function definition for `update_spot_status()` has truncated dollar-quoting (ends with `$` instead of `$$`)
   - Multiple RLS policies have duplicate names (`"Allow public read access"`)

5. **Missing TypeScript Types**
   - `SkateQuestEngine.ts` references `Obstacle` type but exports only as const array
   - Should export proper TypeScript type

### Existing Code Assessment

**Good:**
- `src/screens/JudgesBooth.tsx` - Well-implemented with swipe gestures, animations, and real-time subscriptions
- `lib/supabase.ts` - Properly configured with auth and headers
- `types/index.ts` - Comprehensive type definitions

**Needs Improvement:**
- `src/logic/QuestEngine.ts` - Only has one function, should be expanded
- `src/logic/SpotLogic.ts` - Basic implementation, could use SkateQuestEngine features

---

## Part 2: Implementation Tasks

### Task 1: Create SkateQuestEngine (Core Game Logic)
**File:** `lib/skateQuestEngine.ts`

Add the comprehensive game engine with:
- Daily challenge generation
- Proximity verification for QR scanning
- Territory control logic
- Spot status updates
- Challenge submission and voting

**Fix needed:** Correct import paths and export types properly.

### Task 2: Add TypeScript Types
**File:** `types/index.ts`

Add new types:
- `SpotType` (PARK, STREET, DIY, QUEST, SHOP)
- `Obstacle` type union
- `BustRiskLevel` type
- `SpotStatus` type
- `QRData` interface
- `CrewStats` interface
- `ChallengeSubmission` interface

### Task 3: Create Database Migration
**File:** `supabase/migrations/004_skatequest_engine_schema.sql`

Create migration with:
- Spot type enhancements to skateparks table
- spot_claims table
- challenges table (enhanced)
- challenge_submissions table
- submission_votes table
- spot_status_updates table
- skate_shops table
- shop_checkins table
- shop_events table
- crews table (if not exists)
- crew_territories table
- qr_scans table
- ghost_clips table
- user_unlocks table
- RLS policies (with unique names)
- Helpful views

### Task 4: Enhance AddSpotScreen
**File:** `screens/AddSpotScreen.tsx`

Enhance existing screen with:
- Spot type selection (PARK, STREET, DIY, QUEST, SHOP)
- Obstacles multi-select
- Bust risk level (for STREET spots)
- QR Quest toggle
- Keep existing map functionality

### Task 5: Create Daily Challenge Component
**File:** `components/DailyChallenge.tsx`

New component showing:
- Today's challenge from `getDailyChallenge()`
- Countdown timer to expiration
- XP reward display
- Submit button linking to video upload

### Task 6: Enhance ChallengesScreen
**File:** `screens/ChallengesScreen.tsx`

Add:
- Daily challenge section at top
- Streak display
- Filter by challenge type (DAILY, SPOT_SPECIFIC, USER_ISSUED, BOUNTY)
- Video submission flow

### Task 7: Create SpotStatusWidget
**File:** `components/SpotStatusWidget.tsx`

Component for reporting spot conditions:
- BONDO_NEEDED, SECURITY_ACTIVE, DRY, WET
- Display current status
- Allow users to report changes

### Task 8: Update Navigation
**File:** `navigation/AppNavigator.tsx`

Already configured for City War screens. May need to add:
- DailyChallenge route if creating separate screen

### Task 9: Update MapScreen Integration
**File:** `screens/MapScreen.tsx` or `src/screens/MapScreen.tsx`

Integrate:
- Spot type colors/icons from engine
- Territory control crew colors
- Spot status indicators
- QR-enabled spot markers

---

## Part 3: File Structure After Implementation

```
lib/
├── skateQuestEngine.ts    # NEW - Core game logic
├── supabase.ts            # EXISTING
└── ...

types/
└── index.ts               # UPDATE - Add new types

components/
├── DailyChallenge.tsx     # NEW
├── SpotStatusWidget.tsx   # NEW
└── ...

screens/
├── AddSpotScreen.tsx      # ENHANCE
├── ChallengesScreen.tsx   # ENHANCE
└── ...

src/
├── logic/
│   ├── QuestEngine.ts     # DEPRECATE (merge into skateQuestEngine)
│   └── SpotLogic.ts       # UPDATE - use skateQuestEngine
└── screens/
    ├── JudgesBooth.tsx    # KEEP (already good)
    └── ...

supabase/migrations/
└── 004_skatequest_engine_schema.sql  # NEW
```

---

## Part 4: Priority Order

1. **Create types** (Task 2) - Foundation for everything
2. **Create skateQuestEngine** (Task 1) - Core logic
3. **Database migration** (Task 3) - Backend support
4. **Enhance AddSpotScreen** (Task 4) - Use new spot types
5. **Daily Challenge component** (Task 5) - High visibility feature
6. **Enhance ChallengesScreen** (Task 6) - Connect challenges
7. **SpotStatusWidget** (Task 7) - Community feature
8. **MapScreen integration** (Task 9) - Visual integration

---

## Questions Before Proceeding

1. Should the JudgesBooth be kept as-is (swipe-based) or replaced with the simpler button version?
   - **Recommendation:** Keep existing (better UX)

2. Should AddSpotScreen be enhanced or replaced with AddSpotForm component?
   - **Recommendation:** Enhance existing (preserves map integration)

3. Which database tables already exist that should be altered vs created fresh?
   - Need to verify: `skateparks`, `users`, `crews`, `challenges`

---

## Ready for Implementation

Approve this plan to begin implementation. I'll proceed task by task with commits for each major feature.
