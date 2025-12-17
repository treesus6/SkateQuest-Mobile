# Supabase Database Optimization Guide

This guide covers optimizing your Supabase database for SkateQuest.

## Database Indexes

### Recommended Indexes

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Skateparks table indexes
CREATE INDEX idx_skateparks_location ON skateparks USING GIST (location);
CREATE INDEX idx_skateparks_created_at ON skateparks (created_at DESC);
CREATE INDEX idx_skateparks_rating ON skateparks (rating DESC);

-- Media table indexes
CREATE INDEX idx_media_user_id ON media (user_id);
CREATE INDEX idx_media_skatepark_id ON media (skatepark_id);
CREATE INDEX idx_media_created_at ON media (created_at DESC);
CREATE INDEX idx_media_type ON media (type);
CREATE INDEX idx_media_trick_name ON media (trick_name);

-- Users table indexes
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_level ON users (level);

-- Challenges table indexes
CREATE INDEX idx_challenges_status ON challenges (status);
CREATE INDEX idx_challenges_difficulty ON challenges (difficulty);
CREATE INDEX idx_challenges_expiry ON challenges (expires_at);

-- Challenge completions indexes
CREATE INDEX idx_challenge_completions_user ON challenge_completions (user_id);
CREATE INDEX idx_challenge_completions_challenge ON challenge_completions (challenge_id);
CREATE INDEX idx_challenge_completions_score ON challenge_completions (score DESC);

-- Likes table indexes
CREATE INDEX idx_likes_media_id ON likes (media_id);
CREATE INDEX idx_likes_user_id ON likes (user_id);
CREATE UNIQUE INDEX idx_likes_unique ON likes (user_id, media_id);

-- Comments table indexes
CREATE INDEX idx_comments_media_id ON comments (media_id);
CREATE INDEX idx_comments_user_id ON comments (user_id);
CREATE INDEX idx_comments_created_at ON comments (created_at DESC);

-- Followers table indexes
CREATE INDEX idx_followers_follower_id ON followers (follower_id);
CREATE INDEX idx_followers_following_id ON followers (following_id);
CREATE UNIQUE INDEX idx_followers_unique ON followers (follower_id, following_id);
```

## Row Level Security (RLS)

### Enable RLS on all tables:

```sql
ALTER TABLE skateparks ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
```

### RLS Policies:

```sql
-- Skateparks: Public read, authenticated users can create
CREATE POLICY "Public skateparks are viewable by everyone"
  ON skateparks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create skateparks"
  ON skateparks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Media: Public read, users can manage their own
CREATE POLICY "Media is viewable by everyone"
  ON media FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own media"
  ON media FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media"
  ON media FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media"
  ON media FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users: Public read of basic info, users can update own profile
CREATE POLICY "Profiles are viewable by everyone"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Likes: Users can like, unlike, and see all likes
CREATE POLICY "Likes are viewable by everyone"
  ON likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like media"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike media"
  ON likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Comments: Public read, authenticated users can create, manage own
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

## Query Optimization

### Use `.select()` wisely

```typescript
// ❌ Bad: Fetching all columns
const { data } = await supabase.from('media').select('*');

// ✅ Good: Fetch only needed columns
const { data } = await supabase
  .from('media')
  .select('id, url, trick_name, user_id');
```

### Limit results

```typescript
// ❌ Bad: Fetching unlimited results
const { data } = await supabase.from('media').select('*');

// ✅ Good: Limit and paginate
const { data } = await supabase
  .from('media')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(20);
```

### Use proper joins

```typescript
// ✅ Good: Fetch related data in one query
const { data } = await supabase
  .from('media')
  .select(`
    *,
    user:users(id, username, avatar_url),
    skatepark:skateparks(id, name)
  `)
  .limit(20);
```

### Filter efficiently

```typescript
// ✅ Use indexes fields in WHERE clauses
const { data } = await supabase
  .from('media')
  .select('*')
  .eq('user_id', userId) // indexed
  .order('created_at', { ascending: false }) // indexed
  .limit(20);
```

## Database Functions

### Create optimized database functions for complex queries:

