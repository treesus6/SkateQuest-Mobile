# Push Notifications Setup Guide

This guide explains how to set up push notifications for SkateQuest Mobile, specifically for SKATE game turn notifications.

## Installation

1. Install the expo-notifications package:
```bash
npm install expo-notifications expo-device
```

2. Update app.json to include notification settings:
```json
{
  "expo": {
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#d2673d",
      "androidMode": "default",
      "androidCollapsedTitle": "SkateQuest"
    },
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    }
  }
}
```

## Database Migration

Add push_token column to users table in Supabase:

```sql
-- Add push token column
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(push_token);
```

## Usage in App

### 1. Register for Notifications

In your AuthContext or App.tsx, register for push notifications after login:

```typescript
import { registerForPushNotifications, savePushToken } from './lib/notifications';

// After successful login
const token = await registerForPushNotifications();
if (token && user) {
  await savePushToken(user.id, token);
}
```

### 2. Handle Notification Responses

Listen for notification taps and navigate accordingly:

```typescript
import { addNotificationResponseListener } from './lib/notifications';
import { useEffect } from 'react';

useEffect(() => {
  const subscription = addNotificationResponseListener((response) => {
    const data = response.notification.request.content.data;

    if (data.type === 'game_turn' || data.type === 'game_challenge') {
      navigation.navigate('GameDetail', { gameId: data.gameId });
    }
  });

  return () => subscription.remove();
}, []);
```

### 3. Send Notifications on Game Events

Update GameDetailScreen to send notifications:

```typescript
import { notifyGameTurn } from '../lib/notifications';

// After submitting a turn
const { error: updateError } = await supabase
  .from('skate_games')
  .update({ current_turn: opponentId })
  .eq('id', gameId);

// Send notification to opponent
await notifyGameTurn(user.username, gameId);
```

## Production Setup (Expo Push Service)

For production, you'll need to:

1. **Get Expo Project ID**
   - Run `expo whoami` to verify login
   - Run `eas build:configure` to set up EAS
   - Note your project ID from app.json

2. **Update notification.ts**
   Replace `'your-expo-project-id'` with your actual project ID:
   ```typescript
   const token = (await Notifications.getExpoPushTokenAsync({
     projectId: 'your-actual-project-id',
   })).data;
   ```

3. **Server-Side Notifications (Optional)**

   For server-triggered notifications, create an Edge Function in Supabase:

   ```typescript
   // supabase/functions/send-game-notification/index.ts
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

   serve(async (req) => {
     const { pushToken, title, body, data } = await req.json();

     const message = {
       to: pushToken,
       sound: 'default',
       title,
       body,
       data,
     };

     const response = await fetch('https://exp.host/--/api/v2/push/send', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Accept': 'application/json',
       },
       body: JSON.stringify(message),
     });

     return new Response(JSON.stringify(await response.json()), {
       headers: { 'Content-Type': 'application/json' },
     });
   });
   ```

4. **Database Trigger for Automatic Notifications**

   Create a Supabase Edge Function trigger:

   ```sql
   -- Trigger function to notify on turn change
   CREATE OR REPLACE FUNCTION notify_game_turn()
   RETURNS TRIGGER AS $$
   DECLARE
     opponent_token TEXT;
     opponent_username TEXT;
   BEGIN
     -- Only proceed if current_turn changed
     IF OLD.current_turn IS DISTINCT FROM NEW.current_turn THEN
       -- Get opponent's push token and username
       SELECT push_token, username INTO opponent_token, opponent_username
       FROM users
       WHERE id = NEW.current_turn;

       -- Call Edge Function to send notification
       IF opponent_token IS NOT NULL THEN
         PERFORM net.http_post(
           url := 'https://your-project.supabase.co/functions/v1/send-game-notification',
           headers := jsonb_build_object('Content-Type', 'application/json'),
           body := jsonb_build_object(
             'pushToken', opponent_token,
             'title', '🎯 Your Turn!',
             'body', 'Time to respond in your SKATE game!',
             'data', jsonb_build_object('gameId', NEW.id, 'type', 'game_turn')
           )
         );
       END IF;
     END IF;

     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   -- Attach trigger
   CREATE TRIGGER on_game_turn_change
   AFTER UPDATE ON skate_games
   FOR EACH ROW
   EXECUTE FUNCTION notify_game_turn();
   ```

## Testing Notifications

### Local Testing

1. Run your app on a physical device (notifications don't work in simulators)
2. Grant notification permissions when prompted
3. Create a SKATE game and post a trick
4. Check that notification appears

### Test Commands

```typescript
// Test notification immediately
import { sendLocalNotification } from './lib/notifications';

await sendLocalNotification(
  'Test Notification',
  'This is a test from SkateQuest!',
  { test: true }
);
```

### Debug Issues

```typescript
// Check if device is physical
import * as Device from 'expo-device';
console.log('Is physical device:', Device.isDevice);

// Check permissions
import * as Notifications from 'expo-notifications';
const { status } = await Notifications.getPermissionsAsync();
console.log('Notification permission:', status);

// Check token
const token = await registerForPushNotifications();
console.log('Push token:', token);
```

## Notification Types in SkateQuest

| Type | Trigger | Action |
|------|---------|--------|
| `game_turn` | Opponent posts trick | Navigate to GameDetail |
| `game_challenge` | New game invitation | Navigate to GameDetail |
| `game_won` | Game completed (you won) | Navigate to GameDetail |
| `game_lost` | Game completed (you lost) | Navigate to GameDetail |

## Best Practices

1. **Always check permissions** before attempting to send notifications
2. **Test on physical devices** - emulators don't support push notifications
3. **Use notification channels** on Android for better UX
4. **Clear badges** when user views the relevant screen
5. **Respect quiet hours** - don't send game notifications late at night
6. **Unsubscribe from listeners** when components unmount

## Troubleshooting

### Notifications not appearing

- Check device is physical (not emulator)
- Verify permissions are granted
- Check notification settings in device Settings app
- Verify push token is saved to database
- Check Edge Function logs for errors

### Notifications not triggering navigation

- Ensure notification data includes required fields (gameId, type)
- Check navigation is set up correctly
- Verify listener is active when notification received

### Token not registering

- Verify Expo project ID is correct
- Check network connection
- Ensure app.json is properly configured
- Try logging out and back in

## Resources

- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Your SkateQuest app now has push notifications!** 🛹🔔

Users will be notified instantly when:
- It's their turn in a SKATE game
- They receive a new game challenge
- A game is completed (win/loss)
