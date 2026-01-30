# SkateQuest Integration Guide

## 🎉 ALL FEATURES BUILT!

This guide contains everything you need to integrate the new SkateQuest features into your app.

---

## 📦 WHAT WAS BUILT

### Phase 2: Your Requested Components
✅ **ActivityFeed.tsx** - Feed from activity_feed table
✅ **ConfettiWrapper.tsx** - Achievement confetti listener
✅ **RedeemModal.tsx** - Shop deal redemption with QR codes

### Phase 3: Core Gemini Features
✅ **JudgesBoothScreen.tsx** - TikTok-style video voting (STOMPED/BAIL)
✅ **AddSpotScreen.tsx** - Enhanced with 5 spot types, obstacles, bust risk
✅ **QRGeocacheScanner.tsx** - GPS proximity verification (15m)
✅ **TerritoryControl.tsx** - Crew ownership system
✅ **KingOfTheHill.tsx** - Individual spot claims with videos

### Phase 4: Map Enhancements
✅ **MapFilters.tsx** - Toggle spot types on/off
✅ **SpotMarker.tsx** - Animated markers + crew colors

### Phase 5: Polish Features
✅ **GhostClipViewer.tsx** - Unlockable videos at QR spots
✅ **BountyBadge.tsx** - XP multiplier for old challenges
✅ **HotStreakBadge.tsx** - Fire aura for 3+ day streaks

### Database
✅ **003_skatequest_full_features.sql** - Complete migration

---

## 🚀 INSTALLATION STEPS

### Step 1: Install Required Packages

```bash
bun add react-native-confetti-cannon react-native-qrcode-svg
```

### Step 2: Run Database Migration

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the entire contents of:
   `/supabase/migrations/003_skatequest_full_features.sql`
4. Click "Run"

### Step 3: Update Navigation

Add the new screens to your `AppNavigator.tsx`:

```typescript
import JudgesBoothScreen from '../screens/JudgesBoothScreen';

// In your Stack.Navigator:
<Stack.Screen name="JudgesBooth" component={JudgesBoothScreen} />
```

### Step 4: Wrap App with ConfettiWrapper

In your root `App.tsx`:

```typescript
import ConfettiWrapper from './components/ConfettiWrapper';

export default function App() {
  return (
    <ConfettiWrapper>
      {/* Your existing app */}
    </ConfettiWrapper>
  );
}
```

### Step 5: Add Components to Existing Screens

#### In SpotDetailScreen.tsx:
```typescript
import TerritoryControl from '../components/TerritoryControl';
import KingOfTheHill from '../components/KingOfTheHill';
import GhostClipViewer from '../components/GhostClipViewer';

// Inside your component:
<TerritoryControl spotId={spotId} />
<KingOfTheHill spotId={spotId} />
<GhostClipViewer spotId={spotId} />
```

#### In MapScreen.tsx:
```typescript
import MapFilters from '../components/MapFilters';
import SpotMarker from '../components/SpotMarker';

const [filterModalVisible, setFilterModalVisible] = useState(false);
const [filters, setFilters] = useState({
  park: true,
  street: true,
  diy: true,
  quest: true,
  shop: true,
});

// Filter spots based on selected types
const filteredSpots = spots.filter(spot => filters[spot.spot_type]);

// Use SpotMarker for custom markers
<SpotMarker
  spotType={spot.spot_type}
  hasBondoAlert={spot.status === 'bondo_needed'}
  crewColor={spot.crew?.color_hex}
/>
```

#### In ProfileScreen.tsx:
```typescript
import HotStreakBadge from '../components/HotStreakBadge';

// At the top of profile:
<HotStreakBadge />
```

#### In ChallengesScreen.tsx:
```typescript
import BountyBadge from '../components/BountyBadge';

// Next to each challenge:
<BountyBadge challengeId={challenge.id} baseXP={challenge.xp_reward} />
```

#### In FeedScreen.tsx (or create new):
```typescript
import ActivityFeed from '../components/ActivityFeed';

export default function FeedScreen() {
  return <ActivityFeed />;
}
```

#### In ShopsScreen.tsx:
```typescript
import RedeemModal from '../components/RedeemModal';

const [redeemModalVisible, setRedeemModalVisible] = useState(false);
const [selectedDeal, setSelectedDeal] = useState(null);

<RedeemModal
  visible={redeemModalVisible}
  dealId={selectedDeal?.id}
  dealTitle={selectedDeal?.title}
  onClose={() => setRedeemModalVisible(false)}
/>
```

---

## 🎯 FEATURE DETAILS

### Judge's Booth
- TikTok-style video voting
- STOMPED = approve, BAIL = reject
- 10 XP per vote, 50 XP bonus every 5 votes
- Auto-approve at 10 STOMPED votes
- Auto-reject at 3 BAIL votes

### Spot Types
- 🛹 **Park** - Skate parks
- 🏙️ **Street** - Street spots (has bust risk)
- 🔨 **DIY** - DIY spots
- 📱 **Quest** - QR geocache spots
- 🛒 **Shop** - Skate shops

