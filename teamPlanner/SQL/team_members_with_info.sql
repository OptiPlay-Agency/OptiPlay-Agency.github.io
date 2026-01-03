-- ========================================
-- FUNCTION TO GET TEAM MEMBERS WITH PROPER INFO - UPDATED
-- ========================================

-- Supprimer l'ancienne fonction d'abord
DROP FUNCTION IF EXISTS get_team_members_with_info(UUID);

-- Cette fonction récupère les membres d'équipe avec pseudo depuis profiles
CREATE OR REPLACE FUNCTION get_team_members_with_info(p_team_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    team_id UUID,
    role TEXT,
    joined_at TIMESTAMPTZ,
    user_name TEXT,
    user_pseudo TEXT,
    user_email CHARACTER VARYING(255),
    user_avatar_url CHARACTER VARYING(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.id,
        tm.user_id,
        tm.team_id,
        tm.role,
        tm.joined_at,
        COALESCE(
            p.pseudo,
            (au.raw_user_meta_data->>'pseudo')::TEXT,
            split_part(au.email, '@', 1)
        ) as user_name,
        COALESCE(
            p.pseudo,
            (au.raw_user_meta_data->>'pseudo')::TEXT,
            split_part(au.email, '@', 1)
        ) as user_pseudo,
        au.email as user_email,
        COALESCE(
            p.avatar_url,
            (au.raw_user_meta_data->>'avatar_url')::CHARACTER VARYING(255)
        ) as user_avatar_url
    FROM team_members tm
    INNER JOIN auth.users au ON au.id = tm.user_id
    LEFT JOIN profiles p ON p.id = tm.user_id
    WHERE tm.team_id = p_team_id
    ORDER BY 
        CASE tm.role 
            WHEN 'owner' THEN 1 
            WHEN 'coach' THEN 2 
            ELSE 3 
        END,
        COALESCE(p.pseudo, split_part(au.email, '@', 1));
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION get_team_members_with_info TO authenticated;