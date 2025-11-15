import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EmojiPicker, { Categories } from 'emoji-picker-react';
import UserInfo from './UserInfo';
import { supabase } from '../supabaseClient';

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
}

interface UserProfile {
  id?: string;
  full_name: string;
  avatar_url: string;
  last_seen?: string;
}

interface OtherUserProfile {
  id: string;
  name: string;
  avatar_url: string;
  is_online: boolean;
  last_seen?: string;
}

const Chat: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const conversation = location.state as { avatar: string; name: string; chatId: string; otherUserId: string; isOnline?: boolean; productId?: string; id?: string };
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserProfile, setOtherUserProfile] = useState<OtherUserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [actualChatId, setActualChatId] = useState<string>(conversation.chatId);
  const [user, setUser] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);

  const loadMessages = async () => {
    if (!conversation?.chatId || !user) return;

    try {
      setCurrentUserId(user.id);

      // Buscar perfil do usuário atual
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', user.id)
        .single();
      setCurrentUserProfile(userProfile);

      // Usar otherUserId como seller, user como buyer
      const buyerId = user.id;
      const sellerId = conversation.otherUserId;

      // Buscar chat existente por id
      let { data: chat } = await supabase
        .from('chats')
        .select('id, buyer_id, seller_id, messages, created_at, updated_at')
        .eq('id', conversation.chatId)
        .single();

      if (!chat) {
        // Criar novo chat se não existir
        const { data: newChat, error } = await supabase
          .from('chats')
          .insert({
            id: conversation.chatId,
            product_id: conversation.productId || '00000000-0000-0000-0000-000000000000', // Valor padrão se não houver productId
            buyer_id: buyerId,
            seller_id: sellerId,
            messages: []
          })
          .select()
          .single();

        if (error) {
          console.error('Erro ao criar chat:', error);
          // Tentar buscar novamente por id
          const { data: existingChat } = await supabase
            .from('chats')
            .select('id, buyer_id, seller_id, messages, created_at, updated_at')
            .eq('id', conversation.chatId)
            .single();
          chat = existingChat;
        } else {
          chat = newChat;
        }
      }

      if (chat) {
        setActualChatId(chat.id);
      }

      // Buscar perfil do outro usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', conversation.otherUserId)
        .single();

      setOtherUserProfile({
        id: profile?.id,
        name: profile?.full_name,
        avatar_url: profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name?.charAt(0)}&background=57da74&color=fff&size=128`,
        is_online: profile?.last_seen && (Date.now() - new Date(profile.last_seen).getTime()) < 5 * 60 * 1000,
        last_seen: profile?.last_seen
      });

      // Marcar mensagens recebidas como lidas
       const updatedMessages = (chat?.messages || []).map((msg: ChatMessage) => ({
         ...msg,
         is_read: msg.sender_id !== user.id ? true : msg.is_read
       }));

       // Atualizar no banco se houver mudanças
       if (JSON.stringify(chat?.messages) !== JSON.stringify(updatedMessages)) {
        await supabase
          .from('chats')
          .update({ messages: updatedMessages })
          .eq('id', actualChatId);
      }

      // Definir mensagens
      setMessages(updatedMessages);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  };

  const createChatIfNotExists = async () => {
    const buyerId = user.id;
    const sellerId = conversation.otherUserId;

    const { data: newChat, error } = await supabase
      .from('chats')
      .insert({
        id: actualChatId,
        product_id: conversation.productId || '00000000-0000-0000-0000-000000000000',
        buyer_id: buyerId,
        seller_id: sellerId,
        messages: []
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar chat:', error);
      throw error;
    }

    return newChat;
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !conversation?.chatId || !user) return;

    setSending(true);
    try {
      // Atualizar last_seen do usuário atual
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);

      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        content: message.trim(),
        sender_id: user.id,
        created_at: new Date().toISOString(),
        is_read: false
      };

      // Buscar chat atual
      let { data: chat } = await supabase
        .from('chats')
        .select('messages')
        .eq('id', actualChatId)
        .single();

      if (!chat) {
        // Tentar criar o chat se não existir
        chat = await createChatIfNotExists();
      }

      const updatedMessages = [...(chat?.messages || []), newMessage];

      // Atualizar chat
      await supabase
        .from('chats')
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString()
        })
        .eq('id', actualChatId);

      setMessages(updatedMessages);
      setMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !conversation?.chatId || !user) return;

    // Validar tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB');
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    setUploadingImage(true);
    try {
      // Upload para Supabase Storage
      const fileName = `chat-images/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Erro ao fazer upload:', uploadError);
        alert('Erro ao enviar imagem. Tente novamente.');
        return;
      }

      // Gerar URL pública
      const { data: urlData } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        alert('Erro ao obter URL da imagem');
        return;
      }

      // Atualizar last_seen do usuário atual
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);

      // Criar mensagem com imagem
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        content: `[Imagem] ${urlData.publicUrl}`,
        sender_id: user.id,
        created_at: new Date().toISOString(),
        is_read: false
      };

      // Buscar chat atual
      let { data: chat } = await supabase
        .from('chats')
        .select('messages')
        .eq('id', actualChatId)
        .single();

      if (!chat) {
        // Tentar criar o chat se não existir
        chat = await createChatIfNotExists();
      }

      const updatedMessages = [...(chat?.messages || []), newMessage];

      // Atualizar chat
      await supabase
        .from('chats')
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString()
        })
        .eq('id', actualChatId);

      setMessages(updatedMessages);
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      alert('Erro ao enviar imagem. Tente novamente.');
    } finally {
      setUploadingImage(false);
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onEmojiClick = (emojiObject: { emoji: string }) => {
    setMessage(prevMessage => prevMessage + emojiObject.emoji);
    // Não fechar o picker ao clicar em emoji
  };

  const handleDeleteChat = async () => {
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', actualChatId);

      if (error) {
        console.error('Erro ao deletar chat:', error);
        // Opcional: mostrar alerta ao usuário
      } else {
        console.log('Chat deletado com sucesso');
        // Navegar de volta para a lista de chats
        window.history.back();
      }
    } catch (error) {
      console.error('Erro ao deletar chat:', error);
    } finally {
      setShowMenu(false);
    }
  };

  const handleBlockUser = () => {
    setShowBlockModal(true);
    setShowMenu(false);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      console.log('Deleting messageId:', messageId);
      console.log('Message ids:', messages.map(m => m.id));
      console.log('Mensagens antes da exclusão:', messages);

      const updatedMessages = messages.filter((msg: ChatMessage) => msg.id !== messageId);

      console.log('Mensagens após filtro:', updatedMessages);

      // Atualizar mensagens no banco primeiro
      const { error } = await supabase
        .from('chats')
        .update({ messages: updatedMessages })
        .eq('id', actualChatId);

      if (error) {
        console.error('Erro ao atualizar mensagens no banco:', error);
        // Não atualizar estado local se falhar
      } else {
        console.log('Mensagens atualizadas no banco com sucesso');
        // Atualizar estado local apenas em caso de sucesso
        setMessages(updatedMessages);
      }
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      // Estado local não é alterado em caso de erro
    } finally {
      setShowMessageMenu(null);
    }
  };

  const handleEditMessage = (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (message) {
      setEditText(message.content);
      setEditingMessageId(messageId);
      setShowMessageMenu(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editText.trim()) return;

    const updatedMessages = messages.map(msg =>
      msg.id === editingMessageId ? { ...msg, content: editText.trim() } : msg
    );

    try {
      const { error } = await supabase
        .from('chats')
        .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
        .eq('id', actualChatId);

      if (error) {
        console.error('Erro ao editar mensagem:', error);
      } else {
        setMessages(updatedMessages);
      }
    } catch (error) {
      console.error('Erro ao editar mensagem:', error);
    } finally {
      setEditingMessageId(null);
      setEditText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleConfirmBlock = async () => {
    if (!user || !conversation.otherUserId) return;

    try {
      const { error } = await supabase
        .from('user_blocked_users')
        .insert({
          user_id: user.id,
          blocked_user_id: conversation.otherUserId
        });

      if (error) {
        console.error('Erro ao bloquear usuário:', error);
      } else {
        console.log('Usuário bloqueado com sucesso');
        // Opcional: redirecionar ou mostrar mensagem
        window.history.back(); // Voltar para a lista
      }
    } catch (error) {
      console.error('Erro ao bloquear usuário:', error);
    } finally {
      setShowBlockModal(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user || null);
    });

    return () => {
      void subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user === null) return; // Still loading

    if (!user) {
      navigate('/login');
      return;
    }

    loadMessages();
  }, [user, conversation?.chatId, navigate]);

  // Real-time updates
  useEffect(() => {
    if (!actualChatId) return;

    const channel = supabase
      .channel('chat-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chats', filter: `id=eq.${actualChatId}` }, (payload: any) => {
        setMessages(payload.new.messages);
      });

    channelRef.current = channel;
    channel.subscribe();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [actualChatId]);


  // Simulação de real-time (removido - usando apenas dados locais)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulação de real-time (removido)

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: '"Outfit", sans-serif' }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-full transition-colors border border-gray-300 bg-white text-black hover:text-gray-700 cursor-pointer mr-3"
              aria-label="Voltar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <UserInfo
              avatar={otherUserProfile?.avatar_url || conversation.avatar}
              name={otherUserProfile?.name || conversation.name}
              isOnline={otherUserProfile?.is_online}
              lastSeen={otherUserProfile?.last_seen}
            />
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-full transition-colors border border-gray-200 bg-white text-black hover:text-gray-700 cursor-pointer"
                aria-label="Menu"
              >
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 z-10 overflow-hidden">
                  <div className="py-1">
                    <button
                      onClick={handleDeleteChat}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Excluir chat
                    </button>
                    <button
                      onClick={handleBlockUser}
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Bloquear usuário
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#57da74]"></div>
            <span className="ml-2 text-gray-600">Carregando mensagens...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500">Nenhuma mensagem ainda</p>
              <p className="text-sm text-gray-400 mt-1">Envie a primeira mensagem!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.sender_id === currentUserId;
            const isEditing = editingMessageId === msg.id;
            return (
              <div key={msg.id} className={`flex items-end ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 relative`}>
                {!isOwnMessage && (
                  <div className="relative mr-2">
                    <img
                      src={otherUserProfile?.avatar_url || conversation.avatar}
                      alt={otherUserProfile?.name || conversation.name}
                      className="w-8 h-8 rounded-full border border-gray-200"
                    />
                    {otherUserProfile?.last_seen && (Date.now() - new Date(otherUserProfile.last_seen).getTime()) < 5 * 60 * 1000 && (
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white rounded-full"></div>
                    )}
                  </div>
                )}
                {isOwnMessage ? (
                  <div className="flex items-end">
                    <div className="mr-2 relative">
                      <button
                        onClick={() => setShowMessageMenu(showMessageMenu === msg.id ? null : msg.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        aria-label="Opções da mensagem"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                      </button>
                      {showMessageMenu === msg.id && (
                        <div className="absolute top-8 left-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-100 z-10 overflow-hidden">
                          <div className="py-1">
                            <button
                              onClick={() => handleEditMessage(msg.id)}
                              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                            >
                              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                            >
                              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Excluir
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={`max-w-xs px-4 py-2 rounded-lg bg-gray-700 text-white rounded-br-none relative`}>
                      {isEditing ? (
                        <div>
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full bg-transparent border-none outline-none text-white text-sm"
                            autoFocus
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <div className="flex justify-end mt-1 space-x-2">
                            <button
                              onClick={handleSaveEdit}
                              className="text-xs text-green-400 hover:text-green-300"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : msg.content.startsWith('[Imagem] ') ? (
                        <div>
                          <img
                            src={msg.content.replace('[Imagem] ', '')}
                            alt="Imagem enviada"
                            className="max-w-full rounded-lg cursor-pointer"
                            onClick={() => window.open(msg.content.replace('[Imagem] ', ''), '_blank')}
                          />
                        </div>
                      ) : (
                        <p className="text-sm">{msg.content}</p>
                      )}
                      <p className="text-xs mt-1 text-gray-300">
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`max-w-xs px-4 py-2 rounded-lg bg-gray-100 text-black rounded-bl-none`}>
                    {msg.content.startsWith('[Imagem] ') ? (
                      <div>
                        <img
                          src={msg.content.replace('[Imagem] ', '')}
                          alt="Imagem enviada"
                          className="max-w-full rounded-lg cursor-pointer"
                          onClick={() => window.open(msg.content.replace('[Imagem] ', ''), '_blank')}
                        />
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    <p className="text-xs mt-1 text-gray-500">
                      {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
                {isOwnMessage && (
                  <img
                    src={currentUserProfile?.avatar_url || `https://ui-avatars.com/api/?name=${currentUserProfile?.full_name?.charAt(0)}&background=57da74&color=fff&size=128`}
                    alt="Você"
                    className="w-8 h-8 rounded-full ml-2 border border-gray-200"
                  />
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Message Input */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <div className="max-w-7xl mx-auto">
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-full mb-2 right-4 z-10">
              <style>
                {`
                  .custom-emoji-picker .emoji-picker__header,
                  .custom-emoji-picker .emoji-picker__sticky {
                    display: none !important;
                  }
                  .custom-emoji-picker .emoji-picker__container {
                    padding-top: 0 !important;
                  }
                `}
              </style>
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                searchDisabled={true}
                width={300}
                height={300}
                previewConfig={{ showPreview: false }}
                categories={[
                  {
                    name: 'Usados recentes',
                    category: Categories.SUGGESTED
                  },
                  {
                    name: '',
                    category: Categories.SMILEYS_PEOPLE
                  },
                  {
                    name: '',
                    category: Categories.ANIMALS_NATURE
                  },
                  {
                    name: '',
                    category: Categories.FOOD_DRINK
                  },
                  {
                    name: '',
                    category: Categories.ACTIVITIES
                  },
                  {
                    name: '',
                    category: Categories.TRAVEL_PLACES
                  },
                  {
                    name: '',
                    category: Categories.OBJECTS
                  },
                  {
                    name: '',
                    category: Categories.SYMBOLS
                  },
                  {
                    name: '',
                    category: Categories.FLAGS
                  }
                ]}
                className="custom-emoji-picker"
              />
            </div>
          )}
          <div className="flex items-center space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              aria-label="Enviar imagem"
            >
              {uploadingImage ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#57da74] focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Emoji"
              >
                <svg className="w-5 h-5" fill="none" stroke="black" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <circle cx="9" cy="9" r="1" />
                  <circle cx="15" cy="9" r="1" />
                </svg>
              </button>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={sending || !message.trim()}
              className="p-2 bg-[#57da74] text-white rounded-full hover:bg-[#4ac863] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Enviar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>

        </div>
      </footer>

      {/* Modal de Bloqueio */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-xs mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Bloquear Usuário</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Tem certeza que deseja bloquear {otherUserProfile?.name || conversation.name}?
              Você não poderá mais enviar mensagens para este usuário.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-3 py-1.5 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmBlock}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Bloquear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
