import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
// @ts-ignore
import { supabase } from '../supabaseClient';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const seller = location.state?.seller;
  const [isEditing, setIsEditing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    location: '',
    phone: '',
    avatar: ''
  });

  // Carregar dados do perfil quando o componente montar
  useEffect(() => {
    if (!seller) {
      const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Verificar se é admin
          const { data: adminData } = await supabase
            .from('admin_users')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

          setIsAdmin(!!adminData);

          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (data) {
            const avatarUrl = data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.full_name.charAt(0))}&background=57da74&color=fff&size=128`;
            setProfileData({
              fullName: data.full_name,
              location: data.location,
              phone: data.phone,
              avatar: avatarUrl
            });
          }
        }
        setLoading(false);
      };
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [seller]);

  const handleLogout = async () => {
    setShowSettingsModal(false);
    Swal.fire({
      title: 'Tem certeza?',
      text: 'Você será desconectado da sua conta.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#57da74',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sim',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await supabase.auth.signOut();
        navigate('/login');
      }
    });
  };

  const handleChangePassword = () => {
    setShowSettingsModal(false);
    Swal.fire({
      title: 'Alterar Senha',
      html: `
        <input type="password" id="currentPassword" class="swal2-input" placeholder="Senha atual">
        <input type="password" id="newPassword" class="swal2-input" placeholder="Nova senha">
        <input type="password" id="confirmPassword" class="swal2-input" placeholder="Confirmar senha">
      `,
      confirmButtonText: 'Alterar',
      confirmButtonColor: '#57da74',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const currentPassword = (document.getElementById('currentPassword') as HTMLInputElement).value;
        const newPassword = (document.getElementById('newPassword') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement).value;

        if (!currentPassword || !newPassword || !confirmPassword) {
          Swal.showValidationMessage('Todos os campos são obrigatórios');
          return false;
        }

        if (newPassword !== confirmPassword) {
          Swal.showValidationMessage('A nova senha e a confirmação não coincidem');
          return false;
        }

        if (newPassword.length < 6) {
          Swal.showValidationMessage('A nova senha deve ter pelo menos 6 caracteres');
          return false;
        }

        // Aqui você pode adicionar a lógica para verificar a senha atual e atualizar
        // Por enquanto, apenas simula o sucesso
        return { currentPassword, newPassword };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        // Simulação de sucesso
        Swal.fire({
          title: 'Sucesso!',
          text: 'Senha alterada com sucesso.',
          icon: 'success',
          confirmButtonColor: '#57da74'
        });
      }
    });
  };

  const handleChangeEmail = () => {
    setShowSettingsModal(false);
    Swal.fire({
      title: 'Alterar Email',
      html: `
        <input type="email" id="newEmail" class="swal2-input" placeholder="Novo email">
      `,
      confirmButtonText: 'Alterar',
      confirmButtonColor: '#57da74',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const newEmail = (document.getElementById('newEmail') as HTMLInputElement).value;

        if (!newEmail) {
          Swal.showValidationMessage('O campo de email é obrigatório');
          return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
          Swal.showValidationMessage('Por favor, insira um email válido');
          return false;
        }

        // Aqui você pode adicionar a lógica para atualizar o email
        // Por enquanto, apenas simula o sucesso
        return { newEmail };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        // Simulação de sucesso
        Swal.fire({
          title: 'Sucesso!',
          text: 'Email alterado com sucesso.',
          icon: 'success',
          confirmButtonColor: '#57da74'
        });
      }
    });
  };

  const handleDeactivateAccount = async () => {
    setShowSettingsModal(false);
    Swal.fire({
      title: 'Tem certeza?',
      text: 'Sua conta será permanentemente desativada e TODOS os seus dados serão removidos. Esta ação não pode ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, desativar conta',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            Swal.fire('Erro', 'Usuário não encontrado.', 'error');
            return;
          }

          // 0. Remover arquivos do storage antes de deletar registros

          // Remover avatar
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('id', user.id)
              .single();

            if (profile?.avatar_url && !profile.avatar_url.includes('ui-avatars.com')) {
              const url = new URL(profile.avatar_url);
              const pathParts = url.pathname.split('/');
              const filename = pathParts[pathParts.length - 1];
              await supabase.storage.from('avatars').remove([filename]);
            }
          } catch (error) {
            console.error('Erro ao remover avatar:', error);
          }

          // Remover imagens de produtos
          try {
            const { data: products } = await supabase
              .from('products')
              .select('images')
              .eq('user_id', user.id);

            if (products) {
              const filesToDelete: string[] = [];
              products.forEach((product: any) => {
                if (product.images && Array.isArray(product.images)) {
                  product.images.forEach((imageUrl: string) => {
                    try {
                      const url = new URL(imageUrl);
                      const pathParts = url.pathname.split('/');
                      const filename = pathParts[pathParts.length - 1];
                      filesToDelete.push(filename);
                    } catch (error) {
                      console.error('Erro ao processar URL da imagem:', error);
                    }
                  });
                }
              });

              if (filesToDelete.length > 0) {
                await supabase.storage.from('product-images').remove(filesToDelete);
              }
            }
          } catch (error) {
            console.error('Erro ao remover imagens de produtos:', error);
          }

          // 1. Remover ratings/avaliações do usuário
          const { error: ratingsError } = await supabase
            .from('ratings')
            .delete()
            .eq('user_id', user.id);

          if (ratingsError) {
            console.error('Erro ao remover ratings:', ratingsError);
          }

          // 2. Remover chats onde o usuário é buyer ou seller
          const { error: chatsBuyerError } = await supabase
            .from('chats')
            .delete()
            .eq('buyer_id', user.id);

          if (chatsBuyerError) {
            console.error('Erro ao remover chats (buyer):', chatsBuyerError);
          }

          const { error: chatsSellerError } = await supabase
            .from('chats')
            .delete()
            .eq('seller_id', user.id);

          if (chatsSellerError) {
            console.error('Erro ao remover chats (seller):', chatsSellerError);
          }

          // 3. Remover produtos do usuário
          const { error: productsError } = await supabase
            .from('products')
            .delete()
            .eq('user_id', user.id);

          if (productsError) {
            console.error('Erro ao remover produtos:', productsError);
          }

          // 4. Remover perfil do usuário
          const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user.id);

          if (profileError) {
            console.error('Erro ao remover perfil:', profileError);
          }

          // 5. Remover da tabela admin_users se for admin
          const { error: adminError } = await supabase
            .from('admin_users')
            .delete()
            .eq('user_id', user.id);

          if (adminError) {
            console.error('Erro ao remover admin:', adminError);
          }

          // 6. Logout
          await supabase.auth.signOut();

          Swal.fire({
            title: 'Conta Desativada',
            text: 'Sua conta e todos os dados foram removidos permanentemente.',
            icon: 'success',
            confirmButtonColor: '#57da74'
          }).then(() => {
            navigate('/login');
          });

        } catch (error) {
          console.error('Erro ao desativar conta:', error);
          Swal.fire({
            title: 'Erro',
            text: 'Não foi possível desativar a conta. Tente novamente.',
            icon: 'error'
          });
        }
      }
    });
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.fullName,
          location: profileData.location,
          phone: profileData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        Swal.fire('Erro', 'Não foi possível salvar as alterações.', 'error');
      } else {
        Swal.fire('Sucesso', 'Perfil atualizado!', 'success');
        setIsEditing(false);
      }
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}.${fileExt}`;
        const { error } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { upsert: true });

        if (error) {
          Swal.fire('Erro', 'Não foi possível fazer upload da imagem.', 'error');
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          setProfileData(prev => ({ ...prev, avatar: publicUrl }));

          await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', user.id);
        }
      }
    }
  };

  if (isEditing) {
    if (loading && !seller) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center" style={{ fontFamily: '"Outfit", sans-serif' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#57da74]"></div>
        </div>
      );
    }
  
    return (
      <div className="min-h-screen bg-white pb-20" style={{ fontFamily: '"Outfit", sans-serif' }}>
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 rounded-full transition-colors border border-gray-300 bg-white text-black hover:text-gray-700 cursor-pointer"
                aria-label="Voltar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-black">Editar Perfil</h1>
              <button
                onClick={handleSave}
                className="text-[#57da74] font-semibold cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>
        </header>

        {/* Edit Profile Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-md mx-auto space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-[#57da74] mb-4">
                {profileData.avatar ? (
                  <img
                    src={profileData.avatar}
                    alt="Foto do perfil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Alterar foto do perfil"
                />
              </div>
              <p className="text-sm text-gray-600">Clique na imagem para alterar</p>
            </div>

            {/* Full Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
              <input
                type="text"
                value={profileData.fullName}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setProfileData(prev => ({ ...prev, fullName: newValue }));
                  localStorage.setItem('userFullName', newValue);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57da74] focus:border-transparent"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
              <input
                type="text"
                value={profileData.location}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setProfileData(prev => ({ ...prev, location: newValue }));
                  localStorage.setItem('userLocation', newValue);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57da74] focus:border-transparent"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setProfileData(prev => ({ ...prev, phone: newValue }));
                  localStorage.setItem('userPhone', newValue);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57da74] focus:border-transparent"
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-black text-center flex-1">{seller ? 'Perfil do vendedor' : 'Perfil'}</h1>
            {seller ? null : (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-2 rounded-full transition-colors border border-gray-200 bg-white text-black hover:text-gray-700 cursor-pointer"
                aria-label="Menu"
              >
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center">
          {/* Profile Picture and Info */}
          <div className="text-center mb-8 bg-gray-100 px-12 py-6 rounded-lg">
            {/* Profile Picture */}
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#57da74] mb-6 mx-auto">
              {(seller ? seller.avatar_url : profileData.avatar) ? (
                <img
                  src={seller ? seller.avatar_url : profileData.avatar}
                  alt="Foto do perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              )}
            </div>
            <h2 className="text-2xl font-bold text-black mb-2 whitespace-nowrap">{seller ? seller.full_name : profileData.fullName}</h2>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-base text-black">{seller ? seller.location : profileData.location}</p>
            </div>

            {/* Contact Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-base text-black">{seller ? seller.phone : profileData.phone}</span>
              </div>
            </div>
          </div>

          {/* Menu Options */}
          {seller ? null : (
            <div className="w-full max-w-48 space-y-4">
              <button
                onClick={() => setIsEditing(true)}
                className="w-full text-gray-900 font-semibold py-3 px-4 rounded-full transition-colors cursor-pointer flex items-center justify-center border border-gray-200 hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar perfil
              </button>

              <button
                onClick={() => navigate('/my-sales')}
                className="w-full text-gray-900 font-semibold py-3 px-4 rounded-full transition-colors cursor-pointer flex items-center justify-center border border-gray-200 hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Minhas vendas
              </button>

              <button
                onClick={() => navigate('/interests')}
                className="w-full text-gray-900 font-semibold py-3 px-4 rounded-full transition-colors cursor-pointer flex items-center justify-center border border-gray-200 hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Tenho interesse
              </button>

              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full text-[#57da74] font-semibold py-3 px-4 rounded-full transition-colors cursor-pointer flex items-center justify-center border border-[#57da74] hover:bg-[#57da74] hover:text-white"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Painel Admin
                </button>
              )}

            </div>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Configurações</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Fechar"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Options */}
            <div className="py-2">
              <button
                onClick={handleChangePassword}
                className="w-full flex items-center px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-base font-medium text-gray-900">Alterar senha</p>
                  <p className="text-sm text-gray-500">Atualize sua senha de acesso</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={handleChangeEmail}
                className="w-full flex items-center px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-base font-medium text-gray-900">Alterar email</p>
                  <p className="text-sm text-gray-500">Modifique seu endereço de email</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-base font-medium text-gray-900">Sair</p>
                  <p className="text-sm text-gray-500">Encerrar sessão</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={handleDeactivateAccount}
                className="w-full flex items-center px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-base font-medium text-gray-900">Desativar conta</p>
                  <p className="text-sm text-gray-500">Remova permanentemente sua conta</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;