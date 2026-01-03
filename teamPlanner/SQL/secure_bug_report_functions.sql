-- Créer les fonctions PostgreSQL sécurisées pour les bug reports
-- Ces fonctions gardent les tokens secrets côté serveur

-- Fonction pour uploader une image sur ImgBB
CREATE OR REPLACE FUNCTION upload_image_to_imgbb(image_base64 TEXT, filename TEXT DEFAULT 'image.png')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    api_key TEXT;
    result JSON;
BEGIN
    -- Récupérer la clé API ImgBB (seulement accessible côté serveur)
    SELECT value INTO api_key FROM app_config WHERE key = 'imgbb_api_key' LIMIT 1;
    
    IF api_key IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'ImgBB API key not configured');
    END IF;
    
    -- Faire l'appel HTTP à ImgBB via pg_net (extension Supabase)
    SELECT 
        content::JSON
    INTO result
    FROM http((
        'POST',
        'https://api.imgbb.com/1/upload',
        ARRAY[
            http_header('Content-Type', 'application/x-www-form-urlencoded')
        ],
        'application/x-www-form-urlencoded',
        'key=' || api_key || '&image=' || image_base64
    )::http_request);
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Fonction pour créer une issue GitHub
CREATE OR REPLACE FUNCTION create_github_issue(
    issue_title TEXT, 
    issue_body TEXT, 
    issue_labels TEXT[] DEFAULT ARRAY['bug-report', 'user-report']
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    github_token TEXT;
    result JSON;
    issue_data JSON;
BEGIN
    -- Récupérer le token GitHub (seulement accessible côté serveur)
    SELECT value INTO github_token FROM app_config WHERE key = 'github_token' LIMIT 1;
    
    IF github_token IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'GitHub token not configured');
    END IF;
    
    -- Construire les données de l'issue
    issue_data := json_build_object(
        'title', issue_title,
        'body', issue_body,
        'labels', to_json(issue_labels)
    );
    
    -- Faire l'appel HTTP à GitHub via pg_net
    SELECT 
        content::JSON
    INTO result
    FROM http((
        'POST',
        'https://api.github.com/repos/OptiPlay-Agency/OptiPlay-Agency.github.io/issues',
        ARRAY[
            http_header('Authorization', 'token ' || github_token),
            http_header('Content-Type', 'application/json'),
            http_header('Accept', 'application/vnd.github.v3+json')
        ],
        'application/json',
        issue_data::TEXT
    )::http_request);
    
    -- Retourner le résultat avec l'URL de l'issue
    IF (result->>'html_url') IS NOT NULL THEN
        RETURN json_build_object(
            'success', true, 
            'issue_url', result->>'html_url',
            'issue_number', result->>'number'
        );
    ELSE
        RETURN json_build_object('success', false, 'error', 'Failed to create issue', 'details', result);
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Accorder les permissions aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION upload_image_to_imgbb TO authenticated;
GRANT EXECUTE ON FUNCTION create_github_issue TO authenticated;

-- Politique RLS pour app_config : empêcher la lecture directe par les utilisateurs
DROP POLICY IF EXISTS "Only admins can read config" ON app_config;
CREATE POLICY "No direct access to config" ON app_config
  FOR ALL USING (false); -- Personne ne peut accéder directement

-- Les fonctions PostgreSQL peuvent toujours accéder car elles sont SECURITY DEFINER