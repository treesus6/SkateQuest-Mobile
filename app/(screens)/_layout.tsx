import { Stack } from 'expo-router';

// All feature screens pushed on top of the tabs
// headerShown: false by default — screens that want a header set their own title
export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#05070B' },
        headerTintColor: '#F3F4F6',
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: '',
      }}
    >
      {/* headerShown: true screens */}
      <Stack.Screen name="feed"               options={{ title: 'Activity Feed' }} />
      <Stack.Screen name="leaderboard"        options={{ title: 'Leaderboard' }} />
      <Stack.Screen name="trick-tracker"      options={{ title: 'Trick Tracker' }} />
      <Stack.Screen name="skate-game"         options={{ title: 'SKATE Game' }} />
      <Stack.Screen name="game-detail"        options={{ title: 'Game' }} />
      <Stack.Screen name="playlists"          options={{ title: 'Session Playlists' }} />
      <Stack.Screen name="shops"              options={{ title: 'Skate Shops' }} />
      <Stack.Screen name="crews"              options={{ title: 'Crews' }} />
      <Stack.Screen name="events"             options={{ title: 'Events' }} />
      <Stack.Screen name="qr-scanner"         options={{ title: 'Scan QR' }} />
      <Stack.Screen name="upload-media"       options={{ title: 'Upload Media' }} />
      <Stack.Screen name="add-spot"           options={{ title: 'Add Spot' }} />
      <Stack.Screen name="spot-detail"        options={{ title: 'Spot Detail' }} />
      <Stack.Screen name="challenges"         options={{ title: 'Challenges' }} />
      <Stack.Screen name="call-outs"          options={{ title: 'Call Outs' }} />
      <Stack.Screen name="judges-booth"       options={{ title: "Judge's Booth" }} />
      <Stack.Screen name="sessions"           options={{ title: 'Sessions' }} />
      <Stack.Screen name="xp-rewards"         options={{ title: 'XP Rewards' }} />
      <Stack.Screen name="gopro-import"       options={{ title: 'Import from GoPro' }} />
      <Stack.Screen name="achievements"       options={{ title: 'Achievements' }} />
      <Stack.Screen name="ai-coach"           options={{ title: 'AI Coach' }} />
      <Stack.Screen name="bounty-board"       options={{ title: 'Bounty Board' }} />
      <Stack.Screen name="changelog"          options={{ title: "What's New" }} />
      <Stack.Screen name="daily-quests"       options={{ title: 'Daily Quests' }} />
      <Stack.Screen name="demo-day"           options={{ title: 'Demo Day' }} />
      <Stack.Screen name="live-check-in"      options={{ title: 'Live Check-In' }} />
      <Stack.Screen name="mentorship-list"    options={{ title: 'Mentors' }} />
      <Stack.Screen name="messages"           options={{ title: 'Messages' }} />
      <Stack.Screen name="moderation-queue"   options={{ title: 'Moderation' }} />
      <Stack.Screen name="notifications"      options={{ title: 'Notifications' }} />
      <Stack.Screen name="referral"           options={{ title: 'Invite Friends' }} />
      <Stack.Screen name="scene"              options={{ title: 'Local Scene' }} />
      <Stack.Screen name="seasonal-events"    options={{ title: 'Seasonal Events' }} />
      <Stack.Screen name="skate-passport"     options={{ title: 'Skate Passport' }} />
      <Stack.Screen name="skate-forecast"     options={{ title: 'Skate Forecast' }} />
      <Stack.Screen name="spot-claims"        options={{ title: 'Spot Claims' }} />
      <Stack.Screen name="trick-of-week"      options={{ title: 'Trick of the Week' }} />
      <Stack.Screen name="spots"              options={{ title: 'Spots' }} />

      {/* headerShown: false screens (full-screen / immersive) */}
      <Stack.Screen name="skate-tv"           options={{ headerShown: false }} />
      <Stack.Screen name="spot-reviews"       options={{ headerShown: false }} />
      <Stack.Screen name="check-in"           options={{ headerShown: false }} />
      <Stack.Screen name="crew-battles"       options={{ headerShown: false }} />
      <Stack.Screen name="mentorship"         options={{ headerShown: false }} />
      <Stack.Screen name="trick-bingo"        options={{ headerShown: false }} />
      <Stack.Screen name="spot-conquer"       options={{ headerShown: false }} />
      <Stack.Screen name="seasonal-pass"      options={{ headerShown: false }} />
      <Stack.Screen name="streaks"            options={{ headerShown: false }} />
      <Stack.Screen name="weather-spots"      options={{ headerShown: false }} />
      <Stack.Screen name="hidden-gems"        options={{ headerShown: false }} />
      <Stack.Screen name="spot-of-the-day"    options={{ headerShown: false }} />
      <Stack.Screen name="clip-of-week"       options={{ headerShown: false }} />
      <Stack.Screen name="trick-tutorials"    options={{ headerShown: false }} />
      <Stack.Screen name="donate-xp"          options={{ headerShown: false }} />
      <Stack.Screen name="sponsor-leaderboard" options={{ headerShown: false }} />
      <Stack.Screen name="active-session"     options={{ headerShown: false }} />
      <Stack.Screen name="hide-qr-code"       options={{ headerShown: false }} />
    </Stack>
  );
}