### Obstacles
Stairs, Handrail, Flatbar, Ledge, Hubba, Manual Pad, Quarterpipe, Bowl, Gap, Wallride

### Bust Risk (Street only)
- 😎 **Low** (Chill) - Green
- 👀 **Medium** (Watch Out) - Orange
- 🚨 **High** (Immediate Bust) - Red

### Territory Control
- Crews battle for spot ownership
- Costs 100 XP to add territory points
- Crew with most points owns the spot
- Map markers show crew colors

### King of the Hill
- Individual users claim spots with trick videos
- Watch current king's video
- Challenge to dethrone
- Record video to claim throne

### QR Geocaching
- Physical QR codes at spots
- Must be within 15 meters to scan
- Awards 50 XP
- Unlocks ghost clips

### Ghost Clips
- Hidden videos at QR spots
- Unlock by scanning QR code
- View secret skate footage

### Bounty System
- Challenges gain 0.5x XP every 3 days uncompleted
- Max 5x multiplier (after 12 days)
- Shows as gold badge on challenges

### Hot Streak
- Daily challenge completion tracking
- 3+ days = fire aura 🔥
- Animated flames and glow effect

---

## 🗄️ DATABASE SCHEMA

All tables created in the migration:

- `challenge_submissions` - Video submissions for voting
- `submission_votes` - User votes (stomped/bail)
- `crew_territories` - Crew ownership points per spot
- `spot_claims` - King of the Hill claims
- `qr_scans` - QR code scan records
- `ghost_clips` - Unlockable videos
- `user_unlocks` - User's unlocked ghost clips
- `activity_feed` - Global activity stream
- `user_achievements` - Achievement triggers for confetti
- `shop_deals` - Shop discount deals
- `deal_redemptions` - User redemptions with codes
- `spot_status_updates` - Status alerts (Bondo/Security/Dry/Wet)
- `daily_hotspots` - 3x XP spots (rotates daily)
- `spot_reports` - User-reported issues

Updated tables:
- `skate_spots` - Added spot_type, obstacles, bust_risk, has_qr, crew_id, reputation_points
- `profiles` - Added daily_streak, last_daily_challenge

---

## 🎨 THEME COLORS

Match your existing theme:
- Primary: `#d2673d` (SkateQuest orange)
- Success: `#10b981` (Green)
- Warning: `#f59e0b` (Orange)
- Error: `#ef4444` (Red)
- Info: `#3b82f6` (Blue)
- Purple: `#8b5cf6` (Quests)

---

## ⚙️ CONFIGURATION

### Enable Confetti
Make sure to install the package:
```bash
bun add react-native-confetti-cannon
```

### QR Code Generation
For shop deals, install:
```bash
bun add react-native-qrcode-svg
```

### Daily Hotspot Cron Job
Set up a cron job to run daily:
```sql
SELECT refresh_daily_hotspot();
```

---

## 🐛 TROUBLESHOOTING

### Confetti not working?
- Check if `react-native-confetti-cannon` is installed
- Make sure ConfettiWrapper wraps your entire app
- Verify achievements are being inserted into `user_achievements` table

### QR Scanner not working?
- Grant camera permissions
- Grant location permissions
- Check GPS accuracy (must be within 15m)

### Map markers not showing crew colors?
- Verify `crew_id` is set on `skate_spots`
- Check crew has `color_hex` value
- Make sure SpotMarker receives `crewColor` prop

### No ghost clips unlocking?
- Verify ghost clip exists for spot
- Check QR scan was successful
- Ensure `user_unlocks` table has entry

---

## 📱 TESTING CHECKLIST

- [ ] Run database migration successfully
- [ ] Install npm packages
- [ ] Wrap app with ConfettiWrapper
- [ ] Add Judge's Booth screen to navigation
- [ ] Test adding spot with new fields
- [ ] Test QR scanning with GPS proximity
- [ ] Test crew territory capture
- [ ] Test King of the Hill claim
- [ ] Test map filters
- [ ] Test animated markers
- [ ] Test ghost clip unlock
- [ ] Test bounty badge display
- [ ] Test hot streak badge
- [ ] Test activity feed
- [ ] Test shop deal redemption

---

## 🎉 YOU'RE DONE!

All features from the Gemini vision are now implemented. The app has:

✅ 5 Spot Types
✅ Obstacle Tagging
✅ Bust Risk Levels
✅ QR Geocaching
✅ Daily Challenges (existing + streak tracking)
✅ Territory Control
✅ King of the Hill
✅ Judge's Booth
✅ Spot Status System
✅ Shop Integration
✅ Streak Tracking
✅ Ghost Clips
✅ Bounty System
✅ Map Filters
✅ Animated Markers
✅ Crew-Colored Markers

**Portal Dimension and Kevin are preserved!** All code was built on top of existing features.

---

## 🚀 NEXT STEPS

1. Run the migration SQL
2. Install the two npm packages
3. Integrate components into your screens
4. Test everything on your EAS Dev Client build
5. Push to production when ready!

Need help? The code is clean, commented, and follows React Native best practices.
