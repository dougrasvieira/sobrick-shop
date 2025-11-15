import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    location: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<number>(0);
  const [cooldown, setCooldown] = useState<number>(0);

  // Countdown para cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegister = async () => {
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    // Rate limiting: verificar se passou 60 segundos da última tentativa
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttempt;

    if (timeSinceLastAttempt < 60000) {
      const remaining = Math.ceil((60000 - timeSinceLastAttempt) / 1000);
      setError(`Aguarde ${remaining} segundos antes de tentar novamente.`);
      setCooldown(remaining);
      return;
    }

    setLoading(true);
    setError('');
    setLastAttempt(now);

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            location: formData.location,
            phone: formData.phone,
          },
          emailRedirectTo: import.meta.env.DEV
            ? 'http://localhost:5173/login'
            : 'https://www.sobrick.shop/login'
        }
      });

      if (error) {
        let message = 'Erro ao cadastrar.';
        if (error.message.includes('User already registered')) {
          message = 'Usuário já cadastrado. Tente fazer login.';
        } else if (error.message.includes('Password should be at least')) {
          message = 'A senha deve ter pelo menos 6 caracteres.';
        } else if (error.message?.includes('429') || error.status === 429) {
          message = 'Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.';
        } else if (error.status === 500) {
          message = 'Erro interno do servidor. Verifique as configurações de redirecionamento no painel do Supabase.';
        }
        setError(message);
      } else {
        // Quando confirmação de email está habilitada, o usuário precisa confirmar o email
        Swal.fire({
          title: 'Sucesso!',
          text: 'Cadastro realizado! Verifique seu email para confirmar a conta antes de fazer login.',
          icon: 'success',
          confirmButtonColor: '#57da74'
        });
        // Não navega automaticamente para login
      }
    } catch (err: any) {
      let message = 'Erro ao cadastrar. Tente novamente.';
      if (err.message?.includes('429') || err.status === 429) {
        message = 'Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.';
      } else if (err.status === 500) {
        message = 'Erro interno do servidor. Verifique as configurações de redirecionamento no painel do Supabase.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#57da74] to-black flex items-center justify-center px-4" style={{ fontFamily: '"Outfit", sans-serif' }}>
      <div className="max-w-md w-full space-y-8">

        {/* Form */}
        <div className="bg-gradient-to-b from-[#57da74] to-black p-8 rounded-2xl shadow-lg border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-black drop-shadow-2xl mb-2">Criar conta</h2>
            <p className="text-white text-xs">Junte-se à nossa comunidade de vendas e trocas</p>
          </div>

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-white mb-2">
                Nome completo
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#57da74] focus:border-transparent transition-colors text-white placeholder-gray-300"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#57da74] focus:border-transparent transition-colors text-white placeholder-gray-300"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#57da74] focus:border-transparent transition-colors text-white placeholder-gray-300"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#57da74] focus:border-transparent transition-colors text-white placeholder-gray-300"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-white mb-2">
                Localização
              </label>
              <input
                id="location"
                name="location"
                type="text"
                autoComplete="address-level2"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#57da74] focus:border-transparent transition-colors text-white placeholder-gray-300"
                placeholder="Cidade, Estado"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-white mb-2">
                Telefone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#57da74] focus:border-transparent transition-colors text-white placeholder-gray-300"
                placeholder="(63) 99999-9999"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center mb-4">
                {error}
              </div>
            )}

            {cooldown > 0 && (
              <div className="text-yellow-400 text-sm text-center mb-4">
                Próxima tentativa em: {cooldown} segundos
              </div>
            )}

            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full bg-[#57da74] text-black py-3 px-4 rounded-full font-semibold hover:bg-[#4bc864] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#57da74] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Criando conta...' : cooldown > 0 ? `Aguarde ${cooldown}s` : 'Criar conta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-white">
              Já tem uma conta?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-[#57da74] hover:text-[#4bc864] font-medium cursor-pointer"
              >
                Faça login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;