# SkateQuest: Firebase to Supabase Migration Guide

This guide will help you migrate SkateQuest from Firebase to Supabase.

---

## Step 1: Set Up Supabase Database

### 1.1 Run the Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/hreeuqdgrwvnxquxohod
2. Click **SQL Editor** in the left sidebar
3. Copy the entire contents of `supabase-schema.sql`
4. Paste into the SQL Editor and click **Run**
5. Wait for all tables and policies to be created

### 1.2 Fix the RLS Warning

The `spatial_ref_sys` warning is safe to ignore, but to fix it:

```sql
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on spatial_ref_sys"
ON public.spatial_ref_sys
FOR SELECT
TO public
USING (true);
```

### 1.3 Create Storage Buckets

1. Go to **Storage** in Supabase Dashboard
2. Create these buckets (if not created automatically by the SQL):
   - `spot-photos` (public)
   - `spot-videos` (public)
   - `challenge-proofs` (public)

### 1.4 Create RPC Functions for Increments

In SQL Editor, run:

```sql
-- Function to increment user XP
CREATE OR REPLACE FUNCTION increment_xp(user_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET xp = xp + amount,
        level = FLOOR((xp + amount) / 1000) + 1
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment crew XP
CREATE OR REPLACE FUNCTION increment_crew_xp(crew_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.crews
    SET total_xp = total_xp + amount
    WHERE id = crew_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment spots added
CREATE OR REPLACE FUNCTION increment_spots_added(user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET spots_added = spots_added + 1
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add member to crew
CREATE OR REPLACE FUNCTION add_crew_member(crew_id UUID, user_id UUID, username TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.crews
    SET
        members = array_append(members, user_id),
        member_names = array_append(member_names, username)
    WHERE id = crew_id
    AND NOT (user_id = ANY(members));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove member from crew
CREATE OR REPLACE FUNCTION remove_crew_member(crew_id UUID, user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.crews
    SET
        members = array_remove(members, user_id),
        member_names = array_remove(member_names, (
            SELECT username FROM public.profiles WHERE id = user_id
        ))
    WHERE id = crew_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Step 2: Get Your Supabase Credentials

1. Go to **Settings** > **API** in Supabase Dashboard
2. Copy these values:
   - **Project URL**: `https://hreeuqdgrwvnxquxohod.supabase.co`
   - **anon/public key**: (starts with `eyJ...`)

---

## Step 3: Update Your Code

### 3.1 Update `supabase-client.js`

Replace `YOUR_ANON_KEY_HERE` with your actual anon key from Step 2.

### 3.2 Update `index.html`

Replace the Firebase SDK script block with Supabase:

**Remove:**

```html
<!-- Firebase SDK -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  ...
</script>
```

**Add:**

```html
<!-- Supabase Client -->
<script type="module" src="supabase-client.js"></script>

<script type="module">
  // Import Supabase client
  import { supabase, onAuthStateChange, getCurrentUser } from './supabase-client.js';

  // Make supabase available globally
  window.supabase = supabase;
  window.onAuthStateChange = onAuthStateChange;
  window.getCurrentUser = getCurrentUser;
</script>
```

### 3.3 Update `app.js` - Replace Firebase Calls

Here are the key changes needed in `app.js`:

#### Authentication

**Before (Firebase):**

```javascript
onAuthStateChanged(auth, user => {
  if (user) {
    currentUserId = user.uid;
  }
});

await signInAnonymously(auth);
```

**After (Supabase):**

```javascript
onAuthStateChange(user => {
  if (user) {
    currentUserId = user.id;
  }
});

await supabase.auth.signInAnonymously();
```

#### Database Reads

**Before (Firebase):**

```javascript
const docSnap = await getDoc(doc(db, `/artifacts/${appId}/users/${userId}/profile/data`));
if (docSnap.exists()) {
  const data = docSnap.data();
}
```

**After (Supabase):**

```javascript
const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

if (data) {
  // use data
}
```

#### Database Writes

**Before (Firebase):**

```javascript
await setDoc(doc(db, `/artifacts/${appId}/users/${userId}/profile/data`), {
  username: 'TestUser',
  xp: 0,
});
```

**After (Supabase):**

```javascript
await supabase.from('profiles').upsert({
  id: userId,
  username: 'TestUser',
  xp: 0,
});
```

#### Increment Values

**Before (Firebase):**

