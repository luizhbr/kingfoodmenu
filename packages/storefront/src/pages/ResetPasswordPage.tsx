import { useState, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { withCsrf } from '../lib/csrf.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function requestReset(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      await withCsrf(headers);
      const res = await fetch(`${API_BASE}/api/auth/customer/forgot-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar solicitação');
      setMessage(data.data?.message || 'Se o email estiver cadastrado, você receberá um link.');
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar solicitação.');
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (password.length < 6) {
      setError(t('auth.passwordTooShort', 'A senha deve ter pelo menos 6 caracteres.'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwordMismatch', 'As senhas não conferem.'));
      return;
    }
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      await withCsrf(headers);
      const res = await fetch(`${API_BASE}/api/auth/customer/reset-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao redefinir a senha.');
      setMessage(data.data?.message || 'Senha redefinida com sucesso!');
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  // ========== Tela 1: solicitar link (sem token) ==========
  if (!token) {
    return (
      <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{t('reset.title', 'Redefinir senha')}</h1>
            <p className="mt-2 text-gray-600">{t('reset.subtitle', 'Informe seu email e enviaremos um link para redefinir sua senha.')}</p>
          </div>

          <form onSubmit={requestReset} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>
            )}
            {message && !error && (
              <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">{message}</div>
            )}

            {!done && (
              <>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('auth.email', 'Email')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {loading ? t('reset.sending', 'Enviando...') : t('reset.sendLink', 'Enviar link de redefinição')}
                </button>
              </>
            )}

            <p className="text-center text-sm text-gray-600 mt-4">
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                {t('reset.backToLogin', 'Voltar para entrar')}
              </Link>
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ========== Tela 2: nova senha (com token) ==========
  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('reset.newPasswordTitle', 'Nova senha')}</h1>
          <p className="mt-2 text-gray-600">{t('reset.newPasswordSubtitle', 'Escolha uma nova senha para sua conta.')}</p>
        </div>

        <form onSubmit={submitReset} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>
          )}
          {message && !error && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">{message}</div>
          )}

          {!done && (
            <>
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.password', 'Nova senha')}
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div className="mb-6">
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('reset.confirmPassword', 'Confirmar senha')}
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? t('reset.saving', 'Salvando...') : t('reset.savePassword', 'Redefinir senha')}
              </button>
            </>
          )}

          <p className="text-center text-sm text-gray-600 mt-4">
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              {t('reset.backToLogin', 'Voltar para entrar')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
