-- Criar tabela de ratings
CREATE TABLE IF NOT EXISTS ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Habilitar RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can view all ratings" ON ratings;
DROP POLICY IF EXISTS "Users can insert their own ratings" ON ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON ratings;

-- Políticas RLS corrigidas
CREATE POLICY "ratings_select_policy" ON ratings
FOR SELECT USING (true);

CREATE POLICY "ratings_insert_policy" ON ratings
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ratings_update_policy" ON ratings
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "ratings_delete_policy" ON ratings
FOR DELETE USING (auth.uid() = user_id);

-- Alterar tipo da coluna product_id se necessário
ALTER TABLE ratings ALTER COLUMN product_id TYPE TEXT;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_ratings_product_id ON ratings(product_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);