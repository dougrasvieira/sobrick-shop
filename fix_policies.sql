-- Corrigir recursão infinita nas políticas RLS

-- Remover todas as políticas problemáticas
DROP POLICY IF EXISTS "Admin users can view their own record" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admins" ON admin_users;
DROP POLICY IF EXISTS "Anyone can view active featured products" ON featured_products;
DROP POLICY IF EXISTS "Admins can manage featured products" ON featured_products;

-- Políticas simplificadas para admin_users
CREATE POLICY "admin_users_policy" ON admin_users
FOR ALL USING (auth.uid() = user_id);

-- Políticas simplificadas para featured_products
CREATE POLICY "featured_products_read_policy" ON featured_products
FOR SELECT USING (is_active = true);

CREATE POLICY "featured_products_admin_policy" ON featured_products
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);