```javascript
await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/profile/data`), {
  xp: increment(100),
});
```

**After (Supabase):**

```javascript
await supabase.rpc('increment_xp', {
  user_id: userId,
  amount: 100,
});
```

#### Real-time Subscriptions

**Before (Firebase):**

```javascript
onSnapshot(doc(db, `/artifacts/${appId}/users/${userId}/profile/data`), doc => {
  if (doc.exists()) {
    const data = doc.data();
  }
});
```

**After (Supabase):**

```javascript
supabase
  .channel('profile-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'profiles',
      filter: `id=eq.${userId}`,
    },
    payload => {
      const data = payload.new;
    }
  )
  .subscribe();
```

#### Queries with Filters

**Before (Firebase):**

```javascript
const q = query(
  collection(db, `/artifacts/${appId}/events`),
  orderBy('datetime', 'desc'),
  limit(10)
);
const snapshot = await getDocs(q);
```

**After (Supabase):**

```javascript
const { data, error } = await supabase
  .from('events')
  .select('*')
  .order('datetime', { ascending: false })
  .limit(10);
```

#### Storage

**Before (Firebase):**

```javascript
const storageRef = ref(storage, `spot-photos/${fileName}`);
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);
```

**After (Supabase):**

```javascript
const { data, error } = await supabase.storage.from('spot-photos').upload(fileName, file);

const url = supabase.storage.from('spot-photos').getPublicUrl(fileName).data.publicUrl;
```

---

## Step 4: Key Migration Points

### Table Mapping

Firebase Collections → Supabase Tables:

- `/artifacts/${appId}/users/{userId}/profile/data` → `profiles` table
- `/artifacts/${appId}/skate_spots` → `skate_spots` table
- `/artifacts/${appId}/crews` → `crews` table
- `/artifacts/${appId}/events` → `events` table
- `/artifacts/${appId}/users/{userId}/sessions` → `sessions` table
- `/artifacts/${appId}/trick_callouts` → `trick_callouts` table
- `shops` → `shops` table

### Field Name Changes

- Firebase uses camelCase, Supabase uses snake_case:
  - `spotsAdded` → `spots_added`
  - `crewId` → `crew_id`
  - `crewTag` → `crew_tag`
  - `trickProgress` → `trick_progress`
  - `activeSession` → `active_session`

### Authentication

- Firebase: `user.uid`
- Supabase: `user.id`

### Timestamps

- Firebase: `serverTimestamp()` returns a special object
- Supabase: Use `new Date().toISOString()` or PostgreSQL's `NOW()`

---

## Step 5: Testing Checklist

After migration, test these features:

- [ ] User can sign in (anonymous auth)
- [ ] User profile is created and displayed
- [ ] Can add a skate spot
- [ ] Can create a crew
- [ ] Can join/leave a crew
- [ ] Can start/end a session
- [ ] Can create an event
- [ ] Can RSVP to an event
- [ ] Can add a shop
- [ ] Trick tracking works
- [ ] Real-time updates work (if implemented)
- [ ] XP increments correctly
- [ ] Leaderboards display correctly

---

## Step 6: Performance Optimizations

### Enable PostGIS Optimization

```sql
-- Add spatial indexes (already in schema)
CREATE INDEX IF NOT EXISTS idx_skate_spots_location
ON public.skate_spots USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_shops_location
ON public.shops USING GIST(location);
```

### Create Materialized Views for Leaderboards

```sql
-- Refresh crew leaderboard periodically
CREATE MATERIALIZED VIEW crew_leaderboard_cached AS
SELECT * FROM crew_leaderboard;

-- Refresh it periodically (e.g., every hour)
-- Set up a cron job in Supabase Dashboard
```

---

## Troubleshooting

### RLS Policies Blocking Access?

Check policies in Supabase Dashboard > Authentication > Policies

### Real-time Not Working?

Enable Replication for your tables in Supabase Dashboard > Database > Replication

### Slow Queries?

Check indexes in Supabase Dashboard > Database > Query Performance

---

## Benefits of Supabase over Firebase

✅ **PostgreSQL** - More powerful queries, joins, views
✅ **PostGIS** - Native geographic/mapping support
✅ **RLS Policies** - Granular security at database level
✅ **Direct SQL** - Write custom queries when needed
✅ **Better pricing** - More generous free tier
✅ **Open source** - Can self-host if needed

---

## Need Help?

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- SkateQuest Issues: (your GitHub repo)

Happy skating! 🛹
