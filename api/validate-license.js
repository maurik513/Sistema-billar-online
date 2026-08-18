// Función serverless de Vercel (gratis en el plan Hobby).
// Se despliega automáticamente en: https://tu-app.vercel.app/api/validate-license
//
// Cómo administrás las claves (sin base de datos manual, sin costo):
// En el dashboard de Vercel → tu proyecto → Settings → Environment Variables,
// creás una variable LICENSE_KEYS con este formato (separadas por coma):
//   "Crealo.ia:AB12-CD34-EF56,Crealo.ia-002:GH78-IJ90-KL12"
// Cada vez que vendas la app a un billar nuevo, agregás una etiqueta y
// clave nueva a esa lista y le das "Redeploy" en Vercel (un click).
// La etiqueta (antes de los ":") es solo para que vos identifiques la
// instalación — el cliente final nunca la ve. Nada de código nuevo.
//
// BLOQUEO DE UN SOLO DISPOSITIVO:
// Cada clave se "quema" al primer dispositivo que la activa, usando
// Vercel KV (una mini base de datos gratis) para recordarlo. Si otro
// dispositivo intenta usar la misma clave, se rechaza.
// Si un cliente cambia de celular y necesita reactivar, vos podés
// borrar el registro correspondiente desde Vercel → Storage → tu base
// KV → Data Browser, buscando la clave "license_device:SUCLAVE".

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, error: 'Método no permitido' });
  }

  const { key, deviceId } = req.body || {};
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ valid: false, error: 'Falta la clave' });
  }
  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ valid: false, error: 'Falta identificar el dispositivo' });
  }

  const raw = process.env.LICENSE_KEYS || '';
  const entries = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [client, k] = s.split(':').map((p) => p && p.trim());
      return { client, key: k };
    });

  const match = entries.find((e) => e.key && e.key.toUpperCase() === key.trim().toUpperCase());

  if (!match) {
    // Mismo mensaje genérico tanto si la clave no existe como si está mal
    // escrita — no le damos pistas a quien esté probando claves al azar.
    return res.status(200).json({ valid: false });
  }

  const normalizedKey = match.key.toUpperCase();
  const kvKey = `license_device:${normalizedKey}`;

  try {
    const boundDevice = await kv.get(kvKey);

    if (!boundDevice) {
      // Primera vez que se usa esta clave: queda "quemada" a este dispositivo.
      await kv.set(kvKey, deviceId);
    } else if (boundDevice !== deviceId) {
      // La clave ya pertenece a OTRO dispositivo.
      return res.status(200).json({ valid: false, reason: 'device_mismatch' });
    }
  } catch (err) {
    // Si Vercel KV todavía no está configurado, no bloqueamos el uso de
    // la app por un error de infraestructura — dejamos pasar sin el
    // bloqueo de dispositivo (modo de compatibilidad) y lo avisamos en
    // los logs del servidor para que quien administre lo note.
    console.error('KV no disponible, validando sin bloqueo de dispositivo:', err.message);
  }

  // Válida por 45 días desde esta revalidación. Mientras el celular no
  // tenga internet, la app sigue funcionando con la última validación
  // guardada — esto solo se vuelve a chequear cuando hay wifi/datos.
  const validDays = 45;
  const expiresAt = Date.now() + validDays * 24 * 60 * 60 * 1000;

  return res.status(200).json({
    valid: true,
    client: match.client || 'Cliente',
    expiresAt,
  });
}
