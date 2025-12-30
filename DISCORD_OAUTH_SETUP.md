# 🎮 Configuration Discord OAuth - Guide complet

## ✅ Ce qui a été fait
- ✅ Onglet "Connexions" ajouté dans les paramètres
- ✅ Interface pour lier/délier Discord
- ✅ Code JavaScript prêt pour gérer l'authentification
- ✅ Design avec icônes et statuts

## 📋 Étapes à suivre

### 1️⃣ Créer une application Discord

1. **Va sur Discord Developer Portal**
   - 🔗 https://discord.com/developers/applications
   - Connecte-toi avec ton compte Discord

2. **Créer une nouvelle application**
   - Clique sur **"New Application"**
   - Nom: `OptiPlay` (ou le nom que tu veux)
   - Accepte les conditions
   - Clique sur **"Create"**

3. **Récupérer les informations**
   - Dans l'onglet **"General Information"**
   - **Copie l'APPLICATION ID** → C'est ton **CLIENT ID** ✅ 1455509477280317451
   - ⚠️ **Ne prends PAS la Public Key** (pas nécessaire pour OAuth) 2aPN2z7m6NAC6e9fc-P3fWeWXoJDPYv7
   
   - Maintenant va dans l'onglet **"OAuth2"**
   - Dans la section **"Client information"**
   - **Copie le CLIENT SECRET** (clique sur "Reset Secret" si tu ne le vois pas)
   - ⚠️ **Sauvegarde-le quelque part**, tu ne pourras le voir qu'une fois !

### 2️⃣ Configurer les redirections

1. **Toujours dans OAuth2**
   - Trouve la section **"Redirects"**
   - Ajoute ces URLs (remplace par ton domaine réel):
   ```
   http://localhost:8000/HTML/settings.html
   https://optiplay-agency.github.io/HTML/settings.html
   ```
   - Clique sur **"Save Changes"**

2. **Configurer les scopes**
   - Dans OAuth2 → URL Generator
   - Sélectionne: `identify` et `email`

### 3️⃣ Configurer Supabase

1. **Va dans ton Dashboard Supabase**
   - 🔗 https://supabase.com/dashboard

2. **Authentication → Providers**
   - Trouve **"Discord"**
   - Active le toggle **"Enable Sign in with Discord"**

3. **Remplir les informations**
   ```
   Client ID: [Colle ton CLIENT ID de Discord]
   Client Secret: [Colle ton CLIENT SECRET de Discord]
   ```

4. **Redirect URL (Important !)**
   - Supabase te donne une URL comme:
   ```
   https://[TON_PROJET].supabase.co/auth/v1/callback
   ```
   - **COPIE cette URL**
   - **Retourne sur Discord Developer Portal**
   - **Ajoute cette URL dans les Redirects**

5. **Sauvegarder**
   - Clique sur **"Save"** dans Supabase

### 4️⃣ Tester la liaison Discord

1. **Ouvre ton site OptiPlay**
   - Va dans **Paramètres** → **Connexions**

2. **Clique sur "Lier Discord"**
   - Tu seras redirigé vers Discord
   - Autorise l'application
   - Tu seras redirigé vers les paramètres
   - Discord devrait apparaître comme "Lié" ✅

### 5️⃣ Permettre l'inscription/connexion avec Discord

**Pour permettre aux nouveaux utilisateurs de s'inscrire avec Discord:**

1. **Modifier login.html et register.html**
   - Ajoute un bouton "Se connecter avec Discord"
   - Code exemple:
   ```javascript
   async function loginWithDiscord() {
     const { data, error } = await supabase.auth.signInWithOAuth({
       provider: 'discord',
       options: {
         redirectTo: `${window.location.origin}/HTML/dashboard.html`
       }
     });
   }
   ```

2. **Le bouton HTML**
   ```html
   <button onclick="loginWithDiscord()" class="btn-discord">
     <i class="fab fa-discord"></i>
     Se connecter avec Discord
   </button>
   ```

## 🎨 Design Discord

Les couleurs Discord officielles sont déjà dans le CSS:
- Couleur principale: `#5865F2`
- Hover: `#4752C4`

## 🔒 Sécurité

- ✅ Les secrets sont dans Supabase (jamais dans le code)
- ✅ Row Level Security (RLS) activé
- ✅ Seul l'utilisateur peut voir/modifier ses identités

## ❓ Problèmes courants

### "Invalid redirect URL"
- Vérifie que l'URL de callback Supabase est dans Discord
- Vérifie qu'il n'y a pas d'espaces ou caractères bizarres

### "Discord non lié après autorisation"
- Attends 5-10 secondes et recharge la page
- Vérifie les logs de la console (F12)
- Vérifie que les identités sont dans `auth.users`

### "Bouton ne fait rien"
- Ouvre la console (F12)
- Regarde les erreurs
- Vérifie que Supabase est bien chargé

## 📞 Support

Si ça ne marche pas:
1. Regarde les logs de la console
2. Vérifie les URLs de redirection
3. Vérifie que Discord est activé dans Supabase
4. Teste avec un compte Discord test

## ✨ Fonctionnalités implémentées

✅ Lier Discord à un compte existant
✅ Délier Discord
✅ Afficher le nom d'utilisateur Discord
✅ Design avec icône et statut
✅ Messages d'erreur/succès
✅ Redirection automatique après liaison

## 🚀 Prochaines étapes (optionnel)

- [ ] Ajouter Google OAuth
- [ ] Ajouter GitHub OAuth
- [ ] Afficher l'avatar Discord
- [ ] Synchroniser le pseudo Discord avec OptiPlay
- [ ] Notifications Discord pour les nouveaux produits

---

**Temps estimé:** 10-15 minutes
**Difficulté:** Facile ⭐
**Pré-requis:** Compte Discord, accès Supabase
