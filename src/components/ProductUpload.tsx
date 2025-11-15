import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';

interface ProductFormData {
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  location: string;
  contact: string;
  shipping: string;
  exchange: string;
}

const ProductUpload: React.FC = () => {
  const navigate = useNavigate();
  // const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: '',
    location: '',
    contact: '',
    shipping: '',
    exchange: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + images.length > 5) {
      Swal.fire({
        title: 'Limite máximo de 5 imagens por produto',
        icon: 'warning',
        confirmButtonColor: '#57da74'
      });
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];

    const uploadedUrls: string[] = [];
    for (const file of images) {
      const fileName = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (error) {
        console.error('Erro ao fazer upload:', error);
        continue;
      }

      // Gerar URL pública
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        uploadedUrls.push(urlData.publicUrl);
      }
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações básicas
    if (!formData.title || !formData.price || !formData.category || !formData.condition) {
      Swal.fire({
        title: 'Por favor, preencha todos os campos obrigatórios',
        icon: 'warning',
        confirmButtonColor: '#57da74'
      });
      return;
    }

    if (parseFloat(formData.price) <= 0) {
      Swal.fire({
        title: 'O preço deve ser maior que zero',
        icon: 'warning',
        confirmButtonColor: '#57da74'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Upload das imagens
      const imageUrls = await uploadImages();

      // Criar produto no Supabase
      const { error: insertError } = await supabase
        .from('products')
        .insert({
          title: formData.title,
          price: parseFloat(formData.price),
          category: formData.category,
          condition: formData.condition,
          location: formData.location || 'Palmas-PR',
          images: imageUrls,
          description: formData.description,
          user_id: user?.id || 'guest',
          is_active: true
        });

      if (insertError) {
        throw insertError;
      }

      Swal.fire({
        title: 'Produto anunciado com sucesso!',
        icon: 'success',
        confirmButtonColor: '#57da74'
      }).then(() => {
        navigate('/');
      });

    } catch (error) {
      console.error('Erro:', error);
      Swal.fire({
        title: 'Erro ao anunciar produto. Tente novamente.',
        icon: 'error',
        confirmButtonColor: '#57da74'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    { value: 'roupas', label: 'Roupas' },
    { value: 'casa-cozinha', label: 'Casa e cozinha' },
    { value: 'games', label: 'Games' },
    { value: 'televisores', label: 'Televisores' },
    { value: 'motos', label: 'Motos' },
    { value: 'moveis-usados', label: 'Móveis usados' },
    { value: 'carros', label: 'Carros' },
    { value: 'bicicletas', label: 'Bicicletas' },
    { value: 'informatica', label: 'Informática' },
    { value: 'imoveis-alugar', label: 'Imóveis para alugar' },
    { value: 'venda-imoveis', label: 'Venda de imóveis' },
    { value: 'servicos', label: 'Serviços' },
    { value: 'ferramentas', label: 'Ferramentas' },
    { value: 'celulares', label: 'Celulares' },
    { value: 'eletronicos', label: 'Eletrônicos' },
    { value: 'eletrodomesticos', label: 'Eletrodomésticos' },
    { value: 'calcados', label: 'Calçados' },
    { value: 'jardim', label: 'Jardim' },
    { value: 'acessorios-carros', label: 'Acessórios para carros' },
    { value: 'comidas-bebidas', label: 'Comidas e bebidas' },
    { value: 'salao-beleza', label: 'Salão de beleza' },
    { value: 'barbearia', label: 'Barbearia' },
    { value: 'brinquedos', label: 'Brinquedos' },
    { value: 'madeiras-metais', label: 'Madeiras e metais' },
    { value: 'produtos-limpeza', label: 'Produtos de limpeza' },
    { value: 'ferro-velho', label: 'Ferro velho' },
    { value: 'utensilios', label: 'Utensílios' }
  ];

  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: '"Outfit", sans-serif' }}>
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
            <h1 className="text-xl font-bold text-black">Anunciar Produto</h1>
            <div className="w-10"></div> {/* Spacer */}
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fotos do Produto ({images.length}/5) *
            </label>
            <div className="grid grid-cols-5 gap-4 mb-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Produto ${index + 1}`}
                    className="w-full h-20 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="w-full h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#57da74] transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </label>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Título do Anúncio *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#57da74] focus:border-transparent"
              placeholder="Ex: Smartphone Samsung Galaxy S23"
              required
            />
          </div>

          {/* Price and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                Preço (R$) *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#57da74] focus:border-transparent"
                placeholder="0,00"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Categoria *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#57da74] focus:border-transparent"
                required
              >
                <option value="">Selecione uma categoria</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#57da74] focus:border-transparent"
              placeholder="Descreva seu produto em detalhes..."
            />
          </div>

          {/* Condition and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-2">
                Estado *
              </label>
              <select
                id="condition"
                name="condition"
                value={formData.condition}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#57da74] focus:border-transparent"
                required
              >
                <option value="">Selecione o estado</option>
                <option value="novo">Novo</option>
                <option value="semi-novo">Semi-novo</option>
                <option value="usado">Usado</option>
              </select>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Localização
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#57da74] focus:border-transparent"
                placeholder="Cidade, Estado"
              />
            </div>
          </div>

          {/* Contact */}
          <div>
            <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-2">
              Contato
            </label>
            <input
              type="text"
              id="contact"
              name="contact"
              value={formData.contact}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#57da74] focus:border-transparent"
              placeholder="WhatsApp, telefone..."
            />
          </div>

          {/* Shipping, Exchange */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label htmlFor="shipping" className="block text-sm font-medium text-gray-700 mb-2">
                Frete
              </label>
              <select
                id="shipping"
                name="shipping"
                value={formData.shipping}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#57da74] focus:border-transparent"
              >
                <option value="">Selecione</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>

            <div>
              <label htmlFor="exchange" className="block text-sm font-medium text-gray-700 mb-2">
                Aceita Troca
              </label>
              <select
                id="exchange"
                name="exchange"
                value={formData.exchange}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#57da74] focus:border-transparent"
              >
                <option value="">Selecione</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#57da74] text-black py-3 px-4 rounded-full font-semibold hover:bg-[#4bc864] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#57da74] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Anunciando...' : 'Anunciar Produto'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default ProductUpload;