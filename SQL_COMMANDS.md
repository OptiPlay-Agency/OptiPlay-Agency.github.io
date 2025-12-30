# Commandes SQL à exécuter dans Supabase

## 📋 Instructions

1. Ouvrir le **SQL Editor** dans Supabase
2. Copier-coller TOUT le contenu ci-dessous
3. Cliquer sur **Run** (ou Ctrl+Enter)
4. Vérifier que tout s'est bien passé (pas d'erreurs)

---

## 🗃️ SQL COMPLET

```sql
-- ========================================
-- CRÉATION DES TABLES POUR LE SYSTÈME DE BIBLIOTHÈQUE
-- ========================================

-- Extension pour UUID (si pas déjà activée)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1️⃣ TABLE DES PRODUITS
-- Contient tous les produits disponibles sur OptiPlay
DROP TABLE IF EXISTS products CASCADE;
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT,
  price DECIMAL(10,2) DEFAULT 0.00,
  pricing_type TEXT DEFAULT 'free' CHECK (pricing_type IN ('free', 'one-time', 'subscription')),
  is_available BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2️⃣ TABLE DE LA BIBLIOTHÈQUE UTILISATEUR
-- Contient les produits ajoutés par chaque utilisateur
DROP TABLE IF EXISTS user_library CASCADE;
CREATE TABLE user_library (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_url TEXT NOT NULL,
  product_image TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  last_accessed TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(user_id, product_id)
);

-- ========================================
-- INDEX POUR OPTIMISER LES REQUÊTES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_user_library_user_id ON user_library(user_id);
CREATE INDEX IF NOT EXISTS idx_user_library_product_id ON user_library(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Activer RLS
ALTER TABLE user_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view their own library" ON user_library;
DROP POLICY IF EXISTS "Users can add to their own library" ON user_library;
DROP POLICY IF EXISTS "Users can delete from their own library" ON user_library;
DROP POLICY IF EXISTS "Anyone can view available products" ON products;

-- Politiques pour user_library
CREATE POLICY "Users can view their own library" 
  ON user_library FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own library" 
  ON user_library FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own library" 
  ON user_library FOR DELETE 
  USING (auth.uid() = user_id);

-- Politique pour products
CREATE POLICY "Anyone can view available products" 
  ON products FOR SELECT 
  USING (is_available = true);

-- ========================================
-- TRIGGER POUR UPDATED_AT
-- ========================================

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur products
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- DONNÉES INITIALES
-- ========================================

-- Insérer OptiPlay Manager
INSERT INTO products (id, name, description, category, url, image_url, price, pricing_type, is_available) 
VALUES (
  'optiplay-manager',
  'OptiPlay Manager',
  'Gestion complète d''équipes eSport avec calendrier, gestion des scrims, statistiques détaillées et communication intégrée. Un outil indispensable pour les structures eSport professionnelles.',
  'misc',
  '../teamPlanner/HTML/manager.html',
  '../assets/manager-screenshot-1.svg',
  0.00,
  'free',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  url = EXCLUDED.url,
  image_url = EXCLUDED.image_url,
  price = EXCLUDED.price,
  pricing_type = EXCLUDED.pricing_type,
  is_available = EXCLUDED.is_available;

-- ========================================
-- VÉRIFICATION
-- ========================================

-- Afficher les tables créées
SELECT 'Tables créées avec succès!' as message;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'user_library');

-- Afficher les produits
SELECT * FROM products;
```

---

## 💰 Exemples de produits à ajouter

### Produit gratuit
```sql
INSERT INTO products (id, name, description, category, url, image_url, price, pricing_type, is_available)
VALUES ('mon-bot-gratuit', 'Bot Discord Gratuit', 'Description...', 'bot', '../url.html', '../image.svg', 0.00, 'free', true);
```

### Produit payant (achat unique)
```sql
INSERT INTO products (id, name, description, category, url, image_url, price, pricing_type, is_available)
VALUES ('site-premium', 'Site Web Premium', 'Description...', 'application', '../url.html', '../image.svg', 49.99, 'one-time', true);
```

### Produit par abonnement
```sql
INSERT INTO products (id, name, description, category, url, image_url, price, pricing_type, is_available)
VALUES ('bot-premium', 'Bot Premium', 'Description...', 'bot', '../url.html', '../image.svg', 9.99, 'subscription', true);
```

---

## ✅ Vérification

Après exécution, vous devriez voir :

1. **Message** : "Tables créées avec succès!"
2. **Liste des tables** : `products` et `user_library`
3. **Produit OptiPlay Manager** avec toutes ses informations

## 🧪 Tests SQL

### Voir tous les produits disponibles

```sql
SELECT * FROM products WHERE is_available = true;
```

### Voir la bibliothèque d'un utilisateur (remplacez l'UUID)

```sql
SELECT * FROM user_library WHERE user_id = 'VOTRE_UUID_ICI';
```

### Compter les produits dans la bibliothèque

```sql
SELECT COUNT(*) as total FROM user_library;
```

---

## 🚨 En cas d'erreur

### Si "relation already exists"

C'est normal si vous réexécutez le script. Les `DROP TABLE IF EXISTS` gèrent ça.

### Si "permission denied"

Vérifiez que vous êtes connecté en tant qu'admin dans Supabase.

### Si problème avec auth.users

Vérifiez que l'authentification est activée dans Supabase.

---

## 📝 Notes

- Les politiques RLS assurent que chaque utilisateur voit uniquement **sa** bibliothèque
- La contrainte `UNIQUE(user_id, product_id)` empêche d'ajouter le même produit deux fois
- Le trigger `updated_at` se met à jour automatiquement lors de modifications
- **Types de prix** :
  - `free` : Gratuit (price = 0.00)
  - `one-time` : Achat unique (price > 0)
  - `subscription` : Abonnement mensuel/annuel (price > 0)

---

## 🎯 Prochaines étapes

Après l'exécution SQL :

1. ✅ Tester en ajoutant OptiPlay Manager à votre bibliothèque depuis le site
2. ✅ Vérifier que le produit apparaît dans votre profil
3. ✅ Tester le modal produit
4. ✅ Vérifier que le bouton "Accéder" fonctionne

---

**Fait par OptiPlay** 🎮
