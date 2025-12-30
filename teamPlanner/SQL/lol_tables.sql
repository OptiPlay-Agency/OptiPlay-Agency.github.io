-- League of Legends Champion Pools Table
CREATE TABLE IF NOT EXISTS lol_champion_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    champion_name TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('S', 'A', 'B', 'C')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, player_id, champion_name)
);

-- Enable RLS
ALTER TABLE lol_champion_pools ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view champion pools of their teams"
    ON lol_champion_pools FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_champion_pools.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_champion_pools.team_id
            AND teams.created_by = auth.uid()
        )
    );

CREATE POLICY "Team members can insert champion pools"
    ON lol_champion_pools FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_champion_pools.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_champion_pools.team_id
            AND teams.created_by = auth.uid()
        )
    );

CREATE POLICY "Players can update their own champion pools"
    ON lol_champion_pools FOR UPDATE
    USING (
        player_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_champion_pools.team_id
            AND teams.created_by = auth.uid()
        )
    )
    WITH CHECK (
        player_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_champion_pools.team_id
            AND teams.created_by = auth.uid()
        )
    );

CREATE POLICY "Players can delete their own champion pools"
    ON lol_champion_pools FOR DELETE
    USING (
        player_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_champion_pools.team_id
            AND teams.created_by = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_lol_champion_pools_team_id ON lol_champion_pools(team_id);
CREATE INDEX idx_lol_champion_pools_player_id ON lol_champion_pools(player_id);
CREATE INDEX idx_lol_champion_pools_tier ON lol_champion_pools(tier);

-- League of Legends Compositions Table
CREATE TABLE IF NOT EXISTS lol_compositions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    
    -- Toplane
    toplane_champion TEXT,
    toplane_player UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Jungle
    jungle_champion TEXT,
    jungle_player UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Midlane
    midlane_champion TEXT,
    midlane_player UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- ADC
    adc_champion TEXT,
    adc_player UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Support
    support_champion TEXT,
    support_player UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Bans (array of 8 champions)
    bans TEXT[] DEFAULT '{}',
    
    -- Picks order
    picks_order TEXT,
    
    -- Tactic notes
    tactic_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE lol_compositions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view compositions of their teams"
    ON lol_compositions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_compositions.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_compositions.team_id
            AND teams.created_by = auth.uid()
        )
    );

CREATE POLICY "Team members can insert compositions"
    ON lol_compositions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_compositions.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_compositions.team_id
            AND teams.created_by = auth.uid()
        )
    );

CREATE POLICY "Team members can update compositions"
    ON lol_compositions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_compositions.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_compositions.team_id
            AND teams.created_by = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_compositions.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_compositions.team_id
            AND teams.created_by = auth.uid()
        )
    );

CREATE POLICY "Team members can delete compositions"
    ON lol_compositions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = lol_compositions.team_id
            AND team_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = lol_compositions.team_id
            AND teams.created_by = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_lol_compositions_team_id ON lol_compositions(team_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_lol_champion_pools_updated_at
    BEFORE UPDATE ON lol_champion_pools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lol_compositions_updated_at
    BEFORE UPDATE ON lol_compositions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
