import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  avatar: string;
  unread: number;
  chatId: string;
  otherUserId: string;
  isOnline?: boolean;
  lastSeen?: string;
}

const ChatList: React.FC = () => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [pinnedChats, setPinnedChats] = useState<Set<string>>(new Set());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const chatChannelRef = useRef<any>(null);
  const profileChannelRef = useRef<any>(null);

  const handleDeleteChat = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) {
        console.error('Erro ao deletar chat:', error);
        // Opcional: mostrar toast ou alerta ao usuário
      } else {
        // Remover da lista local após sucesso
        setConversations(prev => prev.filter(conv => conv.chatId !== chatId));
      }
    } catch (error) {
      console.error('Erro ao deletar chat:', error);
    } finally {
      setShowMenu(null);
    }
  };

  const handlePinChat = async (chatId: string) => {
    if (!user) return;

    const isPinned = pinnedChats.has(chatId);

    try {
      if (isPinned) {
        // Desafixar: deletar do banco
        const { error } = await supabase
          .from('user_pinned_chats')
          .delete()
          .eq('user_id', user.id)
          .eq('chat_id', chatId);

        if (!error) {
          setPinnedChats(prev => {
            const newSet = new Set(prev);
            newSet.delete(chatId);
            return newSet;
          });
        } else {
          console.error('Erro ao desafixar chat:', error);
        }
      } else {
        // Fixar: inserir no banco
        const { error } = await supabase
          .from('user_pinned_chats')
          .insert({ user_id: user.id, chat_id: chatId });

        if (!error) {
          setPinnedChats(prev => new Set(prev).add(chatId));
        } else {
          console.error('Erro ao fixar chat:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao gerenciar chat fixado:', error);
    }

    setShowMenu(null);
  };

  const loadPinnedChats = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_pinned_chats')
      .select('chat_id')
      .eq('user_id', user.id);

    if (!error && data) {
      setPinnedChats(new Set(data.map((item: any) => item.chat_id)));
    } else {
      console.error('Erro ao carregar chats fixados:', error);
    }
  };

  const loadConversations = async () => {
    try {
      console.log('loadConversations: user =', user);
      if (!user) return;

      // Buscar chats fixados
      await loadPinnedChats();

      // Buscar chats do usuário
      const { data: chats, error } = await supabase
        .from('chats')
        .select(`
          *,
          buyer:profiles!buyer_id (full_name, avatar_url, last_seen),
          seller:profiles!seller_id (full_name, avatar_url, last_seen)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      console.log('loadConversations: query error =', error);
      console.log('loadConversations: chats data =', chats);

      if (chats) {
        const conversations = chats.map((chat: any) => {
          const isBuyer = chat.buyer_id === user.id;
          const otherUser = isBuyer ? chat.seller : chat.buyer;
          const lastMessage = chat.messages?.[chat.messages.length - 1];

          return {
            id: chat.id,
            name: otherUser?.full_name || 'Usuário',
            lastMessage: lastMessage?.content || 'Nenhuma mensagem',
            time: lastMessage ? new Date(lastMessage.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
            avatar: otherUser?.avatar_url || `https://ui-avatars.com/api/?name=${otherUser?.full_name?.charAt(0)}&background=57da74&color=fff&size=128`,
            unread: chat.messages?.filter((m: any) => !m.is_read && m.sender_id !== user.id).length || 0,
            chatId: chat.id,
            otherUserId: isBuyer ? chat.seller_id : chat.buyer_id,
            isOnline: otherUser?.last_seen && (Date.now() - new Date(otherUser.last_seen).getTime()) < 5 * 60 * 1000
          };
        });
        console.log('loadConversations: conversations =', conversations);
        setConversations(conversations);
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedConversations = [...conversations].sort((a, b) => {
    const aPinned = pinnedChats.has(a.chatId);
    const bPinned = pinnedChats.has(b.chatId);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user === null) {
      // Still loading
      return;
    }
    if (!user) {
      navigate('/login');
      return;
    }
    loadConversations();
  }, [user, navigate]);

  // Real-time updates for chats
  useEffect(() => {
    if (!user) return;

    const chatChannel = supabase
      .channel('chat-list-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, (payload: any) => {
        // Verificar se o chat envolve o usuário atual
        if (payload.new?.buyer_id === user.id || payload.new?.seller_id === user.id ||
            payload.old?.buyer_id === user.id || payload.old?.seller_id === user.id) {
          loadConversations();
        }
      });

    chatChannelRef.current = chatChannel;
    chatChannel.subscribe();

    return () => {
      if (chatChannelRef.current) {
        chatChannelRef.current.unsubscribe();
        chatChannelRef.current = null;
      }
    };
  }, [user]);

  // Real-time updates for user status
  useEffect(() => {
    const profileChannel = supabase
      .channel('profile-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload: any) => {
        // Atualizar status online das conversas
        setConversations(prev => prev.map(conv => {
          if (conv.otherUserId === payload.new.id) {
            const isOnline = payload.new.last_seen && (Date.now() - new Date(payload.new.last_seen).getTime()) < 5 * 60 * 1000;
            return { ...conv, isOnline };
          }
          return conv;
        }));
      });

    profileChannelRef.current = profileChannel;
    profileChannel.subscribe();

    return () => {
      if (profileChannelRef.current) {
        profileChannelRef.current.unsubscribe();
        profileChannelRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: '"Outfit", sans-serif' }}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-full transition-colors border border-gray-300 bg-white text-black hover:text-gray-700 cursor-pointer"
              aria-label="Voltar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="flex-1 text-center text-xl font-black" translate="no">
              Chat SóBrick
            </h1>
          </div>
        </div>
      </header>

      {/* Conversations List */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4" ref={menuRef}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#57da74]"></div>
            <span className="ml-2 text-gray-600">Carregando conversas...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhuma conversa ainda</p>
            <p className="text-sm text-gray-400 mt-1">Suas conversas aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedConversations.map((conversation) => (
            <div
              key={conversation.id}
              className="relative p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(showMenu === conversation.chatId ? null : conversation.chatId);
                }}
                className="absolute top-0.5 right-1 p-0.5 text-gray-400 hover:text-gray-600"
                aria-label="Opções do chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>
              {showMenu === conversation.chatId && (
                <div className="absolute top-10 right-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-10 overflow-hidden">
                  <div className="py-1">
                    <button
                      onClick={() => handlePinChat(conversation.chatId)}
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150 font-semibold"
                    >
                      <svg className="w-4 h-4 mr-3" fill={pinnedChats.has(conversation.chatId) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      {pinnedChats.has(conversation.chatId) ? 'Desafixar chat' : 'Fixar chat'}
                    </button>
                    <button
                      onClick={() => handleDeleteChat(conversation.chatId)}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 font-semibold"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Excluir chat
                    </button>
                  </div>
                </div>
              )}
              <div
                className="flex items-center"
                onClick={() => navigate(`/chat/${conversation.chatId}`, { state: { ...conversation, chatId: conversation.chatId } })}
              >
                <div className="relative">
                  <img
                    src={conversation.avatar}
                    alt={conversation.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#57da74]"
                  />
                  {conversation.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 ml-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <h3 className="text-base font-semibold text-black">{conversation.name}</h3>
                      {pinnedChats.has(conversation.chatId) && (
                        <svg className="w-4 h-4 ml-1 text-[#57da74]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{conversation.time}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-600 truncate flex-1">{conversation.lastMessage}</p>
                    {conversation.unread > 0 && (
                      <span className="ml-2 bg-[#57da74] text-black text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {conversation.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </main>

    </div>
  );
};

export default ChatList;