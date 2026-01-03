-- ========================================
-- FUNCTION pour utiliser la table availabilities existante
-- ========================================

-- Supprimer la fonction existante d'abord
DROP FUNCTION IF EXISTS get_availabilities_with_info(UUID);

CREATE OR REPLACE FUNCTION get_availabilities_with_info(p_team_id UUID)
RETURNS TABLE (
    id UUID,
    team_id UUID,
    user_id UUID,
    day_of_week INTEGER,
    start_time TIME,
    end_time TIME,
    is_recurring BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    status CHARACTER VARYING,
    week_start DATE,
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
        a.id,
        a.team_id,
        a.user_id,
        a.day_of_week,
        a.start_time,
        a.end_time,
        a.is_recurring,
        a.created_at,
        a.updated_at,
        a.status,
        a.week_start,
        COALESCE(
            (au.raw_user_meta_data->>'pseudo')::TEXT,
            split_part(au.email, '@', 1)
        ) as user_pseudo,
        au.email as user_email,
        COALESCE(
            (au.raw_user_meta_data->>'avatar_url')::CHARACTER VARYING(255),
            p.avatar_url
        ) as user_avatar_url
    FROM availabilities a
    INNER JOIN team_members tm ON tm.user_id = a.user_id AND tm.team_id = a.team_id
    INNER JOIN auth.users au ON au.id = a.user_id
    LEFT JOIN profiles p ON p.id = a.user_id
    WHERE a.team_id = p_team_id
    ORDER BY a.week_start, a.day_of_week, a.start_time, user_pseudo;
END;
$$;

GRANT EXECUTE ON FUNCTION get_availabilities_with_info TO authenticated;