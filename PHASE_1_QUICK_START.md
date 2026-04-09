# Phase 1 Quick Start Guide

## Immediate Actions (Next 1 Hour)

### 1. Apply Supabase Migration

```bash
# Copy the migration SQL:
# supabase/migrations/004_add_notifications_achievements.sql

# Log in to Supabase dashboard:
# https://app.supabase.com

# Select your SkateQuest project

# Go to: SQL Editor (left sidebar)

# Create new query and paste entire migration file

# Click "Run" button

# Verify: No SQL errors, tables created successfully
```

### 2. Verify Code Compiles

```bash
# Type check
npx tsc --noEmit

# Lint check
npx eslint . --ext .ts,.tsx

# Both should pass with no errors
```

### 3. Test Notifications Locally (Emulator)

```bash
# Start expo development server
npx expo start

# Scan QR code with Expo Go app (or emulator)

# Navigate to Notifications tab

# Expected: Empty list with "No notifications" message
```

### 4. Test Achievements Locally

```bash
# On the running app

# Navigate to Achievements tab

# Expected:
# - List of 30 achievements grouped by tier
# - All showing as "locked" (gray with lock icon)
# - Progress bar at 0/30
```

---

## Phase 1 Feature Testing

### Send a Test Notification (via Supabase Dashboard)

1. Go to Supabase SQL Editor
2. Paste and run:
```sql
INSERT INTO notifications (user_id, type, title, body)
VALUES (auth.uid(), 'system', 'Test Notification', 'This is a test!');
```

3. On app: Notifications tab should instantly show new notification
   - Bell badge should show "1"
   - Notification appears at top of list with "System" type

### Unlock a Test Achievement (via Supabase Dashboard)

1. Go to Supabase SQL Editor
2. Paste and run:
```sql
-- First, get your user ID (from profiles table)
SELECT id, username FROM profiles LIMIT 5;

-- Replace USER_ID_HERE with actual UUID
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT 'USER_ID_HERE', id, NOW() FROM achievements WHERE name = 'First Steps'
ON CONFLICT DO NOTHING;
```

3. On app: Achievements tab
   - Achievement modal should pop up with celebration animation
   - "First Steps" achievement marked as unlocked (✓ icon)
   - Progress bar updates to "1/30"

---

## Development Workflow for Phase 2-6

### When Building Phase 2: Seasonal Events

```
1. Read PHASE_1_COMPLETION.md to understand patterns
2. Create supabase/migrations/005_add_seasonal_events.sql
3. Create lib/seasonalEventsService.ts (copy pattern from notificationsService)
4. Create stores/useSeasonalStore.ts (copy pattern from useNotificationStore)
5. Create screens/SeasonalEventsScreen.tsx
6. Add new tab to ChallengeApp.tsx
7. Commit & test via OTA update
```

### Testing OTA Updates (After Phase 2+ Complete)

```bash
# Create OTA update (no rebuild needed for JS changes)
eas update --branch production --message "feat: Phase 2 - Seasonal Events"

# Users will get update automatically when they open app
# No need to rebuild iOS/Android
```

---

## Debugging Common Issues

### "White Screen on Launch"
**Cause**: Usually a TypeScript error or import issue

**Fix**:
```bash
npx tsc --noEmit  # Show exact error
npx eslint . --ext .ts,.tsx  # Show linting issues
```

### "Notifications Tab Not Appearing"
**Cause**: Import not added to ChallengeApp.tsx

**Verify**:
```typescript
// ChallengeApp.tsx should have:
import NotificationsScreen from '../screens/NotificationsScreen';
import AchievementsScreen from '../screens/AchievementsScreen';

// And two Tab.Screen entries:
<Tab.Screen name="NotificationsTab" component={NotificationsScreen} ... />
<Tab.Screen name="AchievementsTab" component={AchievementsScreen} ... />
```

### "Real-Time Notifications Not Updating"
**Cause**: Supabase channel subscription not working

**Debug**:
```bash
# Check Supabase Dashboard > SQL Editor
SELECT * FROM notifications WHERE created_at > NOW() - interval '5 minutes';

# Manually insert a test notification (see above)
# If it appears in Supabase but not in app, the subscription is broken
```

### "No Achievements Showing"
**Cause**: Migration didn't run or achievements not seeded

**Fix**:
```sql
-- Check if achievements table exists
SELECT COUNT(*) FROM achievements;  -- Should return 30

-- If 0, run the migration again
-- Copy entire supabase/migrations/004_add_notifications_achievements.sql
-- Paste into Supabase SQL Editor and execute
```

---

## Performance Optimization (Phase 2+)

When adding more features, consider:

1. **Pagination** - Achievements & notifications fetch in batches
2. **Caching** - Use Zustand store to avoid re-fetching
3. **Lazy Loading** - Load screens on demand, not all at once
4. **Animations** - Use `useNativeDriver={true}` in Animated API

Example:
```typescript
// Good (native driver = 60fps)
Animated.timing(scale, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true  // ← IMPORTANT
}).start();

// Bad (drops to JS thread = lag)
Animated.timing(scale, {
  toValue: 1,
  duration: 300,
  useNativeDriver: false  // ← Slow
}).start();
```

---

## Team Handoff Checklist

When handing off this codebase:

- [ ] Supabase migrations applied
- [ ] All 30 achievements seeded
- [ ] TypeScript/ESLint passing
- [ ] Phase 1 tested on device
- [ ] Phase 2+ plan documented
- [ ] Database schema diagramed
- [ ] Zustand store patterns explained
- [ ] RLS policies reviewed
- [ ] Real-time subscriptions tested

---

## Success Metrics

**After Phase 1 Launch**:
- Users see notifications in real-time
- Achievement unlocks trigger celebration modals
- No crashes related to notifications/achievements in Sentry
- Bell badge accurately shows unread count
- Achievements tab loads <1s

**After Phase 6 Complete**:
- 14 new features deployed
- 0 white screen bugs
- >80% daily active user retention
- <500ms feature load time
- 0 production Sentry errors from new features

---

## Questions or Issues?

Refer to:
- `CLAUDE.md` - Project rules & architecture
- `PHASE_1_COMPLETION.md` - Detailed implementation notes
- `PRODUCTION_DEPLOYMENT_CHECKLIST.md` - Deployment procedures
- DB schema: `supabase/migrations/004_add_notifications_achievements.sql`
- Code patterns: `lib/spotsService.ts`, `stores/useAuthStore.ts`, `screens/HomeScreen.tsx`

---

**Ready to test and deploy! 🚀**

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
