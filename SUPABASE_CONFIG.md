# Configuration OAuth pour Supabase

Ce guide explique comment configurer l'authentification Google et Discord dans votre projet Supabase.

## 📋 Prérequis

- Un compte Supabase actif
- Accès au Dashboard Supabase de votre projet
- URL de votre projet : `https://kunvgegumrfpizjvikbk.supabase.co`

---

## 🔐 Configuration Google OAuth

### 1. Créer une application Google

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez l'**API Google+ API** pour votre projet
4. Allez dans **Identifiants** (Credentials) dans le menu
5. Cliquez sur **Créer des identifiants** > **ID client OAuth 2.0**
6. Configurez l'écran de consentement OAuth si ce n'est pas déjà fait
7. Pour le type d'application, sélectionnez **Application Web**

### 2. Configurer les URI de redirection

Dans la configuration de votre client OAuth Google, ajoutez ces URIs autorisées :

**URIs de redirection autorisées :**
```
https://kunvgegumrfpizjvikbk.supabase.co/auth/v1/callback
```

**Origines JavaScript autorisées :**
```
https://optiplay-agency.github.io
http://localhost:5500
http://127.0.0.1:5500
```

### 3. Récupérer les identifiants

Après la création, vous recevrez :
- **Client ID** : ressemble à `xxxxx.apps.googleusercontent.com`
- **Client Secret** : chaîne de caractères secrète

### 4. Configurer dans Supabase

1. Allez sur votre [Dashboard Supabase](https://app.supabase.com/)
2. Sélectionnez votre projet
3. Allez dans **Authentication** > **Providers**
4. Trouvez **Google** dans la liste
5. Activez le provider
6. Entrez votre **Client ID** et **Client Secret**
7. Cliquez sur **Save**

---

## 🎮 Configuration Discord OAuth

### 1. Créer une application Discord

1. Allez sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Cliquez sur **New Application**
3. Donnez un nom à votre application (ex: "OptiPlay")
4. Acceptez les conditions et créez l'application

### 2. Configurer OAuth2

1. Dans le menu de gauche, cliquez sur **OAuth2**
2. Copiez votre **Client ID** et **Client Secret**
3. Dans la section **Redirects**, ajoutez cette URL :

```
https://kunvgegumrfpizjvikbk.supabase.co/auth/v1/callback
```

### 3. Configurer les scopes

Dans la section OAuth2 de Discord, assurez-vous que ces scopes sont disponibles :
- `identify` - Permet d'obtenir les informations de base de l'utilisateur
- `email` - Permet d'obtenir l'email de l'utilisateur

### 4. Configurer dans Supabase

1. Allez sur votre [Dashboard Supabase](https://app.supabase.com/)
2. Sélectionnez votre projet
3. Allez dans **Authentication** > **Providers**
4. Trouvez **Discord** dans la liste
5. Activez le provider
6. Entrez votre **Client ID** et **Client Secret**
7. Cliquez sur **Save**

---

## ✅ Vérification de la configuration

### Test de l'authentification

1. Ouvrez votre site : `https://optiplay-agency.github.io`
2. Allez sur la page de connexion ou d'inscription
3. Cliquez sur le bouton **Google** ou **Discord**
4. Vous devriez être redirigé vers la page d'autorisation
5. Après autorisation, vous serez redirigé vers `index.html` connecté

### Vérifier les comptes liés

1. Connectez-vous avec email/mot de passe
2. Allez dans **Paramètres** > onglet **Sécurité**
3. Dans la section **Comptes liés**, vous pouvez :
   - Lier un compte Google ou Discord existant
   - Voir les comptes déjà liés
   - Délier un compte si nécessaire

---

## 🔧 Dépannage

### Erreur "redirect_uri_mismatch"

**Cause :** L'URI de redirection ne correspond pas à celle configurée dans Google/Discord

**Solution :**
1. Vérifiez que l'URL exacte est ajoutée dans la console Google/Discord
2. L'URL doit être : `https://kunvgegumrfpizjvikbk.supabase.co/auth/v1/callback`
3. N'oubliez pas le `https://` et le `/auth/v1/callback`

### Erreur "Invalid provider"

**Cause :** Le provider n'est pas activé dans Supabase

**Solution :**
1. Allez dans **Authentication** > **Providers**
2. Vérifiez que Google/Discord est activé (toggle ON)
3. Vérifiez que les identifiants sont correctement renseignés

### La liaison de compte ne fonctionne pas

**Cause :** L'utilisateur doit être connecté pour lier un compte

**Solution :**
1. Assurez-vous d'être connecté avec un compte email/password
2. Les comptes OAuth ne peuvent être liés qu'à un compte existant
3. Vérifiez que `linkIdentity()` est utilisé et non `signInWithOAuth()`

### L'email est différent

**Problème :** L'email Google/Discord diffère de l'email du compte existant

**Solution :**
- Supabase permet de lier plusieurs identités OAuth à un même compte
- L'email principal reste celui du compte de base
- Les identités liées apparaissent dans `user.identities`

---

## 📊 Structure des données utilisateur

Quand un utilisateur se connecte via OAuth, voici ce que Supabase stocke :

```javascript
{
  id: "uuid",
  email: "user@example.com",
  identities: [
    {
      provider: "google",
      id: "google-user-id",
      identity_data: {
        email: "user@gmail.com",
        name: "John Doe",
        picture: "https://..."
      }
    },
    {
      provider: "discord",
      id: "discord-user-id",
      identity_data: {
        email: "user@discord.com",
        username: "johndoe#1234",
        avatar: "https://..."
      }
    }
  ]
}
```

---

## 🚀 URL importantes

- **Supabase Dashboard** : https://app.supabase.com/
- **Google Cloud Console** : https://console.cloud.google.com/
- **Discord Developer Portal** : https://discord.com/developers/applications
- **Votre projet Supabase** : https://kunvgegumrfpizjvikbk.supabase.co

---

## 💡 Conseils

1. **Testez en local d'abord** : Ajoutez `http://localhost:5500` dans les origines autorisées
2. **Mode production** : Utilisez HTTPS uniquement en production
3. **Sécurité** : Ne partagez jamais vos Client Secrets
4. **Logs** : Utilisez la console développeur pour déboguer les erreurs OAuth
5. **Supabase Auth Logs** : Consultez les logs dans Supabase > Authentication > Logs

---

## 📱 Code implémenté

### Connexion OAuth (login.html & register.html)

```javascript
// Google
await supabaseClient.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: window.location.origin + '/index.html'
  }
});

// Discord
await supabaseClient.auth.signInWithOAuth({
  provider: 'discord',
  options: {
    redirectTo: window.location.origin + '/index.html'
  }
});
```

### Liaison de compte (settings.js)

```javascript
// Lier un compte
await this.supabase.auth.linkIdentity({
  provider: 'google', // ou 'discord'
  options: {
    redirectTo: window.location.href
  }
});

// Délier un compte
await this.supabase.auth.unlinkIdentity(identity);
```

---

## ✨ Fonctionnalités disponibles

- ✅ Connexion avec Google
- ✅ Connexion avec Discord
- ✅ Inscription avec Google
- ✅ Inscription avec Discord
- ✅ Liaison de comptes multiples
- ✅ Déliaison de comptes
- ✅ Affichage des comptes liés dans les paramètres
- ✅ Redirection après authentification

---

Besoin d'aide ? Consultez la [documentation Supabase Auth](https://supabase.com/docs/guides/auth/social-login)
