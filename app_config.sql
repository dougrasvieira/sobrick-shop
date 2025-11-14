-- Criar tabela de configurações do app
CREATE TABLE IF NOT EXISTS app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS na tabela app_config
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para app_config
DROP POLICY IF EXISTS "app_config_select_policy" ON app_config;
CREATE POLICY "app_config_select_policy" ON app_config FOR SELECT USING (true);

-- Inserir configurações padrão
INSERT INTO app_config (key, value, description) VALUES
('swiper_main_text', 'Anuncie aqui', 'Texto principal do swiper quando não há produtos'),
('swiper_subtitle', 'Anúncios a partir de', 'Subtítulo do swiper'),
('swiper_price', 'R$ 50,00', 'Preço exibido no swiper'),
('product_details_title', 'Produtos em destaque', 'Título do header na página de detalhes do produto'),
('header_name', 'João Silva', 'Nome do vendedor no header'),
('header_location', 'Palmas-PR, São Francisco', 'Localização no header'),
('current_header_name', 'João Silva', 'Nome do vendedor atual no grid'),
('current_header_location', 'Palmas-PR, São Francisco', 'Localização atual no grid')
ON CONFLICT (key) DO NOTHING;

-- Habilitar RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Configurações são públicas para leitura" ON app_config
FOR SELECT USING (true);

CREATE POLICY "Apenas admins podem modificar configurações" ON app_config
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_app_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_app_config_updated_at ON app_config;
CREATE TRIGGER update_app_config_updated_at
    BEFORE UPDATE ON app_config
    FOR EACH ROW EXECUTE FUNCTION update_app_config_updated_at();