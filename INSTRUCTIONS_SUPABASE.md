# 🚀 Instructions Supabase - OptiPlay

## Étape 1 : Créer la base de données

1. Va sur [Supabase Dashboard](https://app.supabase.com/)
2. Sélectionne ton projet
3. Va dans **SQL Editor** (dans le menu à gauche)
4. Clique sur **New Query**
5. Copie-colle le contenu du fichier `database_setup.sql`
6. Clique sur **Run** (ou Ctrl+Entrée)

✅ Cela va créer :
- La table `profiles` avec la colonne `pseudo`
- Les tables `products`, `purchases`, `downloads`
- Les politiques de sécurité RLS
- Un trigger pour créer automatiquement un profil à l'inscription

## Étape 2 : Vérifier la création

Va dans **Table Editor** et vérifie que tu as ces tables :
- ✅ `profiles`
- ✅ `products`
- ✅ `purchases`
- ✅ `downloads`

## Étape 3 : Tester l'inscription

1. Sur ton site, crée un nouveau compte
2. Le trigger devrait automatiquement créer une ligne dans `profiles` avec :
   - `id` = UUID de l'utilisateur
   - `pseudo` = partie avant le @ de l'email

## Étape 4 : Modifier un profil

1. Connecte-toi sur ton site
2. Va dans **Paramètres**
3. Modifie ton pseudo, prénom, nom
4. Clique sur **Enregistrer les modifications**
5. Les données devraient être enregistrées dans la table `profiles`

## 🔧 Commandes SQL utiles

### Voir tous les profils
```sql
SELECT * FROM profiles;
```

### Voir un profil spécifique
```sql
SELECT * FROM profiles WHERE pseudo = 'ton_pseudo';
```

### Modifier un pseudo manuellement
```sql
UPDATE profiles 
SET pseudo = 'nouveau_pseudo' 
WHERE id = 'ton-user-id';
```

### Voir tous les utilisateurs et leurs profils
```sql
SELECT 
  u.email,
  p.pseudo,
  p.first_name,
  p.last_name,
  p.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id;
```

## ⚠️ Dépannage

### Erreur "relation profiles does not exist"
→ Tu n'as pas encore créé la table, retourne à l'Étape 1

### Le profil ne se crée pas automatiquement
→ Vérifie que le trigger existe :
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

Si le trigger n'existe pas, réexécute la partie du script qui le crée.

### Le bouton Enregistrer ne fonctionne pas
→ Ouvre la console (F12), vérifie les erreurs
→ Vérifie que les RLS policies sont bien créées
→ Vérifie que tu es bien connecté

### La colonne pseudo n'existe pas
→ Exécute cette commande :
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pseudo TEXT UNIQUE;
```

## ✨ Fonctionnalités disponibles

Après avoir exécuté le script SQL :

✅ **Profil automatique** : Un profil est créé automatiquement à l'inscription
✅ **Modification du pseudo** : Dans Paramètres > Compte
✅ **Modification des infos** : Prénom, nom, bio
✅ **Sécurité RLS** : Chaque utilisateur ne voit que son propre profil
✅ **Liaison OAuth** : Google et Discord (après configuration)
✅ **Produits de démo** : 5 produits insérés automatiquement

---

**Besoin d'aide ?** Vérifie les logs dans la console du navigateur (F12)
