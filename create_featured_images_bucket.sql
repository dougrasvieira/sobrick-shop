-- Criar bucket para imagens dos produtos em destaque
INSERT INTO storage.buckets (id, name, public)
VALUES ('featured_images', 'featured_images', true);

-- Políticas para o bucket featured_images
CREATE POLICY "Imagens em destaque são públicas" ON storage.objects
FOR SELECT USING (bucket_id = 'featured_images');

CREATE POLICY "Admins podem fazer upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'featured_images' AND
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "Admins podem atualizar imagens" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'featured_images' AND
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "Admins podem deletar imagens" ON storage.objects
FOR DELETE USING (
  bucket_id = 'featured_images' AND
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);