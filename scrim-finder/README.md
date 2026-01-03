# 🎮 OptiPlay Scrim Finder

OptiPlay Scrim Finder est une application web intégrée permettant aux équipes eSport de proposer, rechercher et gérer des scrims (matchs d'entraînement) facilement.

## 📁 Structure du projet

```
scrim-finder/
├── index.html              # Dashboard principal
├── search.html             # Recherche de scrims
├── propose.html            # Proposition de scrims
├── my-scrims.html          # Gestion des scrims
├── history.html            # Historique des scrims
├── settings.html           # Paramètres
├── CSS/
│   └── scrim-finder.css    # Styles principaux
└── JS/
    ├── scrim-finder.js     # Logique principale
    ├── team-management.js  # Gestion des équipes
    ├── search.js           # Recherche de scrims
    └── propose.js          # Proposition de scrims
```

## 🎯 Fonctionnalités principales

### Dashboard
- Vue d'ensemble des scrims en cours
- Statistiques rapides (scrims en attente, confirmés, joués)
- Demandes de scrims en attente
- Activité récente

### Gestion d'équipes
- Sélection d'équipe active
- Création de nouvelles équipes
- Génération de liens d'invitation
- Gestion des membres

### Recherche de scrims
- Filtres avancés (date, heure, niveau, région, format)
- Tri par pertinence
- Demande de scrims en un clic
- Affichage des détails complets

### Proposition de scrims
- Formulaire dynamique selon le jeu
- Scrims uniques ou récurrents
- Sauvegarde automatique de brouillons
- Paramètres avancés (niveau recherché, règles spéciales)

### Gestion des demandes
- Réception et traitement des demandes
- Acceptation/refus avec notifications
- Historique des interactions
- Statuts en temps réel

## 🎮 Jeux supportés (V1)

1. **League of Legends**
2. **Valorant**
3. **Rocket League**

Chaque jeu peut avoir des champs et filtres spécifiques.

## 🔐 Authentification

Le système utilise l'authentification Supabase existante d'OptiPlay :
- Connexion unique pour tous les produits
- Gestion des rôles et permissions
- Sécurité des données équipes

## 📊 Base de données

### Tables principales

#### `teams`
```sql
- id (uuid, primary key)
- name (text)
- game (text) -- 'lol', 'valorant', 'rocket-league'
- level (text)
- region (text)
- created_by (uuid, foreign key to auth.users)
- members (uuid[], array of user IDs)
- member_roles (jsonb) -- roles per member
- description (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `scrims`
```sql
- id (uuid, primary key)
- team_id (uuid, foreign key to teams)
- date (date)
- time (time)
- duration (integer) -- minutes
- format (text) -- 'bo1', 'bo3', 'bo5', 'custom'
- region (text)
- opponent_level (text)
- description (text)
- allow_lower_level (boolean)
- allow_higher_level (boolean)
- status (text) -- 'open', 'pending', 'confirmed', 'completed', 'cancelled'
- game (text)
- is_recurring (boolean)
- recurring_group_id (text)
- created_by (uuid)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `scrim_requests`
```sql
- id (uuid, primary key)
- scrim_id (uuid, foreign key to scrims)
- requesting_team_id (uuid, foreign key to teams)
- host_team_id (uuid, foreign key to teams)
- status (text) -- 'pending', 'accepted', 'rejected'
- message (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `team_invites`
```sql
- id (uuid, primary key)
- team_id (uuid, foreign key to teams)
- invite_code (text, unique)
- created_by (uuid)
- is_active (boolean)
- expires_at (timestamp)
- created_at (timestamp)
```

## 🚀 Installation et configuration

### 1. Intégration au site OptiPlay

Le Scrim Finder est accessible via `/scrim-finder/` depuis le site principal.

### 2. Configuration Supabase

Réutilise la configuration Supabase existante (`../JS/supabase-config.js`).

### 3. Tables à créer

Exécuter les scripts SQL pour créer les tables nécessaires :

```sql
-- Création de la table teams
CREATE TABLE teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    game TEXT NOT NULL CHECK (game IN ('lol', 'valorant', 'rocket-league')),
    level TEXT,
    region TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    members UUID[] DEFAULT '{}',
    member_roles JSONB DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création de la table scrims
CREATE TABLE scrims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration INTEGER NOT NULL CHECK (duration > 0),
    format TEXT NOT NULL,
    region TEXT NOT NULL,
    opponent_level TEXT,
    description TEXT,
    allow_lower_level BOOLEAN DEFAULT FALSE,
    allow_higher_level BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'confirmed', 'completed', 'cancelled')),
    game TEXT NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_group_id TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création de la table scrim_requests
