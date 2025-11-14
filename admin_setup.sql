-- Configuração do Painel Administrativo

-- 1. Criar tabela de administradores
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- 2. Criar tabela de produtos em destaque
CREATE TABLE IF NOT EXISTS featured_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  price DECIMAL(10,2),
  images TEXT[] DEFAULT '{}',
  description TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  order_position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id)
);

-- 3. Habilitar RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_products ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para admin_users
DROP POLICY IF EXISTS "Admin users can view their own record" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admins" ON admin_users;

CREATE POLICY "Admin users can view their own record" ON admin_users
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all admins" ON admin_users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- 5. Políticas RLS para featured_products
DROP POLICY IF EXISTS "Anyone can view active featured products" ON featured_products;
DROP POLICY IF EXISTS "Admins can manage featured products" ON featured_products;

CREATE POLICY "Anyone can view active featured products" ON featured_products
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage featured products" ON featured_products
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_featured_products_active ON featured_products(is_active, order_position);
CREATE INDEX IF NOT EXISTS idx_featured_products_created_at ON featured_products(created_at DESC);

-- 7. Trigger para updated_at
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP TRIGGER IF EXISTS update_featured_products_updated_at ON featured_products;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_featured_products_updated_at
    BEFORE UPDATE ON featured_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Inserir primeiro admin (substitua pelo seu user_id)
-- IMPORTANTE: Execute esta query separadamente com seu user_id real
-- INSERT INTO admin_users (user_id, email, role)
-- VALUES ('SEU_USER_ID_AQUI', 'seu-email@exemplo.com', 'super_admin');