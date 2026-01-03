-- ===========================================
-- OPTIPLAY SCRIM FINDER - DATABASE SCHEMA
-- ===========================================
-- Ce fichier contient tous les scripts SQL nécessaires
-- pour adapter le Scrim Finder à votre structure existante
-- 
-- Tables créées/modifiées :
-- - teams : Mise à jour avec colonnes level et region
-- - scrims : Scrims (matchs d'entraînement)  
-- - scrim_requests : Demandes de scrims
-- - team_invites : Utilise la table existante
-- - team_members : Utilise la table existante
-- ===========================================

-- Suppression des tables existantes si elles existent (pour reset complet)
-- ATTENTION: Décommentez uniquement si vous voulez reset la base de données
-- DROP TABLE IF EXISTS scrim_requests CASCADE;
-- DROP TABLE IF EXISTS scrims CASCADE;

-- ===========================================
-- MISE À JOUR DE LA TABLE TEAMS EXISTANTE
-- ===========================================
-- Ajout des colonnes manquantes à la table teams existante
-- (La table teams existe déjà, on ajoute juste les colonnes manquantes)

-- Ajouter les colonnes level et region si elles n'existent pas
DO $$ 
BEGIN 
    -- Ajouter level si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='teams' AND column_name='level') THEN
        ALTER TABLE teams ADD COLUMN level TEXT;
    END IF;
    
    -- Ajouter region si elle n'existe pas  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='teams' AND column_name='region') THEN
        ALTER TABLE teams ADD COLUMN region TEXT NOT NULL DEFAULT 'EUW';
    END IF;
END $$;

-- ===========================================
-- TABLE: scrims (MISE À JOUR DE L'EXISTANTE)
-- ===========================================
-- Mise à jour de la table scrims existante du Team Manager
-- pour la rendre compatible avec le Scrim Finder

-- Ajouter les colonnes manquantes à la table scrims existante pour le Scrim Finder
DO $$ 
BEGIN 
    -- Ajouter region si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='scrims' AND column_name='region') THEN
        ALTER TABLE scrims ADD COLUMN region TEXT;
    END IF;
    
    -- Ajouter opponent_level si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='scrims' AND column_name='opponent_level') THEN
        ALTER TABLE scrims ADD COLUMN opponent_level TEXT;
    END IF;
    
    -- Ajouter allow_lower_level si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='scrims' AND column_name='allow_lower_level') THEN
        ALTER TABLE scrims ADD COLUMN allow_lower_level BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Ajouter allow_higher_level si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='scrims' AND column_name='allow_higher_level') THEN
        ALTER TABLE scrims ADD COLUMN allow_higher_level BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Ajouter status si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='scrims' AND column_name='status') THEN
        ALTER TABLE scrims ADD COLUMN status TEXT DEFAULT 'completed' CHECK (status IN ('open', 'pending', 'confirmed', 'completed', 'cancelled'));
    END IF;
    
    -- Ajouter is_recurring si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='scrims' AND column_name='is_recurring') THEN
        ALTER TABLE scrims ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Ajouter recurring_group_id si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='scrims' AND column_name='recurring_group_id') THEN
        ALTER TABLE scrims ADD COLUMN recurring_group_id TEXT;
    END IF;
    
    -- Ajouter duration si elle n'existe pas (en minutes)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='scrims' AND column_name='duration') THEN
        ALTER TABLE scrims ADD COLUMN duration INTEGER DEFAULT 120;
    END IF;
    
    -- Ajouter description si elle n'existe pas (renommer notes vers description si needed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='scrims' AND column_name='description') THEN
        ALTER TABLE scrims ADD COLUMN description TEXT;
        -- Copier les notes vers description pour les scrims existants
        UPDATE scrims SET description = notes WHERE notes IS NOT NULL AND description IS NULL;
    END IF;
    
    -- Mettre à jour les scrims existants pour avoir un statut 'completed' par défaut
    UPDATE scrims SET status = 'completed' WHERE status IS NULL;
    
    -- Mettre à jour la région par défaut si elle est NULL
    UPDATE scrims SET region = 'EUW' WHERE region IS NULL;
    
END $$;