CREATE TABLE scrim_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scrim_id UUID REFERENCES scrims(id) ON DELETE CASCADE,
    requesting_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    host_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création de la table team_invites
CREATE TABLE team_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX idx_scrims_team_id ON scrims(team_id);
CREATE INDEX idx_scrims_status ON scrims(status);
CREATE INDEX idx_scrims_date ON scrims(date);
CREATE INDEX idx_scrim_requests_scrim_id ON scrim_requests(scrim_id);
CREATE INDEX idx_scrim_requests_status ON scrim_requests(status);
```

## 📱 Interface utilisateur

### Design System
- **Couleurs** : Palette eSport OptiPlay (bleu électrique, cyan, rose gaming)
- **Typographie** : Orbitron (titres) + Inter (texte)
- **Layout** : Sidebar fixe + contenu principal
- **Responsive** : Mobile-first, breakpoints optimisés

### Navigation
- Sidebar gauche toujours visible
- Sélecteur d'équipe en haut
- Navigation contextuelle
- États actifs visuels

### Composants clés
- **Cards de scrims** : Informations essentielles + actions
- **Filtres avancés** : Interface intuitive
- **Modales** : Détails et confirmation
- **États vides** : Messages encourageants + CTA

## 🔄 Workflows utilisateur

### 1. Première utilisation
1. Connexion avec compte OptiPlay
2. Création de première équipe
3. Configuration des paramètres
4. Première proposition de scrim

### 2. Recherche de scrim
1. Sélection équipe active
2. Application des filtres
3. Parcours des résultats
4. Demande de scrim
5. Attente de réponse

### 3. Gestion des demandes
1. Réception de notification
2. Consultation des détails
3. Acceptation/refus
4. Configuration du match
5. Suivi jusqu'à completion

## 🎛️ Paramètres et configuration

### Équipe
- Informations générales (nom, niveau, région)
- Gestion des membres
- Paramètres de visibilité

### Notifications
- Préférences par type d'événement
- Canaux de notification (in-app, email, Discord)
- Horaires de notification

### Discord (Optionnel)
- Connexion du bot Discord
- Configuration des canaux
- Messages automatiques

### Préférences
- Valeurs par défaut
- Timezone
- Options d'automatisation

## 🔮 Évolutions futures (V2+)

### Jeux additionnels
- CS2/CS:GO
- Overwatch 2
- Apex Legends
- Rainbow Six Siege

### Fonctionnalités avancées
- Calendrier visuel
- Intégration streaming
- Statistiques avancées
- Système de réputation
- Matchmaking automatique
- Tournois intégrés

### Intégrations
- APIs des jeux (stats en temps réel)
- Plateformes de streaming
- Réseaux sociaux
- Outils d'analyse

## 🛠️ Maintenance et support

### Logs et monitoring
- Erreurs JavaScript (console.error)
- Métriques d'utilisation
- Performance des requêtes

### Support utilisateur
- Documentation intégrée
- FAQ contextuelle
- Support Discord
- Ticketing via OptiPlay

---

**Développé avec ❤️ pour la communauté eSport française**
*OptiPlay - Votre partenaire eSport digital*