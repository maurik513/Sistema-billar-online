// ============================================================
// LICENCIA — controla que la app solo funcione con una clave de
// activación válida, entregada por vos a cada cliente.
//
// Cómo funciona (igual que Office / apps de escritorio pagas):
// 1. La primera vez, pide una clave y la valida contra el servidor
//    (Vercel Function). Necesita internet SOLO esa vez.
// 2. Si es válida, guarda el resultado en este mismo dispositivo y
//    la app queda desbloqueada por 45 días, sin necesitar internet
//    para nada del uso diario.
// 3. Cada vez que la app se abre CON internet disponible, revalida
//    en silencio en segundo plano y renueva esos 45 días. Si nunca
//    hay internet, sigue funcionando igual hasta que se cumplan los
//    45 días desde la última validación exitosa.
// 4. Si en algún momento la clave deja de ser válida (la diste de
//    baja) y el dispositivo tiene internet, se bloquea en el
//    siguiente chequeo. Sin internet, sigue con la gracia de los
//    45 días como tope.
// ============================================================

const STORAGE_KEY = 'billar_license_v1';
const DEVICE_ID_KEY = 'billar_device_id_v1';

// Cambiá esto por la URL real una vez publicado. Al ser ruta relativa
// ('/api/validate-license'), funciona automáticamente en cualquier
// dominio de Vercel donde publiques la app, sin tocar código.
const VALIDATE_URL = '/api/validate-license';

// Identificador único de ESTE dispositivo/instalación. Se genera una
// sola vez y se guarda localmente — es lo que el servidor usa para
// "recordar" a qué celular pertenece cada clave.
function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearLicense() {
  localStorage.removeItem(STORAGE_KEY);
}

// Devuelve el estado actual sin llamar a internet.
export function getLicenseStatus() {
  const lic = load();
  if (!lic || !lic.valid) return { activated: false };
  const active = Date.now() < lic.expiresAt;
  return { activated: active, client: lic.client, expiresAt: lic.expiresAt };
}

// Llama al servidor para activar/revalidar una clave.
export async function activateLicense(key) {
  try {
    const res = await fetch(VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, deviceId: getDeviceId() }),
    });
    const data = await res.json();
    if (data.valid) {
      save({ valid: true, key, client: data.client, expiresAt: data.expiresAt, lastCheck: Date.now() });
      return { ok: true, client: data.client };
    }
    if (data.reason === 'device_mismatch') {
      return { ok: false, error: 'Esta clave ya está activada en otro dispositivo. Contactá a quien te la entregó.' };
    }
    return { ok: false, error: 'Clave inválida. Verificá que esté bien escrita.' };
  } catch (err) {
    return { ok: false, error: 'No se pudo conectar a internet para validar la clave. Probá cuando tengas wifi o datos.' };
  }
}

// Revalida en silencio si hay internet. No bloquea la app si falla
// (por ejemplo, si no hay conexión) — solo actualiza el "vencimiento"
// cuando logra confirmar con el servidor.
export async function silentRevalidate() {
  const lic = load();
  if (!lic || !lic.key) return;
  if (!navigator.onLine) return;

  try {
    const res = await fetch(VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: lic.key, deviceId: getDeviceId() }),
    });
    const data = await res.json();
    if (data.valid) {
      save({ valid: true, key: lic.key, client: data.client, expiresAt: data.expiresAt, lastCheck: Date.now() });
    } else {
      // La clave fue dada de baja del lado del servidor: se invalida acá.
      save({ ...lic, valid: false });
    }
  } catch {
    // Sin internet o falló la red: no tocamos nada, sigue con lo que ya tenía.
  }
}
