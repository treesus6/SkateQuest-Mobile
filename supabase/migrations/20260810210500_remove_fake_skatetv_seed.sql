-- Production cleanup: remove the legacy demo/seed SkateTV rows.
-- Real user uploads are not matched by these seed URLs.
DELETE FROM public.skatetv_clips
WHERE video_url IN (
  'https://www.youtube.com/watch?v=SaRjPpEZfP0',
  'https://www.youtube.com/watch?v=5Ln_tGLCgxs',
  'https://www.youtube.com/watch?v=MjKMvVYkVHY',
  'https://www.youtube.com/watch?v=Tq_yXl_m7LM',
  'https://www.youtube.com/watch?v=DEuGP_PK2dI',
  'https://www.youtube.com/watch?v=nPMSHm0UiYY',
  'https://www.youtube.com/watch?v=FtaLUrJLFVQ',
  'https://www.youtube.com/watch?v=dj7Ld5jK7PQ',
  'https://www.youtube.com/watch?v=L_c99JqnCuw',
  'https://www.youtube.com/watch?v=7BKbXQQ5MoQ'
);
