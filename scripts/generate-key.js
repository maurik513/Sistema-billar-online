// Genera una clave de licencia nueva y segura, lista para agregar a la
// variable de entorno LICENSE_KEYS en Vercel.
//
// Uso:
//   node scripts/generate-key.js "Crealo.ia"
//
// Te va a imprimir algo como:
//   Crealo.ia:7F3K-9QX2-M4LP
//
// Copiá esa línea y agregala a LICENSE_KEYS en Vercel (separada por
// coma de las que ya existan), luego dale "Redeploy" al proyecto.
// El texto antes de los dos puntos (":") es solo una etiqueta para que
// VOS identifiques a qué instalación pertenece cada clave — podés poner
// lo que quieras ahí (el nombre real del billar, un número de cliente,
// etc.), el usuario final nunca lo ve.

const clientName = process.argv[2] || 'Crealo.ia';

function randomBlock() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para evitar confusiones
  let s = '';
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const key = `${randomBlock()}-${randomBlock()}-${randomBlock()}`;
console.log(`${clientName}:${key}`);
