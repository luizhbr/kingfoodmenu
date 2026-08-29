import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Callback pós-OAuth. Recebe o token JWT + redirect opcional (ex.: /checkout).
 * - loginWithToken restaura a sessão (carrinho/checkout vivem em localStorage,
 *   então nada se perde no redirect).
 * - Se veio do checkout (redirect=/checkout), dispara o claim da recompensa
 *   de $3 (idempotente no servidor) e volta para o checkout.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const redirect = searchParams.get('redirect') || '/account';

    if (error) {
      navigate('/login?error=' + error);
      return;
    }

    if (token) {
      loginWithToken(token);

      // Recompensa de cadastro via Google (checkout) — idempotente no servidor.
      if (redirect === '/checkout') {
        fetch(`${API_BASE}/api/rewards/google-signup`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.success) {
              // Sinaliza o checkout para exibir o feedback de recompensa.
              sessionStorage.setItem('kf_google_reward', '1');
            }
          })
          .catch(() => {
            // Não bloqueia o retorno ao checkout em caso de falha.
          });
      }

      navigate(redirect, { replace: true });
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );
}
