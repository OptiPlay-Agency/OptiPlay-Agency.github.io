-- ========================================
-- FUNCTION TO GET USER METADATA (PSEUDO)
-- ========================================

-- Cette fonction permet de récupérer le pseudo depuis user_metadata
-- pour les membres d'une équipe
CREATE OR REPLACE FUNCTION get_team_members_metadata(team_id_param UUID)
RETURNS TABLE (
    user_id UUID,
    pseudo TEXT,
    avatar_url TEXT,
    email TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.user_id,
        COALESCE(
            (au.raw_user_meta_data->>'pseudo')::TEXT,
            split_part(au.email, '@', 1)
        ) as pseudo,
        COALESCE(
            (au.raw_user_meta_data->>'avatar_url')::TEXT,
            p.avatar_url
        ) as avatar_url,
        au.email
    FROM team_members tm
    INNER JOIN auth.users au ON au.id = tm.user_id
    LEFT JOIN profiles p ON p.id = tm.user_id
    WHERE tm.team_id = team_id_param;
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION get_team_members_metadata(UUID) TO authenticated;
