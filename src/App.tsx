import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Products from './components/Products';
import ProductDetails from './components/ProductDetails';
import ProductDetailsGrid from './components/ProductDetailsGrid';
import Profile from './components/Profile';
import Interests from './components/Interests';
import MySales from './components/MySales';
import ChatList from './components/ChatList';
import Chat from './components/Chat';
import Login from './components/Login';
import Register from './components/Register';
import ProductUpload from './components/ProductUpload';
import AdminPanel from './components/AdminPanel';
// @ts-ignore
import { supabase } from './supabaseClient';
import './App.css';


const ConditionalNav = () => {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadMessages = async (userId: string) => {
    try {
      // Query otimizada - buscar apenas campos necessários
      const { data: chats, error } = await supabase
        .from('chats')
        .select('messages')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .limit(20); // Limitar para performance

      if (error) {
        console.warn('Erro ao buscar mensagens não lidas:', error);
        return;
      }

      let totalUnread = 0;

      if (chats) {
        for (const chat of chats) {
          if (chat.messages && Array.isArray(chat.messages)) {
            // Contar apenas mensagens não lidas que não são do usuário
            const unreadMessages = chat.messages.filter((msg: any) =>
              msg.sender_id !== userId && !msg.is_read
            );
            totalUnread += unreadMessages.length;
          }
        }
      }

      // Atualizar apenas se o valor mudou
      setUnreadCount(prev => prev !== totalUnread ? totalUnread : prev);
    } catch (error) {
      console.warn('Erro ao contar mensagens não lidas:', error);
      // Manter valor anterior em caso de erro
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);

      // Carregar contagem de mensagens não lidas de forma não-bloqueante
      if (user) {
        fetchUnreadMessages(user.id).catch(() => {
          // Silenciar erros para não afetar UX
        });
      } else {
        setUnreadCount(0);
      }
    };

    checkAuth();

    // @ts-ignore
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session?.user);

      // Atualizar contagem quando usuário faz login/logout
      if (session?.user) {
        fetchUnreadMessages(session.user.id).catch(() => {
          // Silenciar erros
        });
      } else {
        setUnreadCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Atualizar contagem quando acessar página de mensagens
  useEffect(() => {
    if (location.pathname === '/messages' && isLoggedIn) {
      // Resetar contagem quando visualizar mensagens
      setUnreadCount(0);
    }
  }, [location.pathname, isLoggedIn]);

  // Atualização em tempo real das mensagens não lidas
  useEffect(() => {
    if (!isLoggedIn) return;

    const updateUnreadCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await fetchUnreadMessages(user.id);
      }
    };

    // Configurar listener em tempo real para mudanças na tabela chats
    const channel = supabase
      .channel('unread-messages-realtime')
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'chats'
      }, () => {
        // Atualizar contagem quando houver qualquer mudança nos chats
        updateUnreadCount().catch(console.warn);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isLoggedIn]);

  if (location.pathname === '/login' || location.pathname.startsWith('/chat/') || location.pathname.startsWith('/product-details') || location.pathname === '/upload-product' || location.pathname === '/profile' || location.pathname === '/my-sales' || location.pathname === '/interests' || location.pathname === '/messages' || location.pathname === '/register' || location.pathname === '/admin') return null;
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex justify-around items-center py-2">
        <a href="/" className="flex flex-col items-center text-black hover:text-[#57da74] transition-colors">
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs font-medium">Início</span>
        </a>
        <a href={isLoggedIn ? '/messages' : '/login'} className="flex flex-col items-center text-black hover:text-[#57da74] transition-colors relative">
          <div className="relative">
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold min-w-[20px]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            )}
          </div>
          <span className="text-xs font-medium">Mensagens</span>
        </a>
        <a href={isLoggedIn ? '/profile' : '/login'} className="flex flex-col items-center text-black hover:text-[#57da74] transition-colors">
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs font-medium">Perfil</span>
        </a>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* All Routes Public */}
        <Route path="/" element={<Products />} />
        <Route path="/products" element={<Products />} />
        <Route path="/product-details" element={<ProductDetails />} />
        <Route path="/product-details/:slideId" element={<ProductDetails />} />
        <Route path="/product-details-grid" element={<ProductDetailsGrid />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/interests" element={<Interests />} />
        <Route path="/my-sales" element={<MySales />} />
        <Route path="/messages" element={<ChatList />} />
        <Route path="/chat/:id" element={<Chat />} />
        <Route path="/upload-product" element={<ProductUpload />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Fallback */}
        <Route path="*" element={<Products />} />
      </Routes>
      <ConditionalNav />
    </Router>
  );
}

export default App;
