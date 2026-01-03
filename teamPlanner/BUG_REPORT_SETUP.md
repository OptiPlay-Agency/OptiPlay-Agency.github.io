# Configuration du système de rapport de bugs

## 🎯 Aperçu

Le système de rapport de bugs permet aux utilisateurs d'OptiPlay Manager de signaler facilement des problèmes, bugs, ou demander des fonctionnalités directement depuis l'interface. Les rapports sont automatiquement créés comme des issues GitHub.

## 🔧 Configuration requise

### 1. Token GitHub

Pour que les rapports de bugs créent automatiquement des issues GitHub, vous devez configurer un Personal Access Token.

#### Créer un token GitHub :

1. Allez sur GitHub.com
2. **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. Cliquez sur **"Generate new token (classic)"**
4. Nom du token : `OptiPlay Manager Bug Reports`
5. Expiration : Choisissez selon vos préférences
6. Permissions requises :
   - ✅ **repo** (ou seulement **public_repo** si votre repo est public)
   - ✅ **issues:write**

7. Copiez le token généré

#### Configurer le token :

Éditez le fichier `teamPlanner/JS/github-config.js` :

```javascript
const GITHUB_CONFIG = {
  owner: 'OptiPlay-Agency',
  repo: 'OptiPlay-Agency.github.io',
  token: 'ghp_votre_token_ici', // Remplacez par votre token
  // ...
};
```

### 2. Client ID Imgur (optionnel, pour les pièces jointes)

Pour permettre l'upload d'images en pièces jointes :

#### Créer une app Imgur :

1. Allez sur [Imgur API](https://api.imgur.com/oauth2/addclient)
2. Connectez-vous avec votre compte Imgur
3. Remplissez le formulaire :
   - **Application name** : `OptiPlay Manager`
   - **Authorization type** : `Anonymous usage without user authorization`
   - **Authorization callback URL** : Votre URL de site
   - **Application website** : Votre URL de site
   - **Email** : Votre email

4. Copiez le **Client ID** fourni

#### Configurer Imgur :

Éditez le fichier `teamPlanner/JS/github-config.js` :

```javascript
const FILE_UPLOAD_SERVICE = {
  imgur: {
    clientId: 'votre_client_id_imgur', // Remplacez par votre Client ID
    apiUrl: 'https://api.imgur.com/3/image'
  }
};
```

## 🚀 Fonctionnalités

### Interface utilisateur

- **Accès facile** : Bouton "Signaler un bug/problème" dans les paramètres
- **Formulaire complet** : Titre, type, priorité, description, étapes de reproduction
- **Détection automatique** : Navigateur, OS, URL automatiquement détectés
- **Pièces jointes** : Support drag & drop pour images, PDF, fichiers texte

### Gestion des données

- **GitHub Issues** : Création automatique d'issues avec labels appropriés
- **Sauvegarde locale** : Si GitHub API échoue, sauvegarde en localStorage
- **Upload d'images** : Via Imgur API pour les captures d'écran
- **Informations techniques** : URL, timestamp, données utilisateur

### Labels GitHub automatiques

- `bug-report` : Identifie les rapports utilisateur
- `manager` : Issues venant d'OptiPlay Manager
- `priority-{low|medium|high|critical}` : Niveau de priorité
- `type-{bug|feature|improvement|performance|ui|docs|other}` : Type de problème
- `user-report` : Issues créées par les utilisateurs

## 📋 Utilisation pour les utilisateurs

1. **Ouvrir le rapport** : Paramètres → "Signaler un bug/problème"
2. **Remplir le formulaire** :
   - Titre court et descriptif
   - Type de problème
   - Niveau de priorité
   - Description détaillée
   - Étapes pour reproduire (optionnel)
   - Email de contact (pré-rempli)

3. **Ajouter des pièces jointes** (optionnel) :
   - Glisser-déposer ou cliquer pour sélectionner
   - Images, PDF, fichiers texte supportés
   - Max 10MB par fichier

4. **Envoyer** : Le rapport devient automatiquement une issue GitHub

## 🔒 Sécurité et confidentialité

- **Données minimales** : Seules les informations nécessaires sont collectées
- **Pas de données sensibles** : Aucun mot de passe ou token utilisateur n'est transmis
- **Email optionnel** : L'utilisateur choisit s'il veut être contacté
- **Sauvegarde locale** : Fallback si l'API GitHub est indisponible

## 🐛 Fallback sans configuration

Si aucun token GitHub n'est configuré :

1. Le rapport est sauvegardé dans `localStorage`
2. L'utilisateur reçoit une notification avec instructions
3. Les données peuvent être récupérées via la console du navigateur :
   ```javascript
   console.log(JSON.parse(localStorage.getItem('optiplay-bug-reports')))
   ```

## 📊 Suivi des issues

Une fois configuré, vous pouvez suivre tous les rapports sur votre repository GitHub :

- **URL** : `https://github.com/OptiPlay-Agency/OptiPlay-Agency.github.io/issues`
- **Filtres utiles** :
  - `label:bug-report` : Tous les rapports utilisateur
  - `label:priority-high` : Issues haute priorité
  - `label:type-bug` : Bugs uniquement
  - `label:manager` : Issues d'OptiPlay Manager

## 🔧 Customisation

Vous pouvez modifier dans `bug-report.js` :

- **Types de problèmes** : Modifier les options du select `bug-type`
- **Niveaux de priorité** : Modifier les options du select `bug-priority`
- **Template d'issue** : Modifier la fonction `formatIssueBody()`
- **Labels GitHub** : Modifier dans `github-config.js`
- **Types de fichiers** : Modifier l'attribut `accept` du input file

## 💡 Recommandations

1. **Surveillez régulièrement** les nouvelles issues GitHub
2. **Triez par priorité** pour traiter les problèmes critiques en premier
3. **Communiquez** avec les utilisateurs via les commentaires GitHub
4. **Fermez les issues** résolues pour maintenir un backlog propre
5. **Créez des templates** GitHub pour standardiser les réponses