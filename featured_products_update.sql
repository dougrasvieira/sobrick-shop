-- Adicionar colunas específicas para configurações do swiper em featured_products
ALTER TABLE featured_products
ADD COLUMN IF NOT EXISTS swiper_main_text TEXT DEFAULT 'Anuncie aqui',
ADD COLUMN IF NOT EXISTS swiper_subtitle TEXT DEFAULT 'Anúncios a partir de',
ADD COLUMN IF NOT EXISTS swiper_price TEXT DEFAULT 'R$ 50,00',
ADD COLUMN IF NOT EXISTS show_in_swiper BOOLEAN DEFAULT false;