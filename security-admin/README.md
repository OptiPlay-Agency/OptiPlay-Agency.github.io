# OptiPlay Admin Panel

Un système d'administration complet pour la plateforme OptiPlay, permettant la gestion des utilisateurs, équipes, abonnements et modération.

## 🚀 Installation

### 1. Configuration de la base de données

Exécutez le script SQL pour créer les tables nécessaires :

```sql
-- Dans votre interface Supabase SQL Editor
-- Copiez et exécutez le contenu de SQL/admin_schema.sql
```

### 2. Configuration des admins

Modifiez l'email admin par défaut dans le script SQL :

```sql
-- Remplacez 'admin@optiplay.com' par votre email
INSERT INTO admin_users (email, role, is_active) 
VALUES ('votre-email@example.com', 'super_admin', true);
```

### 3. Configuration Supabase

Assurez-vous que votre configuration Supabase dans `JS/supabase-config.js` correspond à celle de votre application principale.

### 4. Accès sécurisé

- L'admin panel doit être déployé sur un sous-domaine sécurisé (ex: admin.optiplay.com)
- Utilisez HTTPS en production
- Configurez des règles de firewall si nécessaire

## 🔐 Authentification

### Types d'administrateurs

- **Super Admin** : Accès complet à toutes les fonctionnalités
- **Admin** : Accès à la gestion des utilisateurs et équipes
- **Moderator** : Accès limité à la modération et aux rapports

### Connexion

1. Rendez-vous sur la page de connexion admin
2. Connectez-vous avec votre email Supabase
3. Le système vérifie automatiquement vos droits d'admin

## 📊 Fonctionnalités

### Dashboard Principal
- Statistiques en temps réel
- Graphiques d'activité
- Alertes et notifications
- Raccourcis vers les sections principales

### Gestion des Utilisateurs
- Liste complète des utilisateurs
- Filtres et recherche avancée
- Modification des profils
- Gestion des abonnements
- Historique des actions

### Gestion des Équipes
- Liste des équipes créées
- Vérification des équipes
- Gestion des membres
- Statistiques par équipe

### Système de Modération
- Rapports utilisateurs
- Gestion des bannissements
- Système d'avertissements
- Historique de modération

### Journaux d'Activité
- Logs détaillés de toutes les actions
- Filtres par niveau, module, date
- Export des logs en CSV
- Recherche dans les logs

### Paramètres Système
- Configuration globale
- Mode maintenance
- Limites et restrictions
- Fonctionnalités premium

## 🛠️ Structure des fichiers

```
security-admin/
├── index.html              # Page de connexion
├── dashboard.html           # Interface principale
├── CSS/
│   └── admin.css           # Styles de l'admin panel
├── JS/
│   ├── supabase-config.js  # Configuration Supabase
│   ├── auth.js             # Système d'authentification
│   ├── users.js            # Gestion des utilisateurs
│   ├── dashboard.js        # Dashboard principal
│   ├── logs.js             # Système de logs
│   └── admin.js            # Fonctions principales
└── SQL/
    └── admin_schema.sql     # Structure de la base de données
```

## 🔧 Configuration avancée

### Variables d'environnement
Configurez ces variables dans votre environnement :

```javascript
const ADMIN_CONFIG = {
    SUPABASE_URL: 'your-supabase-url',
    SUPABASE_ANON_KEY: 'your-anon-key',
    ADMIN_EMAIL_DOMAIN: '@optiplay.com', // Optionnel: restreindre par domaine
    SESSION_TIMEOUT: 3600000, // 1 heure
    LOG_RETENTION_DAYS: 90
};
```

### Personnalisation des rôles

Modifiez les permissions dans `auth.js` :

```javascript
const ROLE_PERMISSIONS = {
    'super_admin': ['*'], // Toutes les permissions
    'admin': ['users', 'teams', 'reports', 'logs'],
    'moderator': ['reports', 'bans']
};
```

## 📱 Interface utilisateur

### Navigation
- **Dashboard** : Vue d'ensemble et statistiques
- **Utilisateurs** : Gestion complète des utilisateurs
- **Équipes** : Administration des équipes
- **Rapports** : Modération et rapports
- **Logs** : Journaux d'activité
- **Paramètres** : Configuration système

### Fonctionnalités avancées
- **Recherche intelligente** : Recherche dans toutes les sections
- **Filtres dynamiques** : Filtres sauvegardés par section
- **Export de données** : Export CSV/JSON
- **Actions en lot** : Opérations sur plusieurs éléments
- **Historique des actions** : Traçabilité complète

## 🔍 Monitoring et logs

### Types de logs
- **Info** : Actions normales
- **Warning** : Actions nécessitant attention
- **Error** : Erreurs système
- **Critical** : Erreurs critiques nécessitant intervention

### Modules de logging
- **auth** : Authentification
- **users** : Gestion utilisateurs
- **teams** : Gestion équipes
- **subscription** : Abonnements
- **moderation** : Modération
- **system** : Système

## 🚨 Sécurité

### Mesures de protection
- Authentification obligatoire
- Vérification des rôles à chaque action
- Logs de toutes les actions sensibles
- Session timeout automatique
- Protection CSRF (tokens)

### Bonnes pratiques
- Changez régulièrement les mots de passe
- Limitez les accès admin au strict nécessaire
- Surveillez les logs d'activité
- Activez les notifications d'alerte
- Effectuez des sauvegardes régulières

## 🐛 Dépannage

### Problèmes courants

**Erreur de connexion Supabase**
```javascript
// Vérifiez la configuration dans supabase-config.js
console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase Key:', SUPABASE_ANON_KEY);
```

**Problème de permissions**
```sql
-- Vérifiez les politiques RLS dans Supabase
SELECT * FROM admin_users WHERE email = 'votre-email@example.com';
```

**Logs manquants**
```sql
-- Vérifiez la table admin_logs
SELECT COUNT(*) FROM admin_logs;
```

### Support technique
- Consultez les logs dans l'onglet "Logs"
- Vérifiez la console du navigateur
- Testez la connexion Supabase
- Contactez l'équipe de développement

## 📋 Checklist de déploiement

- [ ] Base de données configurée
- [ ] Admin user créé
- [ ] Configuration Supabase mise à jour
- [ ] HTTPS activé
- [ ] Règles de firewall configurées
- [ ] Tests de connexion effectués
- [ ] Logs de déploiement vérifiés
- [ ] Formation équipe admin

## 🔄 Mises à jour

### Procédure de mise à jour
1. Sauvegardez la base de données
2. Mettez à jour les fichiers
3. Exécutez les migrations SQL si nécessaire
4. Testez toutes les fonctionnalités
5. Déployez en production

### Changelog
Les modifications sont documentées dans les logs d'admin pour traçabilité complète.

## 📞 Contact

Pour toute question ou problème :
- Email technique : dev@optiplay.com
- Documentation : https://docs.optiplay.com/admin
- Support : https://support.optiplay.com

---

**⚠️ Important** : Ce panel d'administration contient des données sensibles. Assurez-vous que l'accès est correctement sécurisé et limité aux personnes autorisées uniquement.