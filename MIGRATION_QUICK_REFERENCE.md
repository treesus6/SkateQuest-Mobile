# SkateQuest: Firebase → Supabase Quick Reference

## Import Helpers

```javascript
import {
  signInAnonymously,
  onAuthStateChanged,
  getProfile,
  updateProfile,
  incrementUserXP,
  getAllSpots,
  addSpot,
  // ... etc
} from './supabase-helpers.js';
```

## Authentication

### Sign In

**Before:**

```javascript
await signInAnonymously(auth);
```

**After:**

```javascript
const { user } = await signInAnonymously();
```

### Auth State

**Before:**

```javascript
onAuthStateChanged(auth, user => {
  if (user) currentUserId = user.uid;
});
```

**After:**

```javascript
onAuthStateChanged(user => {
  if (user) currentUserId = user.id; // Note: id not uid
});
```

## Profiles

### Get Profile

**Before:**

```javascript
const docSnap = await getDoc(doc(db, `/artifacts/${appId}/users/${userId}/profile/data`));
const profile = docSnap.data();
```

**After:**

```javascript
const profile = await getProfile(userId);
```

### Update Profile

**Before:**

```javascript
await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/profile/data`), {
  username: 'NewName',
});
```

**After:**

```javascript
await updateProfile(userId, { username: 'NewName' });
```

### Increment XP

**Before:**

```javascript
await updateDoc(doc(db, profilePath), { xp: increment(100) });
```

**After:**

```javascript
await incrementUserXP(userId, 100);
```

## Skate Spots

### Get All Spots

**Before:**

```javascript
const snapshot = await getDocs(collection(db, `/artifacts/${appId}/skate_spots`));
const spots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

**After:**

```javascript
const spots = await getAllSpots();
```

### Add Spot

**Before:**

```javascript
await addDoc(collection(db, `/artifacts/${appId}/skate_spots`), {
  name: 'Venice Park',
  latitude: 33.98,
  longitude: -118.46,
  addedBy: currentUserId,
  createdAt: serverTimestamp(),
});
```

**After:**

```javascript
await addSpot({
  name: 'Venice Park',
  latitude: 33.98,
  longitude: -118.46,
  added_by: currentUserId, // Note: snake_case
  created_at: serverTimestamp(),
});
```

## Crews

### Get All Crews

**Before:**

```javascript
const snapshot = await getDocs(collection(db, `/artifacts/${appId}/crews`));
const crews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

**After:**

```javascript
const crews = await getAllCrews();
```

### Create Crew

**Before:**

```javascript
const crewRef = await addDoc(collection(db, `/artifacts/${appId}/crews`), crewData);
```

**After:**

```javascript
const crew = await createCrew(crewData);
```

## Events

### Get Upcoming Events

**Before:**

```javascript
const q = query(
  collection(db, `/artifacts/${appId}/events`),
  orderBy('datetime', 'desc'),
  limit(10)
);
const snapshot = await getDocs(q);
```

**After:**

```javascript
const events = await getAllEvents(); // Already filtered & sorted
```

## Sessions

### Get User Sessions

**Before:**

```javascript
const sessionsQuery = query(
  collection(db, `/artifacts/${appId}/users/${userId}/sessions`),
  orderBy('endTime', 'desc'),
  limit(10)
);
const snapshot = await getDocs(sessionsQuery);
```

**After:**

```javascript
const sessions = await getUserSessions(userId, 10);
```

### Create Session

**Before:**

```javascript
await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/sessions`), sessionData);
```

**After:**

```javascript
await createSession(sessionData);
```

## Real-Time Subscriptions

### Subscribe to Profile

**Before:**

```javascript
onSnapshot(doc(db, profilePath), doc => {
  userProfile = doc.data();
});
```

**After:**

```javascript
subscribeToProfile(userId, profile => {
  userProfile = profile;
});
```

### Subscribe to Spots

**Before:**

```javascript
onSnapshot(collection(db, spotsPath), snapshot => {
  skateSpots = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
});
```

**After:**

```javascript
subscribeToSpots(payload => {
  if (payload.eventType === 'INSERT') {
    skateSpots.push(payload.new);
  }
  // Handle UPDATE, DELETE...
});
```

## Storage

### Upload Image

**Before:**

```javascript
const storageRef = ref(storage, `spot-photos/${fileName}`);
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);
```

**After:**

```javascript
const url = await uploadImage('spot-photos', fileName, file);
```

## Field Name Changes

| Firebase (camelCase) | Supabase (snake_case) |
| -------------------- | --------------------- |
| `spotsAdded`         | `spots_added`         |
| `crewId`             | `crew_id`             |
| `crewTag`            | `crew_tag`            |
| `trickProgress`      | `trick_progress`      |
| `activeSession`      | `active_session`      |
| `addedBy`            | `added_by`            |
| `createdAt`          | `created_at`          |
| `totalXP`            | `total_xp`            |

## Common Patterns

### Check if Data Exists

**Before:**

```javascript
if (docSnap.exists()) {
  const data = docSnap.data();
}
```

**After:**

```javascript
if (profile) {
  // use profile directly
}
```

### Timestamp

**Before:**

```javascript
createdAt: serverTimestamp();
```

**After:**

```javascript
created_at: serverTimestamp(); // Returns ISO string
```

### User ID

**Before:**

```javascript
user.uid;
```

**After:**

```javascript
user.id;
```

## Tips

1. **Use the helpers!** They handle the complexity for you
2. **Check field names** - Supabase uses snake_case
3. **Test incrementally** - Migrate one section at a time
4. **Use real-time** - Supabase real-time is built-in and fast
5. **Check RLS policies** - Make sure your policies allow the operations

## Need Help?

See `app-supabase-example.js` for complete working examples!
