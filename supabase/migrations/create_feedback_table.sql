-- Create feedback table for user submissions from website and app
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Contact info
    name TEXT NOT NULL,
    email TEXT NOT NULL,

    -- Feedback details
    subject TEXT NOT NULL CHECK (subject IN ('bug', 'feature', 'feedback', 'support', 'other')),
    message TEXT NOT NULL,

    -- Metadata
    source TEXT DEFAULT 'website' CHECK (source IN ('website', 'app', 'email')),
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

    -- Admin response
    response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    responded_by UUID REFERENCES auth.users(id),

    -- App-specific data (if submitted from app)
    user_id UUID REFERENCES auth.users(id),
    app_version TEXT,
    device_info JSONB,

    -- Search
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(name, '') || ' ' || coalesce(message, ''))
    ) STORED
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_subject ON feedback(subject);
CREATE INDEX IF NOT EXISTS idx_feedback_email ON feedback(email);
CREATE INDEX IF NOT EXISTS idx_feedback_search ON feedback USING GIN(search_vector);

-- RLS Policies
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback (website forms)
CREATE POLICY "Allow public insert" ON feedback
    FOR INSERT
    WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON feedback
    FOR SELECT
    USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'admin');

-- Admin can view all feedback
CREATE POLICY "Admin can view all feedback" ON feedback
    FOR SELECT
    USING (auth.jwt()->>'role' = 'admin');

-- Admin can update feedback
CREATE POLICY "Admin can update feedback" ON feedback
    FOR UPDATE
    USING (auth.jwt()->>'role' = 'admin');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to send email notification on new feedback
CREATE OR REPLACE FUNCTION notify_new_feedback()
RETURNS TRIGGER AS $$
BEGIN
    -- This will be caught by a webhook or edge function
    PERFORM pg_notify('new_feedback', json_build_object(
        'id', NEW.id,
        'email', NEW.email,
        'subject', NEW.subject,
        'name', NEW.name,
        'created_at', NEW.created_at
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_feedback_created
    AFTER INSERT ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_feedback();

-- Create view for admin dashboard
CREATE OR REPLACE VIEW feedback_stats AS
SELECT
    COUNT(*) FILTER (WHERE status = 'new') as new_count,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7d,
    COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
    AVG(EXTRACT(EPOCH FROM (responded_at - created_at))/3600)::INTEGER as avg_response_hours
FROM feedback;

COMMENT ON TABLE feedback IS 'User feedback, bug reports, and support requests from website and app';
COMMENT ON VIEW feedback_stats IS 'Real-time statistics for admin dashboard';