-- ===========================================
-- TABLE: scrim_requests
-- ===========================================
-- Stockage des demandes de scrims entre équipes
CREATE TABLE IF NOT EXISTS scrim_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scrim_id UUID REFERENCES scrims(id) ON DELETE CASCADE,
    requesting_team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- Équipe qui demande
    host_team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- Équipe qui héberge (l'équipe du scrim)
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    message TEXT, -- Message de la demande
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- INDEX POUR PERFORMANCES
-- ===========================================
-- Index sur les colonnes fréquemment utilisées pour optimiser les requêtes

-- Index pour les scrims (seulement si les colonnes existent)
DO $$ 
BEGIN 
    -- Index team_id (toujours présent)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scrims_team_id') THEN
        CREATE INDEX idx_scrims_team_id ON scrims(team_id);
    END IF;
    
    -- Index status (pour le Scrim Finder - scrims ouverts)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='scrims' AND column_name='status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scrims_status') THEN
            CREATE INDEX idx_scrims_status ON scrims(status);
        END IF;
    END IF;
    
    -- Index scrim_date (Team Manager utilise scrim_date au lieu de date)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='scrims' AND column_name='scrim_date') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scrims_scrim_date') THEN
            CREATE INDEX idx_scrims_scrim_date ON scrims(scrim_date);
        END IF;
    END IF;
    
    -- Index game
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='scrims' AND column_name='game') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scrims_game') THEN
            CREATE INDEX idx_scrims_game ON scrims(game);
        END IF;
    END IF;
    
    -- Index region (pour le Scrim Finder)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='scrims' AND column_name='region') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scrims_region') THEN
            CREATE INDEX idx_scrims_region ON scrims(region);
        END IF;
    END IF;
    
    -- Index created_by
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='scrims' AND column_name='created_by') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scrims_created_by') THEN
            CREATE INDEX idx_scrims_created_by ON scrims(created_by);
        END IF;
    END IF;
END $$;

-- Index pour les demandes de scrims (seulement si la table existe)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name='scrim_requests') THEN
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scrim_requests_scrim_id') THEN
            CREATE INDEX idx_scrim_requests_scrim_id ON scrim_requests(scrim_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='scrim_requests' AND column_name='status') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scrim_requests_status') THEN
                CREATE INDEX idx_scrim_requests_status ON scrim_requests(status);
            END IF;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scrim_requests_requesting_team') THEN
            CREATE INDEX idx_scrim_requests_requesting_team ON scrim_requests(requesting_team_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scrim_requests_host_team') THEN
            CREATE INDEX idx_scrim_requests_host_team ON scrim_requests(host_team_id);
        END IF;
    END IF;
END $$;

-- Index pour les équipes
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);

-- Index pour game seulement si la colonne existe
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='teams' AND column_name='game') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_teams_game') THEN
            CREATE INDEX idx_teams_game ON teams(game);
        END IF;
    END IF;
END $$;

-- Index pour region seulement si la colonne existe
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='teams' AND column_name='region') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_teams_region') THEN
            CREATE INDEX idx_teams_region ON teams(region);
        END IF;
    END IF;
END $$;

-- ===========================================
-- TRIGGERS POUR MISE À JOUR AUTOMATIQUE
-- ===========================================
-- Triggers pour mettre à jour automatiquement updated_at

-- Fonction pour mettre à jour updated_at (si elle n'existe pas déjà)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour teams (seulement si updated_at existe sur teams)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='teams' AND column_name='updated_at') THEN
        DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
        CREATE TRIGGER update_teams_updated_at 
            BEFORE UPDATE ON teams 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Triggers pour scrims
DROP TRIGGER IF EXISTS update_scrims_updated_at ON scrims;
CREATE TRIGGER update_scrims_updated_at 
    BEFORE UPDATE ON scrims 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers pour scrim_requests
DROP TRIGGER IF EXISTS update_scrim_requests_updated_at ON scrim_requests;
CREATE TRIGGER update_scrim_requests_updated_at 
    BEFORE UPDATE ON scrim_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================
-- Politique de sécurité pour protéger les données

-- Activer RLS sur les nouvelles tables (teams déjà existante)
ALTER TABLE scrims ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrim_requests ENABLE ROW LEVEL SECURITY;

-- Politiques pour teams (adaptées à la structure existante avec team_members)
-- Les utilisateurs peuvent voir toutes les équipes
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON teams;
CREATE POLICY "Teams are viewable by everyone" ON teams
    FOR SELECT USING (true);

-- Les utilisateurs peuvent modifier les équipes où ils sont membres (via team_members)
DROP POLICY IF EXISTS "Users can update teams where they are members" ON teams;
CREATE POLICY "Users can update teams where they are members" ON teams
    FOR UPDATE USING (
        auth.uid() = created_by OR 
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = teams.id 
            AND user_id = auth.uid()
        )
    );

