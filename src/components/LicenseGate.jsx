import { useEffect, useState } from 'react';
import { getLicenseStatus, activateLicense, silentRevalidate } from '../utils/license';

export default function LicenseGate({ children }) {
  const [status, setStatus] = useState(() => getLicenseStatus());
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Si ya está activada, revalida en silencio (sin bloquear la pantalla)
    // cada vez que se abre la app y hay internet disponible.
    if (status.activated) {
      silentRevalidate().then(() => setStatus(getLicenseStatus()));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleActivate(e) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError('');
    const res = await activateLicense(key.trim());
    setLoading(false);
    if (res.ok) {
      setStatus(getLicenseStatus());
    } else {
      setError(res.error);
    }
  }

  if (status.activated) return children;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#141414] px-4">
      <div className="w-full max-w-sm bg-[#1B1B1B] border border-[#2A2A2A] rounded-2xl p-6 text-center">
        <div className="text-4xl mb-2">🎱</div>
        <h1 className="text-xl font-bold text-white mb-1">Billar System</h1>
        <p className="text-sm text-gray-400 mb-6">
          Ingresá tu clave de activación para empezar a usar la app.
        </p>
        <form onSubmit={handleActivate} className="space-y-3">
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="XXXX-XXXX-XXXX"
            autoCapitalize="characters"
            className="w-full text-center tracking-widest uppercase bg-[#141414] border border-[#333] rounded-lg py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#00C853]"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00C853] text-black font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Activar'}
          </button>
        </form>
        <p className="text-xs text-gray-600 mt-6">
          Necesitás internet solo para activarla. Después funciona sin conexión.
        </p>
        <p className="text-xs text-gray-600 mt-1">
          ¿No tenés una clave? Contactá a quien te instaló el sistema.
        </p>
        <p className="text-[10px] text-gray-700 mt-4 tracking-wide">
          Sistema desarrollado por Crealo.ia
        </p>
      </div>
    </div>
  );
}
