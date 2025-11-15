import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

interface FeaturedProduct {
  id: string;
  title: string;
  price: number;
  images: string[];
  description?: string;
  link_url?: string;
  is_active: boolean;
  order_position: number;
  created_at: string;
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FeaturedProduct | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    description: '',
    link_url: '',
    images: [] as string[],
    is_active: true,
    // Configurações específicas do swiper para este produto
    swiper_main_text: '',
    swiper_subtitle: '',
    swiper_price: ''
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/login');
        return;
      }

      // Verificar se usuário é admin
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error || !adminData) {
        alert('Acesso negado. Você não tem permissão para acessar o painel administrativo.');
        navigate('/');
        return;
      }

      setIsAdmin(true);
      loadProducts();
    } catch (error) {
      console.error('Erro ao verificar acesso admin:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('featured_products')
        .select('*')
        .eq('show_in_swiper', true)
        .order('order_position', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      alert('Erro ao carregar produtos em destaque');
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Usuário não autenticado');
        return;
      }

      if (editingProduct) {
        // Atualizar produto existente
        const updateData = {
          images: formData.images.length > 0 ? formData.images : ['https://picsum.photos/300/200?random=default'],
          is_active: formData.is_active,
          swiper_main_text: formData.swiper_main_text || null,
          swiper_subtitle: formData.swiper_subtitle || null,
          swiper_price: formData.swiper_price || null
        };

        const { error } = await supabase
          .from('featured_products')
          .update(updateData)
          .eq('id', editingProduct.id);

        if (error) throw error;

        alert('Produto em destaque atualizado com sucesso!');
      } else {
        // Criar novo produto em destaque
        const productData = {
          title: formData.swiper_main_text || 'Anuncie aqui',
          price: 0, // Preço padrão para produtos de destaque
          images: formData.images.length > 0 ? formData.images : ['https://picsum.photos/300/200?random=default'],
          is_active: formData.is_active,
          swiper_main_text: formData.swiper_main_text || null,
          swiper_subtitle: formData.swiper_subtitle || null,
          swiper_price: formData.swiper_price || null,
          created_by: user.id,
          order_position: 0,
          show_in_swiper: true
        };

        const { error } = await supabase
          .from('featured_products')
          .insert(productData);

        if (error) throw error;

        alert('Produto em destaque adicionado com sucesso! Cada produto agora pode ter seus próprios textos no swiper.');
      }

      // Reset form
      setFormData({
        title: '',
        price: '',
        description: '',
        link_url: '',
        images: [],
        is_active: true,
        swiper_main_text: '',
        swiper_subtitle: '',
        swiper_price: ''
      });

      setShowAddModal(false);
      setEditingProduct(null);
      loadProducts(); // Recarregar produtos após salvar
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Erro ao salvar produto. Tente novamente.');
    }
  };

  const handleEdit = (product: FeaturedProduct) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      price: product.price?.toString() || '',
      description: product.description || '',
      link_url: product.link_url || '',
      images: product.images || [],
      is_active: product.is_active,
      swiper_main_text: (product as any).swiper_main_text || '',
      swiper_subtitle: (product as any).swiper_subtitle || '',
      swiper_price: (product as any).swiper_price || ''
    });
    setShowAddModal(true);
  };


  const handleDelete = async (productId: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto em destaque?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('featured_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      alert('Produto excluído com sucesso!');
      loadProducts();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      alert('Erro ao excluir produto. Tente novamente.');
    }
  };

  const toggleActive = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('featured_products')
        .update({ is_active: !currentStatus })
        .eq('id', productId);

      if (error) throw error;
      loadProducts();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status do produto.');
    }
  };


  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Usuário não autenticado.');
        return;
      }

      // Criar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `featured_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Fazer upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('featured_images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        alert('Erro ao fazer upload da imagem. Tente novamente.');
        return;
      }

      // Obter URL pública da imagem
      const { data: { publicUrl } } = supabase.storage
        .from('featured_images')
        .getPublicUrl(fileName);

      // Adicionar URL ao form
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, publicUrl]
      }));

      alert('Imagem enviada com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro inesperado ao fazer upload. Tente novamente.');
    }

    // Limpar input
    event.target.value = '';
  };

  const addImageUrl = () => {
    const url = prompt('Digite a URL da imagem:');
    if (url && url.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, url.trim()]
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#57da74]"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Acesso Negado</h1>
          <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: '"Outfit", sans-serif' }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="relative flex items-center justify-between">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 rounded-full transition-colors border border-gray-300 bg-white text-black hover:text-gray-700"
              aria-label="Voltar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900">Painel Administrativo</h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-[#57da74] text-black px-3 py-1.5 rounded-lg hover:bg-[#4ac863] transition-colors text-sm font-medium"
              aria-label="Adicionar produto em destaque"
            >
              + Adicionar
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Produtos em Destaque</h2>
            <p className="text-sm text-gray-600 mt-1">Gerencie os produtos exibidos no swiper da página inicial</p>
          </div>

          <div className="p-6">
            {products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Nenhum produto em destaque cadastrado.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 bg-[#57da74] text-black px-4 py-2 rounded-lg hover:bg-[#4ac863] transition-colors"
                >
                  Adicionar destaque
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {product.images && product.images.length > 0 && (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {(product as any).swiper_subtitle || product.title}
                      </h3>
                      {product.price && (
                        <p className="text-[#57da74] font-bold mb-2">
                          R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleActive(product.id, product.is_active)}
                            className={`p-1 rounded ${
                              product.is_active
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={product.is_active ? 'Desativar' : 'Ativar'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                                product.is_active
                                  ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                                  : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              } />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Excluir"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingProduct ? 'Editar Produto' : 'Adicionar Produto em Destaque'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link URL (opcional)
                  </label>
                  <input
                    type="url"
                    value={formData.link_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#57da74]"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagens
                  </label>
                  <div className="space-y-2">
                    {formData.images.map((image, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="url"
                          value={image}
                          onChange={(e) => {
                            const newImages = [...formData.images];
                            newImages[index] = e.target.value;
                            setFormData(prev => ({ ...prev, images: newImages }));
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#57da74] text-sm"
                          placeholder="URL da imagem"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#57da74] text-sm file:mr-4 file:py-2 file:px-4 file:rounded-l-md file:border-0 file:text-sm file:font-semibold file:bg-[#57da74] file:text-white hover:file:bg-[#4ac863]"
                      />
                      <button
                        type="button"
                        onClick={addImageUrl}
                        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-[#57da74] hover:text-[#57da74] transition-colors"
                      >
                        + Adicionar por URL
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4 w-4 text-[#57da74] focus:ring-[#57da74] border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                    Produto ativo (visível no app)
                  </label>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Configurações do Swiper</h4>
                  <p className="text-sm text-gray-600 mb-4">Personalize os textos exibidos quando não há produtos em destaque</p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Texto Principal
                      </label>
                      <input
                        type="text"
                        value={formData.swiper_main_text}
                        onChange={(e) => setFormData(prev => ({ ...prev, swiper_main_text: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#57da74]"
                        placeholder="Ex: Anuncie aqui"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subtítulo
                      </label>
                      <input
                        type="text"
                        value={formData.swiper_subtitle}
                        onChange={(e) => setFormData(prev => ({ ...prev, swiper_subtitle: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#57da74]"
                        placeholder="Ex: Anúncios a partir de"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preço
                      </label>
                      <input
                        type="text"
                        value={formData.swiper_price}
                        onChange={(e) => setFormData(prev => ({ ...prev, swiper_price: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#57da74]"
                        placeholder="Ex: R$ 50,00"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingProduct(null);
                      setFormData({
                        title: '',
                        price: '',
                        description: '',
                        link_url: '',
                        images: [],
                        is_active: true,
                        swiper_main_text: '',
                        swiper_subtitle: '',
                        swiper_price: ''
                      });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#57da74] text-white rounded-lg hover:bg-[#4ac863] transition-colors"
                  >
                    {editingProduct ? 'Atualizar' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;