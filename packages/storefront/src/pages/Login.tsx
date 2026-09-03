import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaStatus, setCaptchaStatus] = useState<{ enabled: boolean; siteKey: string | null; required: boolean }>({ enabled: false, siteKey: null, required: false });
  const [captchaToken, setCaptchaToken] = useState('');

  // Google OAuth indisponível (chaves não configuradas) — mostra aviso amigável.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'google_unavailable') {
      setError(t('login.googleUnavailable', 'Login com Google indisponível no momento. Use e-mail e senha.'));
    }
  }, [t]);

  // Adaptive CAPTCHA: query the server for whether this login needs a challenge.
  useEffect(() => {
    let active = true;
    fetch('/api/auth/captcha-status')
      .then((r) => r.json())
      .then((d) => { if (active && d.success) setCaptchaStatus(d.data); })
      .catch(() => { /* layer disabled — normal login */ });
    return () => { active = false; };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, captchaStatus.required ? captchaToken : undefined);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('auth.loginTitle')}</h1>
          <p className="mt-2 text-gray-600">{t('auth.loginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.email')}
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


          {captchaStatus.enabled && captchaStatus.required && (
            <div className="mb-4">
              <div
                className="cf-turnstile"
                data-sitekey={captchaStatus.siteKey}
                data-callback={(token: string) => setCaptchaToken(token)}
              />
            </div>
          )}
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

            <div className="text-right text-sm">
                <Link to="/reset-password" className="text-primary-600 hover:text-primary-700">
                    Esqueceu a senha?
                </Link>
            </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

            <div className="flex gap-3">
                <a
                    href="/api/auth/google"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Google
                </a>
            </div>

          <p className="text-center text-sm text-gray-600 mt-4">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              {t('auth.registerLink')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
