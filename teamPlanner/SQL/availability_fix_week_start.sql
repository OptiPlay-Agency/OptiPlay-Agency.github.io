-- ========================================
-- CORRECTION: Ajouter week_start à get_availabilities_with_info
-- ========================================

-- La fonction get_availabilities_with_info ne retournait pas le champ week_start
-- ce qui causait weekStart_db: undefined dans le JavaScript

DROP FUNCTION IF EXISTS get_availabilities_with_info(UUID);

CREATE OR REPLACE FUNCTION get_availabilities_with_info(p_team_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    day_of_week INTEGER,
    start_time TIME,
    end_time TIME,
    week_start DATE,
    status CHARACTER VARYING(20),
    is_recurring BOOLEAN,
    created_at TIMESTAMPTZ,
    user_pseudo TEXT,
    user_email TEXT,
    user_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.user_id,
        a.day_of_week,
        a.start_time,
        a.end_time,
        a.week_start,
        a.status,
        a.is_recurring,
        a.created_at,
        COALESCE(
            p.pseudo,
            (au.raw_user_meta_data->>'pseudo')::TEXT,
            split_part(au.email, '@', 1)
        ) as user_pseudo,
        au.email::TEXT as user_email,
        COALESCE(
            p.avatar_url::TEXT,
            (au.raw_user_meta_data->>'avatar_url')::TEXT
        ) as user_avatar_url
    FROM availabilities a
    INNER JOIN auth.users au ON au.id = a.user_id
    LEFT JOIN profiles p ON p.id = a.user_id
    INNER JOIN team_members tm ON tm.user_id = a.user_id AND tm.team_id = p_team_id
    ORDER BY 
        a.week_start DESC,
        a.day_of_week,
        a.start_time,
        COALESCE(p.pseudo, split_part(au.email, '@', 1));
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_availabilities_with_info(UUID) TO authenticated;

-- Success message
SELECT 'Availability Function Updated - week_start field added!' as status;