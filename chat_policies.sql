-- Políticas RLS para a tabela chats

-- Habilitar RLS na tabela chats
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários podem ver chats onde são buyer ou seller
CREATE POLICY "Users can view their own chats" ON chats
FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Política para INSERT: usuários podem criar chats onde são buyer ou seller
CREATE POLICY "Users can create chats" ON chats
FOR INSERT WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Política para UPDATE: usuários podem atualizar chats onde são buyer ou seller
CREATE POLICY "Users can update their own chats" ON chats
FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Política para DELETE: usuários podem deletar chats onde são buyer ou seller
CREATE POLICY "Users can delete their own chats" ON chats
FOR DELETE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);