-- Les utilisateurs peuvent supprimer leurs propres équipes
DROP POLICY IF EXISTS "Users can delete their own teams" ON teams;
CREATE POLICY "Users can delete their own teams" ON teams
    FOR DELETE USING (auth.uid() = created_by);

-- Politiques pour scrims
-- Les utilisateurs peuvent voir tous les scrims ouverts mais seulement modifier ceux de leurs équipes
DROP POLICY IF EXISTS "Open scrims are viewable by everyone" ON scrims;
CREATE POLICY "Open scrims are viewable by everyone" ON scrims
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert scrims for their teams" ON scrims;
CREATE POLICY "Users can insert scrims for their teams" ON scrims
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM teams 
            WHERE id = scrims.team_id 
            AND (created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM team_members 
                        WHERE team_id = scrims.team_id 
                        AND user_id = auth.uid()))
        )
    );

DROP POLICY IF EXISTS "Users can update scrims for their teams" ON scrims;
CREATE POLICY "Users can update scrims for their teams" ON scrims
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM teams 
            WHERE id = scrims.team_id 
            AND (created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM team_members 
                        WHERE team_id = scrims.team_id 
                        AND user_id = auth.uid()))
        )
    );

DROP POLICY IF EXISTS "Users can delete scrims for their teams" ON scrims;
CREATE POLICY "Users can delete scrims for their teams" ON scrims
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM teams 
            WHERE id = scrims.team_id 
            AND (created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM team_members 
                        WHERE team_id = scrims.team_id 
                        AND user_id = auth.uid()))
        )
    );

-- Politiques pour scrim_requests
-- Les utilisateurs peuvent voir les demandes concernant leurs équipes
DROP POLICY IF EXISTS "Users can view requests for their teams" ON scrim_requests;
CREATE POLICY "Users can view requests for their teams" ON scrim_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM teams 
            WHERE id = scrim_requests.requesting_team_id 
            AND (created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM team_members 
                        WHERE team_id = scrim_requests.requesting_team_id 
                        AND user_id = auth.uid()))
        ) OR
        EXISTS (
            SELECT 1 FROM teams 
            WHERE id = scrim_requests.host_team_id 
            AND (created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM team_members 
                        WHERE team_id = scrim_requests.host_team_id 
                        AND user_id = auth.uid()))
        )
    );

DROP POLICY IF EXISTS "Users can insert requests for their teams" ON scrim_requests;
CREATE POLICY "Users can insert requests for their teams" ON scrim_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM teams 
            WHERE id = scrim_requests.requesting_team_id 
            AND (created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM team_members 
                        WHERE team_id = scrim_requests.requesting_team_id 
                        AND user_id = auth.uid()))
        )
    );

DROP POLICY IF EXISTS "Users can update requests for their teams" ON scrim_requests;
CREATE POLICY "Users can update requests for their teams" ON scrim_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM teams 
            WHERE id = scrim_requests.host_team_id 
            AND (created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM team_members 
                        WHERE team_id = scrim_requests.host_team_id 
                        AND user_id = auth.uid()))
        )
    );

-- ===========================================
-- DONNÉES DE TEST (OPTIONNEL)
-- ===========================================
-- Décommentez pour insérer des données de test

/*
-- Exemple d'équipe de test
INSERT INTO teams (name, game, level, region, created_by, description) VALUES 
('Team OptiPlay', 'lol', 'Platine', 'EUW', auth.uid(), 'Équipe principale OptiPlay League of Legends');

-- Exemple de scrim de test  
INSERT INTO scrims (team_id, date, time, duration, format, region, opponent_level, description, game, created_by) VALUES
((SELECT id FROM teams WHERE name = 'Team OptiPlay' LIMIT 1), '2024-02-15', '20:00', 90, 'bo1', 'EUW', 'Platine', 'Scrim sérieux pour améliorer notre macro', 'lol', auth.uid());
*/

-- ===========================================
-- VUES UTILITAIRES (COMPATIBILITÉ TEAM MANAGER)
-- ===========================================
-- Vues pour parfaite intégration avec le Team Manager existant

