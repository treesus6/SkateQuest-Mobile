# SkateQuest - Supabase Setup Guide

## Database Setup

1. Go to your Supabase project: https://hreeuqdgrwvnxquxohod.supabase.co
2. Click "SQL Editor" in the left sidebar
3. Run the following SQL files in order:

### Step 1: Core Database Setup
Copy and run the contents of `database-setup-complete.sql`
This creates all the core tables (users, spots, challenges, shops, crews, events).

### Step 2: New Features Database Setup
Copy and run the contents of `database-new-features.sql`
This adds all the new feature tables:
- Media uploads (photos & videos)
- Social activity feed
- Trick progress tracker
- SKATE game mode
- Spot conditions
- Session playlists
- Likes & interactions

## Storage Buckets Setup

You need to create storage buckets for media uploads.

### Create Buckets

1. Go to "Storage" in your Supabase dashboard
2. Click "New bucket"
3. Create these buckets:

#### Bucket 1: photos
- Name: `photos`
- Public bucket: ✅ YES
- File size limit: 5MB
- Allowed MIME types: image/jpeg, image/png, image/jpg

#### Bucket 2: videos
- Name: `videos`
- Public bucket: ✅ YES
- File size limit: 50MB
- Allowed MIME types: video/mp4, video/quicktime

### Set Bucket Policies

For both buckets, set these policies:

```sql
-- Allow anyone to view files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'photos' ); -- or 'videos'

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos' -- or 'videos'
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'photos' -- or 'videos'
  AND auth.uid() = owner
);
```

## Environment Variables

Make sure your `.env` file has:

```
EXPO_PUBLIC_SUPABASE_URL=https://hreeuqdgrwvnxquxohod.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your_anon_key_here
```

## Testing

After setup, test these features:
1. Upload a photo in the app
2. Upload a video
3. View the social feed
4. Add a trick to track
5. Create a SKATE game challenge
6. Share a playlist

All media should upload successfully and be viewable in the app!
