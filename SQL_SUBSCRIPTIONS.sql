-- ========================================
-- SYSTÈME D'ABONNEMENTS - OPTIPLAY
-- ========================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 🔹 TABLE DES ABONNEMENTS
-- Stocke les abonnements actifs/passés des utilisateurs
DROP TABLE IF EXISTS subscriptions CASCADE;
CREATE TABLE subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'beginner', 'advanced', 'premium')),
  billing_type TEXT NOT NULL CHECK (billing_type IN ('monthly', 'annual')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'expired', 'past_due')),
  
  -- Prix et paiement
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency TEXT DEFAULT 'EUR',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  
  -- Dates
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  
  -- Métadonnées
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index unique partiel : un utilisateur ne peut avoir qu'un seul abonnement actif
CREATE UNIQUE INDEX idx_subscriptions_user_active 
  ON subscriptions(user_id) 
  WHERE status = 'active';

-- 🔹 TABLE DE L'HISTORIQUE DES PAIEMENTS
DROP TABLE IF EXISTS payments CASCADE;
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informations de paiement
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  
  -- Stripe
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  
  -- Métadonnées
  payment_method TEXT, -- 'card', 'paypal', etc.
  description TEXT,
  receipt_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ========================================
-- INDEX POUR OPTIMISER LES REQUÊTES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Activer RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;

-- Politiques pour subscriptions
CREATE POLICY "Users can view their own subscriptions" 
  ON subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" 
  ON subscriptions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" 
  ON subscriptions FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politiques pour payments
CREATE POLICY "Users can view their own payments" 
  ON payments FOR SELECT 
  USING (auth.uid() = user_id);

-- ========================================
-- TRIGGER POUR UPDATED_AT
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- FONCTIONS UTILITAIRES
-- ========================================

-- Fonction pour obtenir le plan actif d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_active_plan(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_plan TEXT;
BEGIN
  SELECT plan_type INTO v_plan
  FROM subscriptions
  WHERE user_id = p_user_id 
    AND status = 'active'
    AND current_period_end > NOW()
  LIMIT 1;
  
  RETURN COALESCE(v_plan, 'free');
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- VÉRIFICATION
-- ========================================

SELECT 'Tables créées avec succès!' as message;

-- Afficher les tables créées
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('subscriptions', 'payments');