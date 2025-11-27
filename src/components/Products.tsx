                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/autoplay';
import { supabase } from '../supabaseClient';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  condition: string;
  location: string;                 
  images: string[];
  description?: string;
  created_at: string;
  user_id: string;
  seller_name?: string;
  seller_location?: string;
  is_active: boolean;
}

interface FeaturedProduct {
  id: string;
  title: string;
  price: number;
  images: string[];
  swiper_main_text?: string;
  swiper_subtitle?: string;
  swiper_price?: string;
}

const Products: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const navigate = useNavigate();

  // Estado para produtos em destaque (carregados do banco)
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);


  // Estados para navegação no header
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchFeaturedProducts = useCallback(async () => {
    try {
      setFeaturedLoading(true);
      // Buscar produtos em destaque com configurações específicas do swiper
      console.log('Tentando buscar produtos em destaque...');
      const { data, error } = await supabase
        .from('featured_products')
        .select('id, title, price, images, is_active, swiper_main_text, swiper_subtitle, swiper_price')
        .eq('is_active', true)
        .eq('show_in_swiper', true)
        .order('order_position', { ascending: true })
        .limit(5);

      console.log('Resultado da query:', { data, error });

      if (error) {
        console.error('Erro na query featured_products:', error);
        // Fallback para produtos mock se der erro
        setFeaturedProducts([
          {
            id: 'fallback-1',
            title: 'Anuncie aqui',
            price: 50.00,
            images: ['https://picsum.photos/300/200?random=1']
          },
          {
            id: 'fallback-2',
            title: 'Produtos em Destaque',
            price: 75.00,
            images: ['https://picsum.photos/300/200?random=2']
          },
          {
            id: 'fallback-3',
            title: 'Ofertas Especiais',
            price: 100.00,
            images: ['https://picsum.photos/300/200?random=3']
          },
          {
            id: 'fallback-4',
            title: 'Novidades',
            price: 120.00,
            images: ['https://picsum.photos/300/200?random=4']
          },
          {
            id: 'fallback-5',
            title: 'Promoções',
            price: 90.00,
            images: ['https://picsum.photos/300/200?random=5']
          }
        ]);
      } else {
        console.log('Produtos carregados:', data);
        setFeaturedProducts(data && data.length > 0 ? data : [
          {
            id: 'fallback-1',
            title: 'Anuncie aqui',
            price: 50.00,
            images: ['https://picsum.photos/300/200?random=1']
          },
          {
            id: 'fallback-2',
            title: 'Produtos em Destaque',
            price: 75.00,
            images: ['https://picsum.photos/300/200?random=2']
          },
          {
            id: 'fallback-3',
            title: 'Ofertas Especiais',
            price: 100.00,
            images: ['https://picsum.photos/300/200?random=3']
          },
          {
            id: 'fallback-4',
            title: 'Novidades',
            price: 120.00,
            images: ['https://picsum.photos/300/200?random=4']
          },
          {
            id: 'fallback-5',
            title: 'Promoções',
            price: 90.00,
            images: ['https://picsum.photos/300/200?random=5']
          }
        ]);
      }
    } catch (error) {
      console.error('Erro inesperado ao buscar produtos em destaque:', error);
      setFeaturedProducts([
        {
          id: 'fallback-1',
          title: 'Anuncie aqui',
          price: 50.00,
          images: ['https://picsum.photos/300/200?random=1']
        }
      ]);
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  const fetchUnreadMessages = useCallback(async (userId: string) => {
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
            const unreadMessages = chat.messages.filter((msg: { sender_id: string; is_read: boolean }) =>
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
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchFeaturedProducts();

    // Enable horizontal scroll with mouse wheel for categories
    const categoriesContainer = document.querySelector('.categories-container') as HTMLElement;
    if (categoriesContainer) {
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        categoriesContainer.scrollLeft += e.deltaY;
      };
      categoriesContainer.addEventListener('wheel', handleWheel);
      return () => categoriesContainer.removeEventListener('wheel', handleWheel);
    }
  }, [searchTerm, selectedCategory]);

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
  }, [fetchUnreadMessages]);

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

  // Real-time updates for featured products
  useEffect(() => {
    const channel = supabase
      .channel('featured-products-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'featured_products'
      }, (payload: RealtimePostgresChangesPayload<any>) => {
        console.log('Realtime update:', payload);
        fetchFeaturedProducts();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchFeaturedProducts]);


  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);

      if (searchTerm.trim()) {
        // Busca no backend quando há termo de busca
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error searching products:', error);
          setProducts([]);
        } else {
          setProducts(data || []);
        }
      } else {
        // Busca normal quando não há termo de busca
        let query = supabase
          .from('products')
          .select('*')
          .eq('is_active', true);

        // Add category filter if selected
        if (selectedCategory) {
          query = query.eq('category', selectedCategory);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching products:', error);
          setProducts([]);
        } else {
          setProducts(data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: '"Outfit", sans-serif' }}>
      {/* Header */}
      <header className="bg-gradient-to-r from-[#57da74] to-black shadow-sm relative overflow-hidden">
        {/* Enfeites Natalinos - Ativados apenas em dezembro */}
        {true && ( // Temporariamente ativado para teste
          <>
            {/* Luzes de Natal ao longo do topo - responsivas */}
            <div className="absolute top-0 left-0 right-0 h-1 flex justify-around pointer-events-none" aria-hidden="true">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-ping"
                  style={{
                    backgroundColor: ['#ff0000', '#00ff00', '#ffff00', '#ff00ff'][i % 4],
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>

            {/* Árvores natalinas modernas */}
            <div className="absolute bottom-1 left-4 text-green-600 text-lg sm:text-xl opacity-80 pointer-events-none animate-bounce" aria-hidden="true" style={{ animationDuration: '4s' }}>
              🎄
            </div>
            <div className="absolute bottom-1 right-4 text-green-600 text-lg sm:text-xl opacity-80 pointer-events-none animate-bounce" aria-hidden="true" style={{ animationDuration: '5s', animationDelay: '1s' }}>
              🎄
            </div>

            {/* Doces em formato de boneco (gingerbread) */}
            <div className="absolute bottom-2 left-1/4 text-amber-700 text-sm sm:text-base opacity-70 pointer-events-none animate-pulse" aria-hidden="true" style={{ animationDuration: '3s' }}>
              🍪
            </div>
            <div className="absolute bottom-2 right-1/4 text-amber-700 text-sm sm:text-base opacity-70 pointer-events-none animate-pulse" aria-hidden="true" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
              🍪
            </div>
          </>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-0.5 relative z-10">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center space-x-0 mb-1 rounded-lg px-0.5 py-0.5">
              <img src="/logotipo.png" alt="Logo SóBrick" className="h-8 sm:h-12 w-auto cursor-pointer" style={{ filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.8))' }} onClick={() => window.location.reload()} />
              <div className="flex flex-col items-center -mt-1">
                <h1 className="text-lg sm:text-2xl font-black text-gray-900" translate="no">
                  <span className="text-[#57da74]" style={{ WebkitTextStroke: '1px black' }}>Só</span><span className="text-black">Brick</span>
                </h1>
                <p className="text-white text-xs font-light italic -mt-1 hidden sm:block" style={{ fontFamily: '"Playfair Display", serif', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>Um bom negócio</p>
              </div>
            </div>
            <div className="flex items-center">
              <a
                href="/download"
                className="flex items-center space-x-1 sm:space-x-2 bg-black border border-[#57da74] rounded-full px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-gray-800 transition-colors"
                style={{ boxShadow: '0 0 10px rgba(87, 218, 116, 0.5)' }}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#57da74]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-white text-xs sm:text-sm font-medium">Download APP</span>
              </a>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    navigate('/upload-product');
                  } else {
                    navigate('/login');
                  }
                }}
                className="hidden sm:flex bg-[#57da74] text-black px-3 py-1.5 rounded-lg hover:bg-[#4ac863] transition-colors font-medium items-center space-x-2 cursor-pointer"
              >
                <svg className="h-5 w-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Anunciar</span>
              </button>
              <a href={isLoggedIn ? '/messages' : '/login'} className="hidden sm:flex items-center justify-center w-10 h-10 bg-black border border-[#57da74] rounded-full hover:bg-gray-800 transition-colors relative">
                <div className="relative">
                  <svg className="w-6 h-6 text-[#57da74]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold min-w-[20px]">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                  )}
                </div>
              </a>
              <a href={isLoggedIn ? '/profile' : '/login'} className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-black border border-[#57da74] rounded-full hover:bg-gray-800 transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#57da74]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-center">
            <div className="relative max-w-lg w-full">
              <input
                type="text"
                placeholder="O que você procura?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-2 pr-7 py-1 text-sm border-2 border-[#57da74] rounded-lg focus:ring-0 focus:border-[#57da74] focus:outline-none bg-gray-100 text-gray-900 placeholder-gray-400"
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Product Swiper */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {featuredLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="relative border border-white rounded-2xl overflow-hidden animate-pulse">
                  <div className="w-full h-64 bg-gray-200"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 bg-gray-300 rounded w-32"></div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="h-6 bg-gray-300 rounded w-24 mb-2"></div>
                    <div className="h-5 bg-gray-300 rounded w-20"></div>
                  </div>
                  <div className="absolute bottom-4 right-4">
                    <div className="h-8 w-16 bg-gray-300 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Swiper
              spaceBetween={10}
              slidesPerView={3}
              loop={true}
              autoplay={{
                delay: 5000,
                disableOnInteraction: false,
              }}
              modules={[Autoplay]}
              className="mySwiper"
              breakpoints={{
                1200: {
                  slidesPerView: 3,
                },
                768: {
                  slidesPerView: 2,
                },
                0: {
                  slidesPerView: 1,
                },
              }}
              style={{ paddingLeft: 0, paddingRight: 0 }}
            >
              {featuredProducts.map((product: FeaturedProduct, index: number) => (
                <SwiperSlide key={product.id}>
                  <div className="relative border border-white rounded-2xl overflow-hidden">
                    <img
                      src={product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300x200?text=Imagem+não+disponível'}
                      alt={product.title}
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold text-center px-4 drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                        {product.swiper_main_text && product.swiper_main_text.trim() !== '' ? product.swiper_main_text : ''}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 text-white p-4 rounded-b-lg">
                      {product.swiper_subtitle && (
                        <h2 className="text-xl font-bold drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                          {product.swiper_subtitle}
                        </h2>
                      )}
                      <p className="text-lg font-bold drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                        {product.swiper_price || `R$ ${product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </p>
                    </div>
                    <button
                      className="absolute bottom-4 right-4 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs font-medium text-gray-900 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
                      onClick={() => navigate(`/product-details/${index + 1}`)}
                    >
                      Eu quero
                    </button>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          )}
          </div>
        </div>

      {/* Categories Section */}
      <div className="bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Categorias</h2>
            <a href="#" className="text-[#57da74] hover:text-[#4ac863] font-medium flex items-center">
              Ver mais
              <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          <div className="categories-container flex gap-2 overflow-x-auto scrollbar-hide max-w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'roupas' ? '' : 'roupas')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'roupas'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Roupas</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'casa-cozinha' ? '' : 'casa-cozinha')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'casa-cozinha'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Casa e cozinha</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'games' ? '' : 'games')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'games'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Games</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'televisores' ? '' : 'televisores')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'televisores'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Televisores</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'motos' ? '' : 'motos')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'motos'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Motos</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'moveis-usados' ? '' : 'moveis-usados')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'moveis-usados'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Móveis usados</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'carros' ? '' : 'carros')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'carros'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Carros</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'bicicletas' ? '' : 'bicicletas')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'bicicletas'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Bicicletas</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'informatica' ? '' : 'informatica')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'informatica'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Informática</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'imoveis-alugar' ? '' : 'imoveis-alugar')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'imoveis-alugar'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Imóveis para alugar</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'venda-imoveis' ? '' : 'venda-imoveis')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'venda-imoveis'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Venda de imóveis</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'servicos' ? '' : 'servicos')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'servicos'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Serviços</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'ferramentas' ? '' : 'ferramentas')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'ferramentas'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Ferramentas</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'celulares' ? '' : 'celulares')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'celulares'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Celulares</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'eletronicos' ? '' : 'eletronicos')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'eletronicos'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Eletrônicos</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'eletrodomesticos' ? '' : 'eletrodomesticos')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'eletrodomesticos'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Eletrodomésticos</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'calcados' ? '' : 'calcados')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'calcados'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Calçados</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'jardim' ? '' : 'jardim')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'jardim'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Jardim</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'acessorios-carros' ? '' : 'acessorios-carros')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'acessorios-carros'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Acessórios para carros</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'comidas-bebidas' ? '' : 'comidas-bebidas')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'comidas-bebidas'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Comidas e bebidas</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'salao-beleza' ? '' : 'salao-beleza')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'salao-beleza'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Salão de beleza</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'barbearia' ? '' : 'barbearia')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'barbearia'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Barbearia</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'brinquedos' ? '' : 'brinquedos')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'brinquedos'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Brinquedos</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'madeiras-metais' ? '' : 'madeiras-metais')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'madeiras-metais'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Madeiras e metais</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'produtos-limpeza' ? '' : 'produtos-limpeza')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'produtos-limpeza'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Produtos de limpeza</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'ferro-velho' ? '' : 'ferro-velho')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'ferro-velho'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Ferro velho</p>
              </button>
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'utensilios' ? '' : 'utensilios')}
                className={`border rounded-full px-4 py-2 text-center transition-all max-w-32 cursor-pointer ${
                  selectedCategory === 'utensilios'
                    ? 'border-[#57da74] bg-[#57da74] text-white shadow-lg'
                    : 'border-gray-200 hover:border-[#57da74] hover:shadow-lg bg-transparent text-gray-900'
                }`}
              >
                <p className="text-sm font-medium truncate">Utensílios</p>
              </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden h-72 relative animate-pulse">
                <div className="relative h-48 bg-gray-200"></div>
                <div className="p-2 flex flex-col justify-between h-28 bg-gray-100">
                  <div className="flex flex-col gap-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="flex items-center -ml-1">
                      <div className="w-4 h-4 bg-gray-200 rounded mr-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">Nenhum produto encontrado.</p>
            <p className="text-gray-500 mt-2">Tente ajustar os filtros de busca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-md overflow-hidden h-72 relative cursor-pointer"
              onClick={() => navigate('/product-details-grid', { state: { productId: product.id } })}
            >
              <div className="relative h-48">
                <img
                  src={
                    product.images && product.images.length > 0 && !product.images[0].startsWith('blob:')
                      ? product.images[0]
                      : 'https://picsum.photos/300/200?random=' + product.id
                  }
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 flex items-center">
                  <span className="text-xs bg-[#57da74] text-white px-2 py-1 rounded-full font-medium">
                    {product.condition}
                  </span>
                </div>
              </div>
              <div className="p-2 flex flex-col justify-between h-28 bg-gray-100">
                <div className="flex flex-col gap-1">
                  <h3 className="text-base sm:text-lg font-semibold text-black truncate">
                    {product.title}
                  </h3>
                  <p className="text-base sm:text-lg font-bold text-green-800">
                    R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center -ml-1">
                    <svg className="w-4 h-4 text-gray-500 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs text-gray-500 font-medium truncate">{product.location || 'Localização não informada'}</span>
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Buttons */}
      <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-50 sm:hidden">
        <a href={isLoggedIn ? '/messages' : '/login'} className="flex items-center justify-center w-12 h-12 bg-black border border-[#57da74] rounded-full hover:bg-gray-800 transition-colors shadow-lg relative">
          <div className="relative">
            <svg className="w-6 h-6 text-[#57da74]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold min-w-[20px]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            )}
          </div>
        </a>
        <button
          onClick={async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              navigate('/upload-product');
            } else {
              navigate('/login');
            }
          }}
          className="flex items-center justify-center w-12 h-12 bg-[#57da74] text-black rounded-full hover:bg-[#4ac863] transition-colors shadow-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </button>
      </div>

    </div>
  );
};

export default Products;