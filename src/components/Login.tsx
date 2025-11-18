import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let message = 'Erro ao fazer login.';
        if (error.message.includes('Invalid login credentials')) {
          message = 'Login inválido. Verifique e-mail e senha.';
        } else if (error.message.includes('Email not confirmed')) {
          message = 'E-mail não confirmado. Verifique sua caixa de entrada.';
        } else if (error.status === 400) {
          message = 'Dados de login inválidos. Verifique e-mail e senha.';
        } else if (error.status === 500) {
          message = 'Erro interno do servidor. Tente novamente mais tarde.';
        }
        setError(message);
      } else {
        // Verificar se o perfil existe (conta não foi desativada)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

          if (profileError || !profile) {
            // Conta foi desativada ou perfil não existe
            await supabase.auth.signOut();
            setError('Esta conta foi desativada e não pode mais ser acessada.');
            setLoading(false);
            return;
          }
        }
        navigate('/');
      }
    } catch (err: unknown) {
      let message = 'Erro ao fazer login. Tente novamente.';
      const error = err as { status?: number; message?: string };
      if (error.status === 400) {
        message = 'Dados de login inválidos. Verifique e-mail e senha.';
      } else if (error.status === 500) {
        message = 'Erro interno do servidor. Tente novamente mais tarde.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#57da74] to-black" style={{ fontFamily: '"Outfit", sans-serif' }}>
      {/* Header */}
      <header className="bg-gradient-to-r from-[#57da74] to-black shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0.5">
          <div className="flex items-center justify-center">
            <a
              href="/download"
              className="flex items-center space-x-2 bg-black border border-[#57da74] rounded-full px-3 py-1.5 hover:bg-gray-800 transition-colors"
              style={{ boxShadow: '0 0 10px rgba(87, 218, 116, 0.5)' }}
            >
              <svg className="w-5 h-5 text-[#57da74]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-white text-sm font-medium">Download APP</span>
            </a>
          </div>
        </div>
      </header>
      <div className="flex items-center justify-center px-4 pt-8">
        <div className="max-w-md w-full space-y-8">

        {/* Form */}
        <div className="bg-gradient-to-b from-[#57da74] to-black p-8 rounded-2xl shadow-lg border border-gray-100">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-b from-[#57da74] to-black/50 bg-opacity-30 backdrop-blur-sm rounded-lg px-0.4 py-1 mb--6">
              <div className="flex items-center justify-center space-x-0.5">
                <img
                  src="/logotipo.png"
                  alt="Logo SóBrick"
                  className="h-16 w-auto drop-shadow-2xl"
                />
                <h2 className="text-3xl font-black text-white drop-shadow-2xl flex items-center">
                  <span className="text-[#57da74]" style={{ WebkitTextStroke: '1px black' }}>Só</span><span className="text-black">Brick</span>
                </h2>
              </div>
            </div>
            <p className="text-white">Entre na sua conta</p>
          </div>

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {error && (
              <div className="text-red-500 text-sm text-center mb-4">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#57da74] focus:ring-[#57da74] border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-white">
                  Lembrar-me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="text-[#57da74] hover:text-[#4bc864] font-medium">
                  Esqueceu a senha?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#57da74] text-black py-3 px-4 rounded-full font-semibold hover:bg-[#4bc864] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#57da74] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-white">
              Não tem uma conta?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-[#57da74] hover:text-[#4bc864] font-medium cursor-pointer"
              >
                Cadastre-se
              </button>
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Login;