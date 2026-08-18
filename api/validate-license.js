// Función serverless de Vercel (gratis en el plan Hobby).
// Se despliega automáticamente en: https://tu-app.vercel.app/api/validate-license
//
// Cómo administrás las claves (sin base de datos, sin costo):
// En el dashboard de Vercel → tu proyecto → Settings → Environment Variables,
// creás una variable LICENSE_KEYS con este formato (separadas por coma):
//   "Crealo.ia:AB12-CD34-EF56,Crealo.ia-002:GH78-IJ90-KL12"
// Cada vez que vendas la app a un billar nuevo, agregás una etiqueta y
// clave nueva a esa lista y le das "Redeploy" en Vercel (un click).
// La etiqueta (antes de los ":") es solo para que vos identifiques la
// instalación — el cliente final nunca la ve. Nada de código nuevo.

export default async function handler(req, res) {
  // Solo POST, y solo con la clave en el cuerpo del pedido.
  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, error: 'Método no permitido' });
  }

  const { key } = req.body || {};
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ valid: false, error: 'Falta la clave' });
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
