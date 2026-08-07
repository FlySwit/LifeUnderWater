# Conectar el formulario "Avisarme" a Google Sheets

Con esto, cada correo que alguien escriba en la web cae automáticamente
como una fila nueva en una hoja de cálculo de Google, sin backend ni
costo.

## 1. Crea la hoja

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una hoja nueva.
2. (Opcional pero recomendado) En la fila 1 escribe los encabezados:
   `A1 = Fecha`, `B1 = Correo`.
3. Ponle un nombre a la hoja, por ejemplo **LifeUnderWater — Suscriptores**.

## 2. Crea el Apps Script

1. En la misma hoja, ve al menú **Extensiones → Apps Script**.
2. Borra el código de ejemplo que aparece (`function myFunction() {...}`).
3. Copia y pega todo el contenido del archivo `apps-script.gs` (incluido
   en esta carpeta).
4. Guarda el proyecto (ícono de disquete o `Ctrl/Cmd + S`). Puedes
   ponerle un nombre como "LifeUnderWater Webhook".

## 3. Publícalo como aplicación web

1. Arriba a la derecha, clic en **Implementar → Nueva implementación**.
2. En "Selecciona el tipo", elige el ícono de engranaje y luego
   **Aplicación web**.
3. Configura:
   - **Ejecutar como:** Yo (tu cuenta de Google)
   - **Quién tiene acceso:** Cualquier usuario
4. Clic en **Implementar**.
5. Google te pedirá autorizar permisos porque el script va a escribir
   en tu hoja. Es tu propio script, así que es seguro continuar:
   - Si aparece una pantalla de advertencia ("Google no verificó esta
     app"), haz clic en **Avanzado** → **Ir a [nombre del proyecto]
     (no seguro)**. Esto es normal para scripts personales no
     publicados en la tienda.
   - Acepta los permisos de acceso a tus hojas de cálculo.
6. Copia la **URL de la aplicación web** que te muestra al final.
   Termina en `/exec`, algo como:
   `https://script.google.com/macros/s/AKfycb.../exec`

## 4. Conéctala con la página

1. Abre `js/site.js`.
2. Busca la línea:
   ```js
   var SHEET_WEBHOOK_URL = '';
   ```
3. Pega tu URL entre las comillas:
   ```js
   var SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```
4. Guarda el archivo y sube la página de nuevo (o recarga si ya está
   publicada). ¡Listo! Cada envío del formulario ahora aparecerá como
   fila nueva en tu hoja.

## Notas importantes

- **No necesitas volver a implementar** el script cada vez que edites
  la hoja — solo si cambias el código del Apps Script (`apps-script.gs`),
  en cuyo caso debes hacer **Implementar → Gestionar implementaciones →
  editar (lápiz) → Nueva versión → Implementar**.
- El formulario usa `mode: 'no-cors'` al enviar, porque Apps Script no
  añade encabezados CORS. Esto significa que la página no puede leer
  la respuesta exacta del script, pero el envío sí llega y se guarda
  correctamente. Puedes confirmarlo revisando la hoja después de
  probar el formulario tú mismo.
- Si quieres exportar los correos luego (por ejemplo a Mailchimp),
  puedes hacerlo directamente desde Google Sheets con
  **Archivo → Descargar → CSV**.
- Mientras `SHEET_WEBHOOK_URL` esté vacío, el formulario sigue
  funcionando en modo demostración (muestra el mensaje de éxito pero
  no guarda nada), así que la web nunca se rompe si olvidas este paso.
