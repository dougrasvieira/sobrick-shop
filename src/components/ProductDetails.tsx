import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// @ts-ignore
import { supabase } from '../supabaseClient';

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[];
  description?: string;
  is_active: boolean;
  header_name?: string;
  header_location?: string;
}

const ProductDetails: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { productId } = location.state || {};
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [quickEditMode, setQuickEditMode] = useState<{ [key: string]: boolean }>({});
  const [headerName, setHeaderName] = useState('João Silva');
  const [headerLocation, setHeaderLocation] = useState('Palmas-PR, São Francisco');

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    description: '',
    images: [] as string[],
    is_active: true,
    header_name: headerName,
    header_location: headerLocation
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentView, setCurrentView] = useState<'details' | 'grid'>('grid');

  useEffect(() => {
    const init = async () => {
      await checkAdminAccess();
      loadProduct();
      if (!productId) {
        await loadConfig();
        loadProducts();
        setCurrentView('grid');
      } else {
        setCurrentView('details');
      }
    };
    init();
  }, [productId]);

  useEffect(() => {
    if (!productId && headerName) {
      loadProducts();
    }
  }, [headerName, productId]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        setIsAdmin(!!adminData);
      }
    } catch (error) {
      console.error('Erro ao verificar acesso admin:', error);
    }
  };

  const loadConfig = async () => {
    try {
      // Verificar se usuário está logado e carregar perfil
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setHeaderName(profileData.full_name || 'João Silva');
          setHeaderLocation(profileData.location || 'Palmas-PR, São Francisco');
          return;
        }
      }

      // Caso contrário, carregar da configuração global
      const { data, error } = await supabase
        .from('app_config')
        .select('key, value');
      if (error) throw error;
      const config = data.reduce((acc: any, item: any) => {
        acc[item.key] = item.value;
        return acc;
      }, {});
      setHeaderName(config.current_header_name || 'João Silva');
      setHeaderLocation(config.current_header_location || 'Palmas-PR, São Francisco');
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const saveConfig = async (key: string, value: string) => {
    try {
      const { error } = await supabase
        .from('app_config')
        .upsert({ key, value }, { onConflict: 'key' });
      if (error) throw error;
      console.log(`Configuração salva: ${key} = ${value}`);
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
    }
  };

  const saveHeader = async (field: string, value: string) => {
    if (!product) return;
    try {
      const { error } = await supabase
        .from('featured_products')
        .update({ [field]: value })
        .eq('id', product.id);
      if (error) throw error;
      // Update local state
      if (field === 'header_name') setHeaderName(value);
      else if (field === 'header_location') setHeaderLocation(value);
    } catch (error) {
      console.error('Erro ao salvar header:', error);
    }
  };


  const loadProduct = async () => {
    if (!productId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('featured_products')
        .select('*')
        .eq('id', productId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setProduct(data);
      setHeaderName(data.header_name || 'João Silva');
      setHeaderLocation(data.header_location || 'Palmas-PR, São Francisco');
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      navigate('/');
    } finally {
      setLoading(false);
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

      // Upload das imagens selecionadas
      const allImages = await uploadImages();

      if (editingProduct) {
        const { error } = await supabase
          .from('featured_products')
          .update({
            title: formData.title,
            price: parseFloat(formData.price) || 0,
            description: formData.description,
            images: allImages.length > 0 ? allImages : ['https://picsum.photos/300/200?random=default'],
            is_active: formData.is_active,
            header_name: formData.header_name,
            header_location: formData.header_location
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
        alert('Produto atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('featured_products')
          .insert({
            title: formData.title,
            price: parseFloat(formData.price) || 0,
            description: formData.description,
            images: allImages.length > 0 ? allImages : ['https://picsum.photos/300/200?random=default'],
            is_active: formData.is_active,
            created_by: user.id,
            order_position: 0,
            show_in_swiper: false,
            header_name: formData.header_name,
            header_location: formData.header_location
          });

        if (error) throw error;
        alert('Produto adicionado com sucesso!');
        if (currentView === 'details') {
          // Se estava visualizando um produto, muda para o grid
          setCurrentView('grid');
          loadProducts();
        } else {
          // Se já estava no grid, apenas recarrega
          loadProducts();
        }
      }

      // Atualizar configurações do header se foram modificadas
      if (formData.header_name !== headerName) {
        setHeaderName(formData.header_name);
      }
      if (formData.header_location !== headerLocation) {
        setHeaderLocation(formData.header_location);
      }

      setFormData({
        title: '',
        price: '',
        description: '',
        images: [],
        is_active: true,
        header_name: formData.header_name,
        header_location: formData.header_location
      });
      setSelectedFiles([]);
      setShowAddModal(false);
      setEditingProduct(null);
      loadProduct();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Erro ao salvar produto. Tente novamente.');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      price: product.price?.toString() || '',
      description: product.description || '',
      images: product.images || [],
      is_active: product.is_active,
      header_name: headerName,
      header_location: headerLocation
    });
    setShowAddModal(true);
  };

  const handleQuickEdit = async (productId: string, field: string, value: string) => {
    try {
      const updateData: any = {};
      if (field === 'title') {
        updateData.title = value;
      } else if (field === 'price') {
        updateData.price = parseFloat(value) || 0;
      }

      const { error } = await supabase
        .from('featured_products')
        .update(updateData)
        .eq('id', productId);

      if (error) throw error;
      loadProduct();
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      alert('Erro ao atualizar produto');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
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
      loadProduct();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      alert('Erro ao excluir produto. Tente novamente.');
    }
  };


  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (selectedFiles.length === 0) return formData.images;

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('featured_images')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Erro no upload:', uploadError);
          continue;
        }

        const { data } = supabase.storage
          .from('featured_images')
          .getPublicUrl(filePath);

        if (data?.publicUrl) {
          uploadedUrls.push(data.publicUrl);
        }
      }

      return [...formData.images, ...uploadedUrls];
    } catch (error) {
      console.error('Erro no upload das imagens:', error);
      return formData.images;
    } finally {
      setUploadingImages(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('featured_products')
        .select('*')
        .eq('is_active', true)
        .eq('show_in_swiper', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" style={{ fontFamily: '"Outfit", sans-serif' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#57da74]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Outfit", sans-serif' }}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-full transition-colors border border-gray-300 bg-white text-black hover:text-gray-700 cursor-pointer"
              aria-label="Voltar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 text-center">
              {isAdmin ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={headerName}
                    onChange={(e) => setHeaderName(e.target.value)}
                    onBlur={(e) => product ? saveHeader('header_name', e.target.value) : saveConfig('current_header_name', e.target.value)}
                    className="text-lg font-bold text-gray-900 bg-transparent border-none outline-none text-center w-full"
                    placeholder="Nome do vendedor"
                  />
                  <div className="flex items-center justify-center space-x-1">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm font-semibold text-gray-500">{headerLocation}</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-lg font-bold text-gray-900">{headerName}</p>
                  <div className="flex items-center justify-center space-x-1">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm font-semibold text-gray-500">{headerLocation}</p>
                  </div>
                </>
              )}
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-[#57da74] text-white px-4 py-2 rounded-lg hover:bg-[#4ac863] transition-colors text-sm"
              >
                Adicionar Produto
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Product Details */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'grid' ? (
          <div>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Nenhum produto adicionado ainda.</p>
                {isAdmin && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 bg-[#57da74] text-white px-4 py-2 rounded-lg hover:bg-[#4ac863] transition-colors"
                  >
                    Adicionar primeiro produto
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {products.filter(p => isAdmin || p.header_name === headerName).map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden h-52 relative cursor-pointer"
                    onClick={() => {
                      setProduct(prod);
                      setCurrentView('details');
                    }}
                  >
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(prod.id);
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                        title="Remover produto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                    {prod.images && prod.images.length > 0 && (
                      <img
                        src={prod.images[0]}
                        alt={prod.title}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <div className="p-2 flex flex-col justify-between h-20 bg-gray-100">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-base sm:text-lg font-semibold text-black truncate">
                          {prod.title}
                        </h3>
                        <p className="text-base sm:text-lg font-bold text-green-800">
                          R$ {prod.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : product ? (
          <div className="max-w-md mx-auto">
            <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
              {product.images && product.images.length > 0 && (
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="w-full h-64 object-cover"
                />
              )}
              <div className="p-4">
                {quickEditMode[product.id] && isAdmin ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      defaultValue={product.title}
                      onBlur={(e) => {
                        handleQuickEdit(product.id, 'title', e.target.value);
                        setQuickEditMode(prev => ({ ...prev, [product.id]: false }));
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleQuickEdit(product.id, 'title', e.currentTarget.value);
                          setQuickEditMode(prev => ({ ...prev, [product.id]: false }));
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#57da74]"
                      autoFocus
                    />
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={product.price || 0}
                      onBlur={(e) => {
                        handleQuickEdit(product.id, 'price', e.target.value);
                        setQuickEditMode(prev => ({ ...prev, [product.id]: false }));
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleQuickEdit(product.id, 'price', e.currentTarget.value);
                          setQuickEditMode(prev => ({ ...prev, [product.id]: false }));
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-bold text-[#57da74] focus:outline-none focus:ring-2 focus:ring-[#57da74]"
                    />
                  </div>
                ) : (
                  <>
                    <h1 className={`text-xl font-bold text-gray-900 mb-2 ${isAdmin ? 'cursor-pointer hover:text-[#57da74] transition-colors' : ''}`}
                        onClick={isAdmin ? () => setQuickEditMode(prev => ({ ...prev, [product.id]: true })) : undefined}>
                      {product.title}
                    </h1>
                    {product.price && (
                      <p className={`text-2xl font-bold text-green-800 mb-4 ${isAdmin ? 'cursor-pointer hover:text-green-600 transition-colors' : ''}`}
                         onClick={isAdmin ? () => setQuickEditMode(prev => ({ ...prev, [product.id]: true })) : undefined}>
                        R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </>
                )}
                {product.description && (
                  <p className="text-sm text-gray-600 mb-4">{product.description}</p>
                )}
                {isAdmin && (
                  <div className="flex space-x-2 mt-3">
                    <button
                      onClick={() => handleEdit(product)}
                      className="flex-1 p-1 text-blue-600 hover:bg-blue-50 rounded text-xs"
                      title="Editar completo"
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="flex-1 p-1 text-red-600 hover:bg-red-50 rounded text-xs"
                      title="Excluir"
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Produto não encontrado.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 bg-[#57da74] text-white px-4 py-2 rounded-lg hover:bg-[#4ac863] transition-colors"
            >
              Voltar ao início
            </button>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingProduct ? 'Editar Produto' : 'Adicionar Produto'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Produto
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#57da74]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#57da74]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome no Header (Vendedor)
                  </label>
                  <input
                    type="text"
                    value={formData.header_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, header_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#57da74]"
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Localização no Header
                  </label>
                  <input
                    type="text"
                    value={formData.header_location}
                    onChange={(e) => setFormData(prev => ({ ...prev, header_location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#57da74]"
                    placeholder="Ex: Palmas-PR, São Francisco"
                  />
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagens
                  </label>
                  <div className="space-y-2">
                    {/* Arquivos selecionados para upload */}
                    {selectedFiles.map((file, index) => (
                      <div key={`file-${index}`} className="flex items-center space-x-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-blue-800 flex-1 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}

                    {/* URLs de imagens existentes */}
                    {formData.images.map((image, index) => (
                      <div key={`url-${index}`} className="flex items-center space-x-2">
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

                    {/* Input para selecionar arquivos */}
                    <div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-[#57da74] hover:text-[#57da74] transition-colors cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span>Selecionar imagens do computador</span>
                      </label>
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
                    Produto ativo (visível na página)
                  </label>
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
                        images: [],
                        is_active: true,
                        header_name: headerName,
                        header_location: headerLocation
                      });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingImages}
                    className="px-4 py-2 bg-[#57da74] text-white rounded-lg hover:bg-[#4ac863] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingImages ? 'Enviando imagens...' : (editingProduct ? 'Atualizar' : 'Adicionar')}
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

export default ProductDetails;