```sql
-- Function to get nearby skateparks
CREATE OR REPLACE FUNCTION nearby_skateparks(
  lat double precision,
  lng double precision,
  distance_km integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  latitude double precision,
  longitude double precision,
  distance_meters double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.latitude,
    s.longitude,
    ST_Distance(
      s.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_meters
  FROM skateparks s
  WHERE ST_DWithin(
    s.location::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    distance_km * 1000
  )
  ORDER BY distance_meters
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get user feed
CREATE OR REPLACE FUNCTION user_feed(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  type text,
  url text,
  trick_name text,
  created_at timestamptz,
  user_id uuid,
  username text,
  avatar_url text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.type,
    m.url,
    m.trick_name,
    m.created_at,
    m.user_id,
    u.username,
    u.avatar_url
  FROM media m
  JOIN users u ON m.user_id = u.id
  WHERE m.user_id IN (
    SELECT following_id
    FROM followers
    WHERE follower_id = p_user_id
  )
  OR m.user_id = p_user_id
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;
```

## Caching Strategy

### Use Realtime sparingly

```typescript
// ❌ Bad: Real-time for everything
supabase
  .from('media')
  .on('*', payload => {
    // This can be expensive
  })
  .subscribe();

// ✅ Good: Real-time only for critical updates
supabase
  .from('notifications')
  .on('INSERT', payload => {
    // Only for new notifications
  })
  .subscribe();
```

### Implement client-side caching

Use the offline cache utilities we created:

```typescript
import { fetchWithCache, CACHE_KEYS } from './lib/offlineCache';

// Fetch with automatic caching
const skateparks = await fetchWithCache(
  CACHE_KEYS.SKATEPARKS,
  () => supabase.from('skateparks').select('*')
);
```

## Storage Optimization

### Use proper bucket policies

```sql
-- Public bucket for avatars and media
CREATE POLICY "Public media is publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

-- Users can upload to their own folder
CREATE POLICY "Users can upload own media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

### Optimize file paths

```typescript
// ✅ Good: Organize by user and type
const filePath = `${userId}/videos/${timestamp}-${filename}`;

// Makes it easy to list/delete user's files
const { data } = await supabase.storage
  .from('media')
  .list(`${userId}/videos`);
```

## Monitoring & Maintenance

### Enable slow query logging

In Supabase Dashboard:
1. Go to Database → Settings
2. Enable "Log slow queries"
3. Set threshold to 1000ms (1 second)

### Regular maintenance

```sql
-- Analyze tables to update statistics
ANALYZE skateparks;
ANALYZE media;
ANALYZE users;

-- Reindex if needed
REINDEX TABLE media;
```

### Monitor table sizes

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Backup & Recovery

### Enable Point-in-Time Recovery (PITR)

In Supabase Dashboard:
1. Go to Database → Backups
2. Enable PITR
3. Set retention period (7-30 days recommended)

### Regular backups

```bash
# Export database (for local backup)
pg_dump -h your-project.supabase.co -U postgres -d postgres > backup.sql
```

## Performance Checklist

- [ ] All foreign key columns are indexed
- [ ] Created_at columns have descending indexes for recent queries
- [ ] Geographic columns use GIST indexes
- [ ] RLS policies are enabled and tested
- [ ] Slow queries are monitored and optimized
- [ ] Database functions are used for complex queries
- [ ] Client-side caching is implemented
- [ ] Realtime is used sparingly
- [ ] Storage buckets have proper policies
- [ ] Regular backups are configured

## Cost Optimization

### Free Tier Limits

- Database: 500MB
- Storage: 1GB
- Bandwidth: 2GB

### Tips to stay within limits:

1. **Compress images** before upload (done in Task 11)
2. **Delete old test data** regularly
3. **Use pagination** to limit data transfer
4. **Cache aggressively** on client side
5. **Monitor usage** in Supabase Dashboard

## Next Steps

1. Run the SQL commands above in Supabase SQL Editor
2. Test queries using EXPLAIN ANALYZE
3. Monitor query performance in Supabase Dashboard
4. Implement caching in your app using the offline utilities
5. Set up alerts for slow queries

Your database is now optimized for production!
