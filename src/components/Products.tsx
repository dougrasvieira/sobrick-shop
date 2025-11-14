import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/autoplay';
// @ts-ignore
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

const Products: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const navigate = useNavigate();

  // Estado para produtos em destaque (carregados do banco)
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);

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
  }, []);


  const fetchProducts = async () => {
    try {
      setLoading(true);

      if (searchTerm.trim()) {
        // Busca no backend quando há termo de busca
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            profiles!inner(location)
          `)
          .eq('is_active', true)
          .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error searching products:', error);
          setProducts([]);
        } else {
          // Mapear dados para incluir localização do perfil
          const mappedProducts = data?.map((product: any) => ({
            ...product,
            seller_location: product.profiles?.location || product.location
          })) || [];
          setProducts(mappedProducts);
        }
      } else {
        // Busca normal quando não há termo de busca
        let query = supabase
          .from('products')
          .select(`
            *,
            profiles!inner(location)
          `)
          .eq('is_active', true);

        // Add category filter if selected
        if (selectedCategory) {
          query = query.eq('category', selectedCategory);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching products:', error);
          // Fallback to mock if error
          setProducts([
            {
              id: '1',
              title: 'iPhone 14 Pro Max',
              price: 4500.00,
              category: 'eletronicos',
              condition: 'novo',
              location: 'São Paulo',
              images: [
                'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop&crop=center',
                'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=400&h=300&fit=crop&crop=center',
                'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=400&h=300&fit=crop&crop=center'
              ],
              description: 'iPhone 14 Pro Max 256GB, câmera profissional, bateria duradoura. Como novo, com garantia Apple.',
              created_at: new Date().toISOString(),
              user_id: 'user1',
              seller_name: 'João Silva',
              seller_location: 'São Paulo',
              is_active: true
            }
          ]);
        } else {
          // Mapear dados para incluir localização do perfil
          const mappedProducts = data?.map((product: any) => ({
            ...product,
            seller_location: product.profiles?.location || product.location
          })) || [];
          setProducts(mappedProducts);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeaturedProducts = async () => {
    try {
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
    }
  };


  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: '"Outfit", sans-serif' }}>
      {/* Header */}
      <header className="bg-gradient-to-r from-[#57da74] to-black shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0.5">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center space-x-0 mb-1 rounded-lg px-0.5 py-0.5">
              <img src="/logotipo.png" alt="Logo SóBrick" className="h-12 w-auto cursor-pointer" style={{ filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.8))' }} onClick={() => window.location.reload()} />
              <div className="flex flex-col items-center -mt-1">
                <h1 className="text-2xl font-black text-gray-900" translate="no">
                  <span className="text-[#57da74]" style={{ WebkitTextStroke: '1px black' }}>Só</span><span className="text-black">Brick</span>
                </h1>
                <p className="text-white text-xs font-light italic -mt-1" style={{ fontFamily: '"Playfair Display", serif', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>Um bom negócio</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    navigate('/upload-product');
                  } else {
                    navigate('/login');
                  }
                }}
                className="bg-[#57da74] text-black px-3 py-1.5 rounded-lg hover:bg-[#4ac863] transition-colors font-medium flex items-center space-x-2 cursor-pointer"
              >
                <svg className="h-5 w-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Anunciar</span>
              </button>
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
            {featuredProducts.map((product: any, index: number) => (
              <SwiperSlide key={product.id}>
                <div className="relative border border-gray-200 rounded-2xl overflow-hidden">
                  <img
                    src={product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300x200?text=Imagem+não+disponível'}
                    alt={product.title}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold text-center px-4 drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                      {(product as any).swiper_main_text && (product as any).swiper_main_text.trim() !== '' ? (product as any).swiper_main_text : ''}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 text-white p-4 rounded-b-lg">
                    {(product as any).swiper_subtitle && (
                      <h2 className="text-xl font-bold drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                        {(product as any).swiper_subtitle}
                      </h2>
                    )}
                    <p className="text-lg font-bold drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                      {(product as any).swiper_price || `R$ ${product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#57da74]"></div>
            <span className="ml-3 text-gray-600">Carregando produtos...</span>
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
                    <span className="text-xs text-gray-500 font-medium truncate">{product.seller_location || product.location || 'Localização não informada'}</span>
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>


    </div>
  );
};

export default Products;