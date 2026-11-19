# Crown Studio – Portal de contenido

App web instalable (PWA) y descargable para Android/iOS (Capacitor). Organiza placas de redes por carpeta → mes → publicación, con estados (borrador / en revisión / aprobada / publicada), carruseles, calendario, ideas y copy.

Todo se guarda **en el dispositivo** (IndexedDB), funciona sin conexión y no necesita servidor.

## Probar en web
```
npm start        # http://localhost:8080
```
Publicá la carpeta `www/` en cualquier hosting HTTPS (Netlify, Vercel, GitHub Pages, Cloudflare Pages). Desde Chrome/Edge/Safari: "Instalar app" / "Añadir a pantalla de inicio".

## Apps nativas (Android / iOS)
```
npm install
npm run cap:add:android   # requiere Android Studio
npm run cap:add:ios       # requiere Mac + Xcode
npm run android           # abre Android Studio -> Run / Build APK/AAB
npm run ios               # abre Xcode -> Run / Archive
```
Cambiá `appId` y `appName` en `capacitor.config.json` antes de publicar en las tiendas. Los íconos nativos se generan con `@capacitor/assets` a partir de `www/icons/icon-512.png`.

## Copias de seguridad
Ajustes (“Editar marca y carpetas”) → Exportar / Importar copia (JSON).

## Límite actual
Los datos son por dispositivo. Para compartir con clientes y que comenten, `www/local.js` es la única capa de datos: reemplazala por Firebase/Supabase (misma interfaz doc/collection/onSnapshot + upload).
