-- ========================================
-- FUNCTION TO GET USER METADATA (PSEUDO) - UPDATED
-- ========================================

-- Supprimer l'ancienne fonction d'abord
DROP FUNCTION IF EXISTS get_team_members_metadata(UUID);

-- Cette fonction permet de récupérer le pseudo depuis profiles
-- pour les membres d'une équipe
CREATE OR REPLACE FUNCTION get_team_members_metadata(team_id_param UUID)
RETURNS TABLE (
    user_id UUID,
    pseudo TEXT,
    avatar_url CHARACTER VARYING(255),
    email CHARACTER VARYING(255)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.user_id,
        COALESCE(
            p.pseudo,
            (au.raw_user_meta_data->>'pseudo')::TEXT,
            split_part(au.email, '@', 1)
        ) as pseudo,
        COALESCE(
            p.avatar_url,
            (au.raw_user_meta_data->>'avatar_url')::CHARACTER VARYING(255)
        ) as avatar_url,
        au.email
    FROM team_members tm
    INNER JOIN auth.users au ON au.id = tm.user_id
    LEFT JOIN profiles p ON p.id = tm.user_id
    WHERE tm.team_id = team_id_param
    ORDER BY 
        CASE tm.role 
            WHEN 'owner' THEN 1 
            ELSE 2 
        END,
        COALESCE(p.pseudo, split_part(au.email, '@', 1));
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION get_team_members_metadata(UUID) TO authenticated;
