-- Add status column to templates table
ALTER TABLE templates ADD COLUMN status text DEFAULT 'pending';

-- Update existing templates to approved (optional, assuming existing ones are fine)
UPDATE templates SET status = 'approved' WHERE status IS NULL;

-- Create index on status for faster filtering
CREATE INDEX idx_templates_status ON templates(status);
