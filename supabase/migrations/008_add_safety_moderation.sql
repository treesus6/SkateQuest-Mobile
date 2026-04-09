-- Phase 5: Safety & Moderation

-- ============================================================================
-- USER REPORTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('abuse', 'harassment', 'inappropriate_content', 'fraud', 'spam', 'other')),
  reason TEXT NOT NULL,
  context TEXT,  -- E.g., message/post/profile that triggered report
  context_id TEXT,  -- ID of the reported content
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  moderator_notes TEXT,
  moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_reports_reported
  ON user_reports(reported_user_id);

CREATE INDEX IF NOT EXISTS idx_user_reports_reporter
  ON user_reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_user_reports_status
  ON user_reports(status) WHERE status = 'pending';

ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Reports: Users can view their own reports, admins can view all
CREATE POLICY "Users can view their own reports"
  ON user_reports FOR SELECT TO authenticated
  USING (
    reporter_id = auth.uid() OR
    reported_user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Reports: Users can submit reports
CREATE POLICY "Users can submit reports"
  ON user_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Reports: Admins can update reports
CREATE POLICY "Admins can update report status"
  ON user_reports FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- CONTENT MODERATION QUEUE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('message', 'post', 'profile', 'comment', 'review')),
  content_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_preview TEXT,  -- First 200 chars
  reason_flagged TEXT,  -- Why it was flagged (spam, profanity, etc)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  moderator_action TEXT,
  actioned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status
  ON content_moderation_queue(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_moderation_queue_user
  ON content_moderation_queue(user_id);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_content_type
  ON content_moderation_queue(content_type);

ALTER TABLE content_moderation_queue ENABLE ROW LEVEL SECURITY;

-- Moderation: Only admins can view queue
CREATE POLICY "Admins can view moderation queue"
  ON content_moderation_queue FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Moderation: Only admins can update
CREATE POLICY "Admins can update moderation decisions"
  ON content_moderation_queue FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- API RATE LIMITS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address INET,  -- For unauthenticated requests
  endpoint TEXT NOT NULL,  -- E.g., /api/spots/nearby
  request_count INT DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW(),
  window_end TIMESTAMP DEFAULT (NOW() + INTERVAL '1 hour'),
  is_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint
  ON api_rate_limits(user_id, endpoint, window_end) WHERE window_end > NOW();

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint
  ON api_rate_limits(ip_address, endpoint, window_end) WHERE window_end > NOW();

CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked
  ON api_rate_limits(is_blocked) WHERE is_blocked = true;

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Rate limits: Only admins and own user can view
CREATE POLICY "Users can view their rate limit status"
  ON api_rate_limits FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- SUSPICIOUS LOCATIONS TABLE (Fraud detection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS suspicious_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  address TEXT,
  check_in_count INT DEFAULT 1,
  last_seen TIMESTAMP DEFAULT NOW(),
  flagged_at TIMESTAMP,
  is_whitelisted BOOLEAN DEFAULT false,
  moderator_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suspicious_locations_user
  ON suspicious_locations(user_id);

CREATE INDEX IF NOT EXISTS idx_suspicious_locations_flagged
  ON suspicious_locations(flagged_at) WHERE flagged_at IS NOT NULL;

-- Suspicious locations use geo_index for nearby searches
CREATE INDEX IF NOT EXISTS idx_suspicious_locations_geo_point
  ON suspicious_locations USING GIST (ll_to_earth(latitude, longitude));

ALTER TABLE suspicious_locations ENABLE ROW LEVEL SECURITY;

-- Suspicious locations: Only admins can view
CREATE POLICY "Admins can view suspicious locations"
  ON suspicious_locations FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- FUNCTION: Report user (with duplicate check)
-- ============================================================================

CREATE OR REPLACE FUNCTION report_user(
  p_reporter_id UUID,
  p_reported_user_id UUID,
  p_report_type TEXT,
  p_reason TEXT,
  p_context TEXT,
  p_context_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id UUID;
  v_existing_report UUID;
BEGIN
  -- Check for duplicate recent reports
  SELECT id INTO v_existing_report
  FROM user_reports
  WHERE reporter_id = p_reporter_id
    AND reported_user_id = p_reported_user_id
    AND created_at > NOW() - INTERVAL '24 hours'
    AND status = 'pending'
  LIMIT 1;

  IF v_existing_report IS NOT NULL THEN
    RETURN v_existing_report;  -- Return existing report instead of creating duplicate
  END IF;

  -- Create new report
  INSERT INTO user_reports (reporter_id, reported_user_id, report_type, reason, context, context_id)
  VALUES (p_reporter_id, p_reported_user_id, p_report_type, p_reason, p_context, p_context_id)
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

-- ============================================================================
-- FUNCTION: Check rate limit
-- ============================================================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_ip_address INET,
  p_endpoint TEXT,
  p_limit INT = 100,
  p_window_minutes INT = 60
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count INT;
  v_window_start TIMESTAMP;
  v_is_blocked BOOLEAN;
  v_window_end TIMESTAMP;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  v_window_end := NOW() + (p_window_minutes || ' minutes')::INTERVAL;

  -- Get current count for this user/ip + endpoint
  SELECT COUNT(*) INTO v_current_count
  FROM api_rate_limits
  WHERE (user_id = p_user_id OR ip_address = p_ip_address)
    AND endpoint = p_endpoint
    AND window_end > NOW();

  -- Check if blocked
  SELECT is_blocked INTO v_is_blocked
  FROM api_rate_limits
  WHERE (user_id = p_user_id OR ip_address = p_ip_address)
    AND endpoint = p_endpoint
    AND is_blocked = true
  LIMIT 1;

  IF v_is_blocked THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'User/IP is blocked',
      'current_count', v_current_count,
      'limit', p_limit
    );
  END IF;

  IF v_current_count >= p_limit THEN
    -- Block user
    UPDATE api_rate_limits
    SET is_blocked = true,
        block_reason = 'Rate limit exceeded'
    WHERE (user_id = p_user_id OR ip_address = p_ip_address)
      AND endpoint = p_endpoint;

    RETURN json_build_object(
      'allowed', false,
      'reason', 'Rate limit exceeded',
      'current_count', v_current_count,
      'limit', p_limit
    );
  END IF;

  -- Increment counter
  INSERT INTO api_rate_limits (user_id, ip_address, endpoint, window_start, window_end)
  VALUES (p_user_id, p_ip_address, p_endpoint, v_window_start, v_window_end)
  ON CONFLICT (user_id, endpoint, window_start) DO UPDATE
  SET request_count = api_rate_limits.request_count + 1;

  RETURN json_build_object(
    'allowed', true,
    'current_count', v_current_count + 1,
    'limit', p_limit
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Flag suspicious location (spam check)
-- ============================================================================

CREATE OR REPLACE FUNCTION flag_suspicious_location(
  p_user_id UUID,
  p_latitude FLOAT,
  p_longitude FLOAT,
  p_address TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_location UUID;
  v_check_in_count INT;
BEGIN
  -- Check for existing location within 500m radius
  SELECT id INTO v_existing_location
  FROM suspicious_locations
  WHERE user_id = p_user_id
    AND earth_distance(ll_to_earth(p_latitude, p_longitude), ll_to_earth(latitude, longitude)) < 500  -- 500m
  LIMIT 1;

  IF v_existing_location IS NOT NULL THEN
    -- Increment count
    UPDATE suspicious_locations
    SET check_in_count = check_in_count + 1,
        last_seen = NOW()
    WHERE id = v_existing_location
    RETURNING check_in_count INTO v_check_in_count;
  ELSE
    -- Create new suspicious location marker
    INSERT INTO suspicious_locations (user_id, latitude, longitude, address)
    VALUES (p_user_id, p_latitude, p_longitude, p_address)
    RETURNING check_in_count INTO v_check_in_count;
  END IF;

  RETURN json_build_object(
    'flagged', true,
    'check_in_count', v_check_in_count
  );
END;
$$;

-- ============================================================================
-- TRIGGER: Cleanup expired rate limits
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM api_rate_limits
  WHERE window_end <= NOW();
  RETURN NULL;
END;
$$;

CREATE TRIGGER tr_cleanup_expired_rate_limits
BEFORE INSERT ON api_rate_limits
EXECUTE FUNCTION cleanup_expired_rate_limits();
