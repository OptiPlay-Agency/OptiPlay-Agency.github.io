-- ====================================================
-- LOL COMPOSITIONS TABLE - Creation and Fix
-- ====================================================

-- Drop the table if it exists to ensure clean creation
DROP TABLE IF EXISTS lol_compositions CASCADE;

-- Create lol_compositions table
CREATE TABLE lol_compositions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    composition_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_lol_compositions_team_id ON lol_compositions(team_id);
CREATE INDEX idx_lol_compositions_created_at ON lol_compositions(created_at DESC);

-- Enable RLS
ALTER TABLE lol_compositions ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and recreate it
DROP POLICY IF EXISTS "Users can manage compositions of their teams" ON lol_compositions;

-- RLS Policy: Users can only see compositions of teams they belong to
CREATE POLICY "Users can manage compositions of their teams"
ON lol_compositions
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = lol_compositions.team_id
        AND tm.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = lol_compositions.team_id
        AND tm.user_id = auth.uid()
    )
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON lol_compositions TO authenticated;

-- Verify table creation
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'lol_compositions' 
ORDER BY ordinal_position;

-- Force schema cache refresh by selecting from the table
SELECT COUNT(*) as total_compositions FROM lol_compositions;

SELECT 'LoL Compositions table created successfully!' as status;