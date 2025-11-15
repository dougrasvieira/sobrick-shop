import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const MySales: React.FC = () => {
  const navigate = useNavigate();
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMyProducts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (data) {
        setMyProducts(data);
      }
      setLoading(false);
    };
    loadMyProducts();
  }, [navigate]);

  const removeProduct = async (productId: string) => {
    Swal.fire({
      title: 'Tem certeza?',
      text: 'Esta ação não pode ser desfeita. O produto será permanentemente removido.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, remover permanentemente',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          try {
            // Remover referências na tabela interests (favoritos/interesses)
            await supabase
              .from('interests')
              .delete()
              .eq('product_id', productId);

            // Remover chats relacionados ao produto
            await supabase
              .from('chats')
              .delete()
              .eq('product_id', productId);

            // Agora fazer hard delete do produto
            const { error } = await supabase
              .from('products')
              .delete()
              .eq('user_id', user.id)
              .eq('id', productId);

            if (!error) {
              setMyProducts(prev => prev.filter(p => p.id !== productId));
              Swal.fire({
                title: 'Removido!',
                text: 'O produto e todas as conversas relacionadas foram permanentemente removidos.',
                icon: 'success',
                confirmButtonColor: '#57da74'
              });
            } else {
              console.error('Erro ao remover produto:', error);
              Swal.fire({
                title: 'Erro',
                text: 'Não foi possível remover o produto.',
                icon: 'error',
                confirmButtonColor: '#57da74'
              });
            }
          } catch (error) {
            console.error('Erro ao remover produto:', error);
            Swal.fire({
              title: 'Erro',
              text: 'Ocorreu um erro inesperado.',
              icon: 'error',
              confirmButtonColor: '#57da74'
            });
          }
        }
      }
    });
  };

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
            <h1 className="text-xl font-bold text-black">Minhas vendas</h1>
            <div className="w-10"></div> {/* Spacer */}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#57da74]"></div>
            <span className="ml-2 text-gray-600">Carregando vendas...</span>
          </div>
        ) : myProducts.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="text-gray-500 text-lg">Nenhum produto anunciado ainda</p>
            <p className="text-gray-400 text-sm mt-2">Anuncie seus produtos para começar a vender</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
            {myProducts.map((product) => (
              <div key={product.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-square relative">
                  <img
                    src={
                      product.images && product.images.length > 0 && !product.images[0].startsWith('blob:')
                        ? product.images[0]
                        : 'https://picsum.photos/300/200?random=' + product.id
                    }
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeProduct(product.id.toString())}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors"
                    aria-label="Remover produto"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.title}</h3>
                  <p className="text-lg font-bold text-green-800 mb-2">
                    R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {product.description || "Produto em excelente estado"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MySales;