-- Enable pg_trgm extension for efficient LIKE/ILIKE queries
-- This extension provides trigram matching which significantly speeds up text searches

CREATE EXTENSION IF NOT EXISTS pg_trgm;
