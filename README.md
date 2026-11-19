# Crown Studio – Portal de contenido

App web instalable (PWA) y descargable para Android/iOS (Capacitor). Organiza placas de redes por carpeta → mes → publicación, con estados (borrador / en revisión / aprobada / publicada), carruseles, calendario, ideas y copy.

Dos modos (según `www/config.js`):
- **Local** (por defecto): todo en el dispositivo (IndexedDB), sin cuentas.
- **Nube (Supabase)**: cuentas, sincronización entre dispositivos y comentarios de clientes. **Solo la cuenta dueña edita** (subir/borrar placas, cambiar nombre, foto y carpetas); el resto ve y comenta.

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

## Roles
- **Dueña (tu cuenta):** edita todo.
- **Cliente:** ve las publicaciones (no los borradores), puede **Aprobar** o **Pedir cambios** (con un texto de qué modificar) y comentar cada publicación o placa. No puede editar, subir ni borrar. Las reglas están en `supabase/schema.sql`; si ya habías ejecutado una versión anterior, ejecutá solo `supabase/update-1-revision.sql`.

## Copias de seguridad
Ajustes (“Editar marca y carpetas”) → Exportar / Importar copia (JSON).

## Activar cuentas, sincronización y comentarios (Supabase, plan gratuito)
1. Creá un proyecto en https://supabase.com.
2. SQL Editor → pegá y ejecutá `supabase/schema.sql` completo.
3. Project Settings → API: copiá *Project URL* y *anon key* en `www/config.js`.
4. Abrí la app y creá **tu** cuenta. Luego, en el SQL Editor: `insert into app_owner select id from auth.users where email = 'TU_EMAIL';` — desde ese momento solo vos editás.
5. Clientes: se registran desde la app (o poné `allowSignup:false` y los invitás desde Authentication → Users → Invite, recomendado para que no entre cualquiera). Authentication → Providers → Email: podés desactivar "Confirm email" si querés que entren sin confirmar.
6. Authentication → URL Configuration: poné la URL donde publiques la app.

Seguridad: las reglas (RLS) del schema aplican en el servidor; aunque alguien manipule la app, solo la cuenta dueña puede escribir. Los archivos están en un bucket privado con enlaces firmados.

En modo nube hace falta conexión para ver el contenido (la app abre sin conexión pero no carga datos).
