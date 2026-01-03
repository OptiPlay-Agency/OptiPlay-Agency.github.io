-- User Games Table
-- Stores games that users play with their ranks and tracker links

CREATE TABLE IF NOT EXISTS user_games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_name TEXT NOT NULL,
    rank TEXT,
    tracker_url TEXT,
    profile_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, game_name)
);

-- Enable RLS
ALTER TABLE user_games ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own games
CREATE POLICY "Users can view their own games"
    ON user_games FOR SELECT
    USING (auth.uid() = user_id);

-- Users can view games of other users (for public profiles)
CREATE POLICY "Users can view games of other users"
    ON user_games FOR SELECT
    USING (true);

-- Users can insert their own games
CREATE POLICY "Users can insert their own games"
    ON user_games FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own games
CREATE POLICY "Users can update their own games"
    ON user_games FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own games
CREATE POLICY "Users can delete their own games"
    ON user_games FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_user_games_user_id ON user_games(user_id);
CREATE INDEX idx_user_games_game_name ON user_games(game_name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_user_games_updated_at
    BEFORE UPDATE ON user_games
    FOR EACH ROW
    EXECUTE FUNCTION update_user_games_updated_at();
