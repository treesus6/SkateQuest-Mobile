# SkateQuest-Mobile — Claude Code Instructions

## Project Overview

React Native / Expo app mapping 27,000+ skateparks worldwide. Built for the global skateboarding community with social features, XP/gamification, video challenges, crew battles, and skatepark discovery.

Developer environment: Termux on Android / Chromebook Linux, terminal-only workflow.

## Tech Stack

- Framework: Expo SDK 54 (NOT bare React Native CLI)
- Language: TypeScript
- Navigation: React Navigation v6 (bottom tabs + native stack)
- Backend: Supabase (auth, database, storage, realtime)
- Database: PostgreSQL with PostGIS for geospatial queries
- Maps: @rnmapbox/maps
- Styling: NativeWind v4
- Error Tracking: @sentry/react-native ~7.2.0

## Critical Rules

- NEVER edit ios/ or android/ folders manually
- NEVER use react-native link
- NEVER use div/span/p — use View/Text/ScrollView
- NEVER use absolute positioning — use Flexbox
- Always pass AsyncStorage explicitly to Supabase client
- Always use RPC functions for skatepark geo queries (27k parks)
- Use NativeWind className for all styling

## Supabase Auth Fix

import AsyncStorage from '@react-native-async-storage/async-storage'
export const supabase = createClient(URL, KEY, {
auth: {
storage: AsyncStorage,
autoRefreshToken: true,
persistSession: true,
detectSessionInUrl: false,
},
})

## Build Commands

npx expo start 2>&1 | tee logs/expo.log
eas build --platform android --profile preview
eas update --branch production --message "fix description"

## Mission

Donate profits to help kids who cant afford skateboards. Build for skaters, by skaters.
