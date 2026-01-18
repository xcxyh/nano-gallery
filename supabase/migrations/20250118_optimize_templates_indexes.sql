-- Optimization: Create indexes for faster template queries
-- These indexes will significantly improve query performance for the gallery

-- Index for gallery queries (status + is_published + created_at)
CREATE INDEX IF NOT EXISTS idx_templates_gallery ON templates(status, is_published, created_at DESC NULLS LAST)
WHERE status = 'approved' AND is_published = true;

-- Index for user's library queries (owner_id + created_at)
CREATE INDEX IF NOT EXISTS idx_templates_library ON templates(owner_id, created_at DESC NULLS LAST);

-- Index for pending reviews (status + created_at)
CREATE INDEX IF NOT EXISTS idx_templates_pending ON templates(created_at DESC NULLS LAST)
WHERE status = 'pending';

-- GIN index for full-text search on title and prompt
-- This makes ILIKE searches much faster
CREATE INDEX IF NOT EXISTS idx_templates_search ON templates USING GIN (title gin_trgm_ops, prompt gin_trgm_ops);

-- Partial indexes for status filtering
CREATE INDEX IF NOT EXISTS idx_templates_status_approved ON templates(created_at DESC)
WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_templates_status_pending ON templates(created_at DESC)
WHERE status = 'pending';
