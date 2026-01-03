-- Remove the CHECK constraint on tier column to allow custom tiers (UUID values)
ALTER TABLE lol_champion_pools DROP CONSTRAINT IF EXISTS lol_champion_pools_tier_check;
