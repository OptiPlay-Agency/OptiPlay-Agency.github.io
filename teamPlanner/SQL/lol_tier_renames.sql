-- ========================================
-- CREATE TIER RENAMES TABLE FOR LOL
-- ========================================

-- Drop existing table
DROP TABLE IF EXISTS lol_tier_renames CASCADE;

-- Create tier renames table (for default tiers S/A/B/C)
CREATE TABLE lol_tier_renames (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    tier_id TEXT NOT NULL, -- 'S', 'A', 'B', or 'C'
    custom_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, tier_id)
);

-- Enable RLS
ALTER TABLE lol_tier_renames ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view tier renames of their teams"
    ON lol_tier_renames FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_tier_renames.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_tier_renames.team_id
            AND teams.created_by = auth.uid()
        )
    );

CREATE POLICY "Team members can insert tier renames"
    ON lol_tier_renames FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_tier_renames.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_tier_renames.team_id
            AND teams.created_by = auth.uid()
        )
    );

CREATE POLICY "Team members can update tier renames"
    ON lol_tier_renames FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_tier_renames.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_tier_renames.team_id
            AND teams.created_by = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_tier_renames.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_tier_renames.team_id
            AND teams.created_by = auth.uid()
        )
    );

CREATE POLICY "Team members can delete tier renames"
    ON lol_tier_renames FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_tier_renames.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_tier_renames.team_id
            AND teams.created_by = auth.uid()
        )
    );

-- Create indexes
CREATE INDEX idx_lol_tier_renames_team_id ON lol_tier_renames(team_id);
CREATE INDEX idx_lol_tier_renames_tier_id ON lol_tier_renames(tier_id);

-- Create trigger for updated_at
CREATE TRIGGER update_lol_tier_renames_updated_at
    BEFORE UPDATE ON lol_tier_renames
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
