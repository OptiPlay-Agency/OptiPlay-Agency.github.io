-- Commandes SQL pour créer les tables nécessaires au système de bibliothèque

-- 1. Table des produits disponibles
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'application', 'automation', 'bot', 'misc'
  url TEXT NOT NULL,
  image_url TEXT,
  price DECIMAL(10,2) DEFAULT 0.00,
  pricing_type TEXT DEFAULT 'free' CHECK (pricing_type IN ('free', 'one-time', 'subscription')),
  is_available BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Table de la bibliothèque utilisateur (produits ajoutés)
CREATE TABLE IF NOT EXISTS user_library (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_url TEXT NOT NULL,
  product_image TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  last_accessed TIMESTAMP WITH TIME ZONE,
  
  -- Contrainte unique pour éviter les doublons
  UNIQUE(user_id, product_id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_user_library_user_id ON user_library(user_id);
CREATE INDEX IF NOT EXISTS idx_user_library_product_id ON user_library(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Activer Row Level Security (RLS)
ALTER TABLE user_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour user_library : les utilisateurs peuvent seulement voir/modifier leurs propres données
CREATE POLICY "Users can view their own library" 
  ON user_library FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own library" 
  ON user_library FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own library" 
  ON user_library FOR DELETE 
  USING (auth.uid() = user_id);

-- Politique RLS pour products : tout le monde peut voir les produits disponibles
CREATE POLICY "Anyone can view available products" 
  ON products FOR SELECT 
  USING (is_available = true);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour products
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insérer OptiPlay Manager comme premier produit
INSERT INTO products (id, name, description, category, url, image_url, price, pricing_type, is_available) 
VALUES (
  'optiplay-manager',
  'OptiPlay Manager',
  'Gestion complète d''équipes eSport avec calendrier, gestion des scrims, statistiques détaillées et communication intégrée.',
  'misc',
  '../teamPlanner/HTML/manager.html',
  '../assets/manager-screenshot-1.svg',
  0.00,
  'free',
  true
) ON CONFLICT (id) DO NOTHING;

-- Commande pour voir tous les produits d'un utilisateur :
-- SELECT * FROM user_library WHERE user_id = auth.uid();

-- Commande pour ajouter un produit à la bibliothèque :
-- INSERT INTO user_library (user_id, product_id, product_name, product_url, product_image)
-- VALUES (auth.uid(), 'optiplay-manager', 'OptiPlay Manager', '../teamPlanner/HTML/manager.html', '../assets/manager-screenshot-1.svg');

-- Commande pour retirer un produit de la bibliothèque :
-- DELETE FROM user_library WHERE user_id = auth.uid() AND product_id = 'optiplay-manager';
