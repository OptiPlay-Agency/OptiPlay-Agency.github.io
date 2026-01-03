-- ========================================
-- CREATE CUSTOM TIERS TABLE FOR LOL
-- ========================================

-- Drop existing table
DROP TABLE IF EXISTS lol_custom_tiers CASCADE;

-- Create custom tiers table
CREATE TABLE lol_custom_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#f59e0b',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE lol_custom_tiers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view custom tiers of their teams"
    ON lol_custom_tiers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_custom_tiers.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_custom_tiers.team_id
            AND teams.created_by = auth.uid()
        )
    );

CREATE POLICY "Team members can insert custom tiers"
    ON lol_custom_tiers FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_custom_tiers.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_custom_tiers.team_id
            AND teams.created_by = auth.uid()
        )
    );

CREATE POLICY "Team members can update custom tiers"
    ON lol_custom_tiers FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_custom_tiers.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_custom_tiers.team_id
            AND teams.created_by = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_custom_tiers.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_custom_tiers.team_id
            AND teams.created_by = auth.uid()
        )
    );

CREATE POLICY "Team members can delete custom tiers"
    ON lol_custom_tiers FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_custom_tiers.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_custom_tiers.team_id
            AND teams.created_by = auth.uid()
        )
    );

-- Create indexes
CREATE INDEX idx_lol_custom_tiers_team_id ON lol_custom_tiers(team_id);
CREATE INDEX idx_lol_custom_tiers_position ON lol_custom_tiers(position);

-- Create trigger for updated_at
CREATE TRIGGER update_lol_custom_tiers_updated_at
    BEFORE UPDATE ON lol_custom_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
