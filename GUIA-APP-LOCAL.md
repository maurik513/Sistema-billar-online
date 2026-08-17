# Billar System — versión 100% local (sin internet, sin servidor)

## Respuesta directa a tus preguntas

**¿La versión anterior (la del zip que descargaste antes) ya funcionaría?**
Sí, esa versión (`final` con backend en Fly.io + frontend en Vercel) estaba
completa y corregida en seguridad — funcionaría si seguías esos pasos. Pero
esa versión **necesita internet siempre** (el celular llama a un servidor
en la nube) y esa arquitectura **ya no aplica** a lo que pediste ahora.

**Lo que te entrego en este zip es otra cosa, construida desde cero a partir
de tus mismos archivos**: la misma app, mismo diseño, mismas pantallas, pero
con el "cerebro" reescrito para que **todo corra y se guarde dentro del
propio celular**, sin servidor, sin base de datos externa, sin pagar nada de
hosting de backend. Cero conexión a internet requerida para usarla.

**¿Tiene inicio de sesión?** No. Lo quité como pediste — no tiene sentido en
una app de un solo dispositivo. Al abrirla entras directo al dashboard.

## Qué cambié técnicamente (resumen simple)

- Antes: el celular hablaba por internet con un servidor en Fly.io que tenía
  la base de datos (SQLite) y validaba usuarios con contraseña.
- Ahora: **no hay servidor**. Todo (mesas, sesiones, ventas, inventario,
  movimientos de caja, arqueos, configuración) se guarda directamente en el
  almacenamiento interno del navegador/app en el celular (`localStorage`).
  Abrís la app, haces cambios, y quedan guardados ahí mismo, al instante,
  sin necesidad de wifi ni datos móviles.
- Quité login, usuarios y "White Label" (eran para manejar varios clientes
  desde un servidor central — no aplican a una app de un solo dispositivo).
- Los tickets/recibos ahora se imprimen directamente desde el navegador del
  celular (usando la función nativa de imprimir/compartir), en vez de pedirle
  un PDF a un servidor.

## Función nueva que agregué: Arqueos de caja

Como pediste "que guarde arqueos de caja y demás", agregué una pestaña
**Arqueos** dentro de Caja:
- **Apertura**: registras el fondo inicial (efectivo) con el que arranca
  el turno.
- **Cierre**: cuentas el efectivo físico en caja, la app te muestra cuánto
  "debería" haber según el sistema (fondo + ventas + mesas + ingresos −
  egresos del día) y calcula la diferencia (sobrante o faltante).
- Todo queda en un historial con fecha, hora, montos y notas.

También agregué un botón de **"Movimiento"** en Caja para registrar
ingresos/egresos manuales (por ejemplo: retiro de efectivo, compra de
insumos) — antes esa función existía en el backend pero no tenía botón
en la pantalla.

## ⚠️ Muy importante: esto es la otra cara de "sin servidor"

Al no haber base de datos en la nube, **los datos viven solo en ese celular,
en ese navegador**. Eso significa:

- Si desinstalan la app, borran datos del navegador, o cambian de celular,
  **se pierde todo** si no hay un respaldo.
- Por eso agregué, en **Configuración → Respaldo de datos**, un botón para
  **descargar un respaldo (archivo .json)** y otro para **importarlo**. Recomiéndale
  a tu cliente descargar un respaldo todos los días al cerrar caja (toma 2
  segundos) y guardarlo en Google Drive, WhatsApp a sí mismo, correo, etc.
- Esto es lo esperado y normal para una app sin servidor — es la
  contrapartida de no pagar hosting/base de datos. Si en el futuro quieren
  respaldo automático en la nube, eso sí requeriría un servidor (y ahí sí
  se necesitaría conexión a internet, al menos para sincronizar).

## Cómo probarla ya mismo (antes de publicar)

Dentro de la carpeta del proyecto:
```
npm install
npm run dev
```
Abre la URL que te muestra (normalmente `http://localhost:3000`) en tu
navegador o celular en la misma wifi para probar todo el flujo: crear
mesas, abrir/cerrar sesiones, vender productos, registrar caja y arqueos.

## Cómo publicarla en Vercel (como querías)

1. Sube esta carpeta a tu repo de GitHub `final` (reemplazando el contenido,
   igual que en la guía anterior), o crea un repo nuevo — como esta versión
   ya no tiene backend, puedes borrar por completo la carpeta `backend/` si
   quieres, ya no se usa para nada.
2. Instala Vercel CLI si no lo tienes: `npm install -g vercel`
3. Desde la carpeta del proyecto: `vercel --prod`
4. Cuando pregunte el framework, Vercel detecta Vite automáticamente. No
   hay que configurar ninguna variable de entorno (no hay backend al que
   apuntar).
5. Vercel te da una URL tipo `https://tu-app.vercel.app`.

## Cómo instalarla en el celular del cliente (Android e iOS)

La app es un **PWA** (Progressive Web App): se puede "instalar" como un
ícono más en la pantalla de inicio, se abre en pantalla completa (sin
barra de navegador) y **sigue funcionando sin internet** después de
abrirla la primera vez.

**Android (Chrome):**
1. Abre la URL de Vercel en Chrome.
2. Toca el menú (⋮) → "Instalar app" o "Agregar a pantalla de inicio".
3. Listo — queda como un ícono normal, funciona offline.

**iPhone (Safari):**
1. Abre la URL de Vercel en Safari (tiene que ser Safari, no Chrome).
2. Toca el botón de compartir (el cuadrito con flecha hacia arriba).
3. "Agregar a pantalla de inicio".
4. Listo — mismo resultado, ícono propio y funciona offline.

Después de instalarla y abrirla una vez con internet (para que el celular
la descargue), pueden apagar el wifi/datos y la app sigue funcionando
100% normal, porque todo el código vive ya guardado en el celular y los
datos se guardan localmente.

## Qué NO hace (para que se lo puedas explicar al cliente)

- No sincroniza entre varios celulares o computadoras — es un solo
  dispositivo, tal como pediste.
- No tiene respaldo automático en la nube — el respaldo es manual
  (descargar el .json).
- Si el cliente quisiera en el futuro varios cajeros con dispositivos
  distintos viendo la misma caja en tiempo real, eso ya necesitaría volver
  a un servidor central (como la versión anterior) — son dos enfoques
  distintos y no se pueden mezclar a medias.
