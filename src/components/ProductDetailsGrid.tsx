
import React, { useState } from 'react';
  import { useLocation, useNavigate } from 'react-router-dom';
  import { Swiper, SwiperSlide } from 'swiper/react';
  import { Pagination } from 'swiper/modules';
  import 'swiper/css';
  import 'swiper/css/navigation';
  import 'swiper/css/pagination';
  import Swal from 'sweetalert2';
  import { supabase } from '../supabaseClient';


const ProductDetailsGrid: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { productId } = location.state as { productId: string };
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);
    const [userRating, setUserRating] = useState(0);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [sellerData, setSellerData] = useState<any>(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [tempRating, setTempRating] = useState(0);
    const [averageRating, setAverageRating] = useState(0);
    const [interestedCount, setInterestedCount] = useState(0);

    React.useEffect(() => {
      const loadProduct = async () => {
        if (!productId) return;

        try {
          setLoading(true);
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

          if (error) throw error;
          setProduct(data);
        } catch (error) {
          console.error('Erro ao carregar produto:', error);
          navigate('/');
        } finally {
          setLoading(false);
        }
      };

      loadProduct();
    }, [productId, navigate]);

   // Verificar se o produto já está nos interesses
    React.useEffect(() => {
      const checkFavorite = async () => {
        if (!product) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('interests')
            .select('*')
            .eq('user_id', user.id)
            .eq('product_id', product.id);
          setIsFavorite(data ? data.length > 0 : false);
        }
      };
      if (product) checkFavorite();
    }, [product?.id]);

   // Buscar dados do vendedor
   React.useEffect(() => {
     const fetchSellerData = async () => {
       if (product && product.user_id) {
         const { data } = await supabase
           .from('profiles')
           .select('*')
           .eq('id', product.user_id)
           .single();

         if (data) {
           setSellerData(data);
         }
       }
     };
     if (product) fetchSellerData();
   }, [product?.user_id]);

   // Buscar contagem de interessados
   const fetchInterestedCount = async () => {
     if (!product) return;
     try {
       const { count, error } = await supabase
         .from('interests')
         .select('*', { count: 'exact', head: true })
         .eq('product_id', product.id);

       if (!error) {
         setInterestedCount(count || 0);
       }
     } catch (error) {
       console.warn('Erro ao buscar contagem de interessados:', error);
       setInterestedCount(0);
     }
   };

   // Buscar avaliação do usuário e média das avaliações
   React.useEffect(() => {
     const fetchData = async () => {
       if (!product) return;
       try {
         // Buscar contagem de interessados
         await fetchInterestedCount();

         // Buscar avaliação do usuário
         const { data: { user } } = await supabase.auth.getUser();
         if (user) {
           const { data: userRatingData, error: ratingError } = await supabase
             .from('ratings')
             .select('rating')
             .eq('user_id', user.id)
             .eq('product_id', product.id)
             .maybeSingle();
           if (!ratingError && userRatingData) {
             setUserRating(userRatingData.rating);
           } else {
             setUserRating(0);
           }
         }

         // Buscar média das avaliações
         const { data: allRatings, error: reloadError } = await supabase
           .from('ratings')
           .select('rating')
           .eq('product_id', product.id);
         if (!reloadError && allRatings && allRatings.length > 0) {
           const sum = allRatings.reduce((acc: number, curr: { rating: number }) => acc + curr.rating, 0);
           const avg = sum / allRatings.length;
           setAverageRating(Math.round(avg * 10) / 10);
         } else {
           setAverageRating(0);
         }
       } catch (error) {
         console.warn('Erro ao buscar dados:', error);
         setAverageRating(0);
         setInterestedCount(0);
         setUserRating(0);
       }
     };
     if (product) fetchData();
   }, [product?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-20" style={{ fontFamily: '"Outfit", sans-serif' }}>
        {/* Product Image skeleton */}
        <div className="relative">
          <div className="w-full h-80 md:h-96 lg:h-[28rem] bg-gray-200 animate-pulse"></div>
          {/* Header overlay skeleton */}
          <header className="absolute top-0 left-0 right-0 bg-transparent z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                  <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </header>
        </div>

        {/* Seller Info skeleton */}
        <div className="bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-1 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                </div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Product Info skeleton */}
        <div className="bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="max-w-6xl mx-auto bg-white rounded-t-3xl -mt-6 pt-6 px-4 shadow-lg relative z-20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
              </div>
              <div className="space-y-2 mb-6">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6 animate-pulse"></div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="h-5 bg-gray-200 rounded w-24 mb-3 animate-pulse"></div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-14 animate-pulse"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-18 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar skeleton */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" style={{ fontFamily: '"Outfit", sans-serif' }}>
        <p className="text-gray-500">Produto não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: '"Outfit", sans-serif' }}>
      {/* Product Image covering header */}
      <div className="relative">
        <Swiper
          spaceBetween={5}
          slidesPerView={1}
          loop={false}
          pagination={{
            clickable: true,
            bulletClass: 'swiper-pagination-bullet !bg-white !opacity-70 hover:!opacity-100 !w-2 !h-2',
            bulletActiveClass: 'swiper-pagination-bullet-active !bg-[#57da74] !opacity-100 !w-2 !h-2',
          }}
          modules={[Pagination]}
          breakpoints={{
            1200: {
              slidesPerView: 3,
            },
            768: {
              slidesPerView: 3,
            },
            0: {
              slidesPerView: 1,
            },
          }}
          className="w-full h-80 md:h-96 lg:h-[28rem]"
        >
          {product.images && product.images.length > 0 ? (
            product.images.slice(0, 5).map((image: string, index: number) => (
              <SwiperSlide key={index}>
                <img
                  src={image}
                  alt={`${product.title} - Imagem ${index + 1}`}
                  className="w-full h-80 md:h-96 lg:h-[28rem] object-cover cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                />
              </SwiperSlide>
            ))
          ) : (
            <>
              <SwiperSlide>
                <img
                  src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop&crop=center"
                  alt={`${product.title} - Imagem 1`}
                  className="w-full h-80 md:h-96 lg:h-[28rem] object-cover cursor-pointer"
                  onClick={() => setSelectedImage('https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop&crop=center')}
                />
              </SwiperSlide>
              <SwiperSlide>
                <img
                  src="https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=600&fit=crop&crop=center"
                  alt={`${product.title} - Imagem 2`}
                  className="w-full h-80 md:h-96 lg:h-[28rem] object-cover cursor-pointer"
                  onClick={() => setSelectedImage('https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=600&fit=crop&crop=center')}
                />
              </SwiperSlide>
              <SwiperSlide>
                <img
                  src="https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=800&h=600&fit=crop&crop=center"
                  alt={`${product.title} - Imagem 3`}
                  className="w-full h-80 md:h-96 lg:h-[28rem] object-cover cursor-pointer"
                  onClick={() => setSelectedImage('https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=800&h=600&fit=crop&crop=center')}
                />
              </SwiperSlide>
              <SwiperSlide>
                <img
                  src="https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=800&h=600&fit=crop&crop=center"
                  alt={`${product.title} - Imagem 4`}
                  className="w-full h-80 md:h-96 lg:h-[28rem] object-cover cursor-pointer"
                  onClick={() => setSelectedImage('https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=800&h=600&fit=crop&crop=center')}
                />
              </SwiperSlide>
              <SwiperSlide>
                <img
                  src="https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&h=600&fit=crop&crop=center"
                  alt={`${product.title} - Imagem 5`}
                  className="w-full h-80 md:h-96 lg:h-[28rem] object-cover cursor-pointer"
                  onClick={() => setSelectedImage('https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&h=600&fit=crop&crop=center')}
                />
              </SwiperSlide>
              <SwiperSlide>
                <img
                  src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop&crop=center"
                  alt={`${product.title} - Imagem 6`}
                  className="w-full h-80 md:h-96 lg:h-[28rem] object-cover cursor-pointer"
                  onClick={() => setSelectedImage('https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop&crop=center')}
                />
              </SwiperSlide>
              <SwiperSlide>
                <img
                  src="https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&h=600&fit=crop&crop=center"
                  alt={`${product.title} - Imagem 7`}
                  className="w-full h-80 md:h-96 lg:h-[28rem] object-cover cursor-pointer"
                  onClick={() => setSelectedImage('https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&h=600&fit=crop&crop=center')}
                />
              </SwiperSlide>
              <SwiperSlide>
                <img
                  src="https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&h=600&fit=crop&crop=center"
                  alt={`${product.title} - Imagem 8`}
                  className="w-full h-80 md:h-96 lg:h-[28rem] object-cover cursor-pointer"
                  onClick={() => setSelectedImage('https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&h=600&fit=crop&crop=center')}
                />
              </SwiperSlide>
            </>
          )}
        </Swiper>
        {/* Header overlay */}
        <header className="absolute top-0 left-0 right-0 bg-transparent z-10">
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
              <div className="flex items-center space-x-4">
                <button
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      const newFavoriteState = !isFavorite;
                      setIsFavorite(newFavoriteState);

                      if (newFavoriteState) {
                        // Adicionar aos interesses
                        const { error } = await supabase
                          .from('interests')
                          .insert({ user_id: user.id, product_id: product.id });

                        if (!error) {
                          setInterestedCount(prev => prev + 1);
                          Swal.fire({
                            title: 'Adicionado!',
                            icon: 'success',
                            timer: 1000,
                            showConfirmButton: false,
                            position: 'top-end',
                            toast: true,
                            width: '300px'
                          });
                        }
                      } else {
                        // Remover dos interesses
                        const { error } = await supabase
                          .from('interests')
                          .delete()
                          .eq('user_id', user.id)
                          .eq('product_id', product.id);

                        if (!error) {
                          setInterestedCount(prev => Math.max(0, prev - 1));
                        }
                      }
                    } else {
                      navigate('/login');
                    }
                  }}
                  className={`p-2 rounded-full transition-colors border border-gray-300 bg-white ${
                    isFavorite ? 'text-red-400' : 'text-black hover:text-red-400'
                  }`}
                  aria-label="Favoritar"
                >
                  <svg className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                <button
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      setTempRating(userRating);
                      setShowRatingModal(true);
                    } else {
                      Swal.fire({
                        title: 'Faça login para avaliar.',
                        icon: 'warning',
                        confirmButtonColor: '#57da74'
                      });
                    }
                  }}
                  className={`p-2 rounded-full transition-colors border border-gray-300 bg-white ${
                    userRating > 0 ? 'text-yellow-400' : 'text-black hover:text-yellow-400'
                  }`}
                  aria-label="Avaliar produto"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-full p-4">
            <img
              src={selectedImage}
              alt="Imagem ampliada"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Avaliar Produto</h3>
            <div className="flex justify-center space-x-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setTempRating(star)}
                  className="focus:outline-none"
                >
                  <svg
                    className={`w-8 h-8 ${star <= tempRating ? 'text-yellow-400' : 'text-gray-300'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user && tempRating > 0) {
                      if (userRating > 0) {
                        // Atualizar avaliação existente
                        const { error } = await supabase
                          .from('ratings')
                          .update({ rating: tempRating })
                          .eq('user_id', user.id)
                          .eq('product_id', product.id);
                        if (!error) {
                          setUserRating(tempRating);
                          Swal.fire({
                            title: 'Avaliação atualizada!',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false,
                            position: 'top-end',
                            toast: true
                          });
                        } else {
                          Swal.fire({
                            title: 'Erro ao atualizar avaliação',
                            text: 'Tente novamente mais tarde',
                            icon: 'error'
                          });
                        }
                      } else {
                        // Inserir nova avaliação
                        const { error } = await supabase
                          .from('ratings')
                          .insert({ user_id: user.id, product_id: product.id, rating: tempRating });
                        if (!error) {
                          setUserRating(tempRating);
                          Swal.fire({
                            title: 'Avaliação registrada!',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false,
                            position: 'top-end',
                            toast: true
                          });
                        } else {
                          Swal.fire({
                            title: 'Erro ao registrar avaliação',
                            text: 'Tente novamente mais tarde',
                            icon: 'error'
                          });
                        }
                      }
                      setShowRatingModal(false);
                      // Recarregar avaliações para atualizar média
                      const { data: allRatings, error: reloadError } = await supabase
                        .from('ratings')
                        .select('rating')
                        .eq('product_id', product.id);
                      if (!reloadError && allRatings && allRatings.length > 0) {
                        const sum = allRatings.reduce((acc: number, curr: { rating: number }) => acc + curr.rating, 0);
                        const avg = sum / allRatings.length;
                        setAverageRating(Math.round(avg * 10) / 10);
                      }
                    }
                  } catch (error) {
                    console.error('Erro ao salvar avaliação:', error);
                    Swal.fire({
                      title: 'Erro inesperado',
                      text: 'Tente novamente mais tarde',
                      icon: 'error'
                    });
                  }
                }}
                className="flex-1 px-4 py-2 text-white bg-[#57da74] rounded-lg hover:bg-[#4ac863] transition-colors"
                disabled={tempRating === 0}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seller Info */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center space-x-3 mb-3">
              <img
                src={sellerData?.avatar_url || `https://ui-avatars.com/api/?name=${sellerData?.full_name?.charAt(0) || 'U'}&background=57da74&color=fff&size=128`}
                alt="Vendedor"
                className="w-12 h-12 rounded-full object-cover border-2 border-[#57da74] cursor-pointer"
                onClick={() => navigate('/profile', { state: { seller: sellerData } })}
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{sellerData?.full_name || 'Vendedor'}</p>
                <p className="text-xs text-gray-500">{sellerData?.location || 'Localização não informada'}</p>
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{product.title}</h1>
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-6xl mx-auto bg-white rounded-t-3xl -mt-6 pt-6 px-4 shadow-lg relative z-20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="ml-1 text-sm font-semibold text-gray-900">{averageRating > 0 ? averageRating.toFixed(1) : '0.0'}</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-1 text-sm text-gray-600">{interestedCount} interessado{interestedCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            <p className="text-black text-sm mb-6 leading-relaxed">
              {product.description || "Produto em excelente estado, usado poucas vezes. Inclui todos os acessórios originais e manual. Garantia de 3 meses. Entrega disponível em Palmas-PR e região."}
            </p>

            {/* Product Details Table */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Informações</h3>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-2 font-medium text-gray-700">Condição</td>
                    <td className="py-2 text-gray-900">{product.condition ? product.condition.charAt(0).toUpperCase() + product.condition.slice(1) : 'Novo'}</td>
                  </tr>
                  {product.category && (
                    <tr>
                      <td className="py-2 font-medium text-gray-700">Categoria</td>
                      <td className="py-2 text-gray-900">{product.category.charAt(0).toUpperCase() + product.category.slice(1)}</td>
                    </tr>
                  )}
                  {product.brand && (
                    <tr>
                      <td className="py-2 font-medium text-gray-700">Marca</td>
                      <td className="py-2 text-gray-900">{product.brand}</td>
                    </tr>
                  )}
                  {product.model && (
                    <tr>
                      <td className="py-2 font-medium text-gray-700">Modelo</td>
                      <td className="py-2 text-gray-900">{product.model}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-2 font-medium text-gray-700">Contato</td>
                    <td className="py-2 text-gray-900">
                      {sellerData?.phone ? sellerData.phone : sellerData?.email ? sellerData.email : 'Contato não informado'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium text-gray-700">Aceita troca?</td>
                    <td className="py-2 text-gray-900">{product.exchange ? 'Sim' : 'Não'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium text-gray-700">Frete</td>
                    <td className="py-2 text-gray-900">{product.shipping ? 'Sim' : 'Não'}</td>
                  </tr>
                  {product.contact_info && (
                    <tr>
                      <td className="py-2 font-medium text-gray-700">Formas de contato</td>
                      <td className="py-2 text-gray-900">{product.contact_info}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-2xl font-bold text-green-800">
                R$ {product.price ? product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
              </span>
            </div>
            <button
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  if (product.user_id && product.user_id !== user.id) {
                    const chatId = [user.id, product.user_id].sort().join('_');
                    navigate(`/chat/${chatId}`, { state: { ...product, chatId, productId: product.id, otherUserId: product.user_id } });
                  } else {
                    Swal.fire({
                      title: 'Erro',
                      text: 'Não é possível iniciar chat com seu próprio produto.',
                      icon: 'warning',
                      confirmButtonColor: '#57da74'
                    });
                  }
                } else {
                  navigate('/login');
                }
              }}
              className="px-4 py-2 rounded-lg transition-colors font-semibold text-sm bg-[#57da74] text-black hover:bg-[#4ac863] cursor-pointer"
            >
              Fechar negócio
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ProductDetailsGrid;