-- Vue des scrims avec informations d'équipe (compatible Team Manager uniquement)
CREATE OR REPLACE VIEW scrims_with_team_info AS
SELECT 
    s.*,
    t.name as team_name,
    t.level as team_level,
    -- Utilise les colonnes réelles du Team Manager
    s.scrim_date as match_date,
    s.scrim_time as match_time,
    -- Indicateur du type de scrim basé sur la structure réelle
    CASE 
        WHEN s.status IN ('open', 'pending', 'confirmed') THEN 'upcoming'
        WHEN s.status = 'completed' OR s.final_score IS NOT NULL THEN 'completed'
        ELSE 'cancelled'  
    END as scrim_type
FROM scrims s
JOIN teams t ON s.team_id = t.id;

-- Vue des scrims ouverts pour le Scrim Finder (scrims proposés à venir)
CREATE OR REPLACE VIEW open_scrims AS
SELECT 
    s.*,
    t.name as team_name,
    t.level as team_level,
    t.region as team_region
FROM scrims s
JOIN teams t ON s.team_id = t.id
WHERE s.status = 'open' 
    AND s.scrim_date >= CURRENT_DATE;

-- Vue des demandes de scrims avec informations des équipes
CREATE OR REPLACE VIEW scrim_requests_with_teams AS
SELECT 
    sr.*,
    rt.name as requesting_team_name,
    rt.level as requesting_team_level,
    ht.name as host_team_name,
    ht.level as host_team_level,
    s.scrim_date,
    s.scrim_time,
    s.title,
    s.format,
    s.game,
    s.opponent_level,
    s.region,
    s.description
FROM scrim_requests sr
JOIN teams rt ON sr.requesting_team_id = rt.id
JOIN teams ht ON sr.host_team_id = ht.id
JOIN scrims s ON sr.scrim_id = s.id;

-- ===========================================
-- SÉCURITÉ RLS POUR LES VUES
-- ===========================================
-- Les vues héritent automatiquement des politiques RLS des tables sous-jacentes
-- Pas besoin d'activer RLS sur les vues, elles utilisent les politiques des tables

-- Note: Les vues utiliseront les politiques RLS des tables :
-- - scrims_with_team_info utilise les politiques de 'scrims' et 'teams'
-- - open_scrims utilise les politiques de 'scrims' et 'teams'  
-- - scrim_requests_with_teams utilise les politiques de 'scrim_requests', 'teams', et 'scrims'


-- ===========================================
-- FINALISATION
-- ===========================================
-- Script terminé avec succès !
-- 
-- 🔥 INTÉGRATION PARFAITE TEAM MANAGER + SCRIM FINDER :
-- 
-- 📋 WORKFLOW COMPLET :
-- 1. SCRIM FINDER : Proposer des scrims (status='open') avec opponent_level, region
-- 2. DEMANDES : Les équipes demandent via scrim_requests 
-- 3. CONFIRMATION : Acceptation -> status='confirmed' + event_id créé dans planning
-- 4. RÉSULTATS : Après le scrim -> Team Manager enregistre final_score (status='completed')
--
-- 🔗 TABLES PARTAGÉES :
-- • teams : Équipes réutilisées (avec level, region ajoutés)
-- • scrims : Table unifiée Team Manager + Scrim Finder
-- • events : Planning automatique (event_id dans scrims)  
-- • team_members : Gestion permissions (existante)
-- • scrim_requests : Nouvelles demandes entre équipes
--
-- 📊 TYPES DE SCRIMS :
-- • 'open' : Scrim proposé dans Scrim Finder 
-- • 'pending' : Demande envoyée mais pas encore acceptée
-- • 'confirmed' : Scrim accepté, programmé dans le planning
-- • 'completed' : Scrim joué avec résultats (Team Manager)
-- • 'cancelled' : Scrim annulé
--
-- ✅ WORKFLOW D'INTÉGRATION :
-- 1. Scrim Finder crée scrim avec status='open'
-- 2. Équipe demande via scrim_requests  
-- 3. Acceptation -> status='confirmed' + création event dans planning
-- 4. Team Manager affiche le scrim programmé
-- 5. Après match -> enregistrement résultats + status='completed'
--
-- Instructions :
-- 1. Exécutez ce script pour adapter la structure existante
-- 2. Les scrims Team Manager existants gardent status='completed'
-- 3. Le Scrim Finder utilise les mêmes équipes et planning
-- 4. Intégration totale : proposition -> planification -> résultats !
-- 
-- Support: contact@optiplay.gg
-- ===========================================