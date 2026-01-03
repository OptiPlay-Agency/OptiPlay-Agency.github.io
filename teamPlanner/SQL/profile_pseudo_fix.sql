-- ====================================================
-- OPTIPLAY MANAGER - PROFILE & PSEUDO FIX
-- Mise à jour complète des fonctions pour corriger les pseudos
-- ====================================================

-- 1. FUNCTION GET TEAM MEMBERS METADATA (UPDATED)
-- ============================================================

DROP FUNCTION IF EXISTS get_team_members_metadata(UUID);

CREATE OR REPLACE FUNCTION get_team_members_metadata(p_team_id UUID)
RETURNS TABLE (
    user_id UUID,
    pseudo TEXT,
    email TEXT,
    avatar_url TEXT,
    role CHARACTER VARYING(50)
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
        au.email::TEXT,
        COALESCE(
            p.avatar_url::TEXT,
            (au.raw_user_meta_data->>'avatar_url')::TEXT
        ) as avatar_url,
        tm.role
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

-- 2. FUNCTION GET TEAM MEMBERS WITH INFO (UPDATED)
-- ============================================================

DROP FUNCTION IF EXISTS get_team_members_with_info(UUID);

CREATE OR REPLACE FUNCTION get_team_members_with_info(p_team_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    team_id UUID,
    role CHARACTER VARYING(50),
    joined_at TIMESTAMPTZ,
    user_name TEXT,
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
        au.email::TEXT as user_email,
        COALESCE(
            p.avatar_url::TEXT,
            (au.raw_user_meta_data->>'avatar_url')::TEXT
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

-- 3. FUNCTION GET AVAILABILITIES WITH INFO (CORRECTED TYPES)
-- ==========================================================

DROP FUNCTION IF EXISTS get_availabilities_with_info(UUID);

CREATE OR REPLACE FUNCTION get_availabilities_with_info(p_team_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    day_of_week INTEGER,
    start_time TIME,
    end_time TIME,
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
        a.day_of_week,
        a.start_time,
        COALESCE(p.pseudo, split_part(au.email, '@', 1));
END;
$$;

-- 4. GRANTS & PERMISSIONS
-- =======================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_team_members_metadata(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_members_with_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_availabilities_with_info(UUID) TO authenticated;

-- Success message
SELECT 'Profile & Pseudo Fix Functions Updated Successfully!' as status;