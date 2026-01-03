-- ========================================
-- FUNCTION TO CLEAN EXPIRED INVITATION CODES
-- ========================================

-- Cette fonction supprime automatiquement les codes d'invitation expirés
CREATE OR REPLACE FUNCTION clean_expired_invites()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Supprimer les codes expirés
    DELETE FROM invitation_links 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    -- Récupérer le nombre de codes supprimés
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Donner les permissions aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION clean_expired_invites TO authenticated;

-- Créer une fonction qui vérifie et nettoie avant de joindre une équipe
CREATE OR REPLACE FUNCTION join_team_via_invite_with_cleanup(invite_code_param TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    game_type TEXT,
    description TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    team_record RECORD;
    invite_record RECORD;
    user_id UUID;
BEGIN
    -- Récupérer l'ID de l'utilisateur actuel
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Nettoyer les codes expirés d'abord
    PERFORM clean_expired_invites();
    
    -- Vérifier si le code d'invitation existe et est valide
    SELECT * INTO invite_record 
    FROM invitation_links 
    WHERE invite_code = invite_code_param
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Code d''invitation invalide ou expiré';
    END IF;
    
    -- Vérifier que l'utilisateur n'est pas déjà membre
    IF EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id = invite_record.team_id 
        AND user_id = user_id
    ) THEN
        RAISE EXCEPTION 'Vous êtes déjà membre de cette équipe';
    END IF;
    
    -- Ajouter l'utilisateur à l'équipe
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (invite_record.team_id, user_id, 'member');
    
    -- Incrémenter le compteur d'utilisations
    UPDATE invitation_links 
    SET current_uses = COALESCE(current_uses, 0) + 1
    WHERE id = invite_record.id;
    
    -- Récupérer les informations de l'équipe
    SELECT t.* INTO team_record
    FROM teams t
    WHERE t.id = invite_record.team_id;
    
    -- Retourner les informations de l'équipe
    RETURN QUERY 
    SELECT team_record.id, team_record.name, team_record.game_type, 
           team_record.description, team_record.created_by, team_record.created_at;
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION join_team_via_invite_with_cleanup TO authenticated;