# Game Calendar Rebuilt

Rebuild funcional de `gamecalendar.app` con:

- frontend React + Vite
- backend Express
- modo `mock` listo para usar
- modo `live` usando IGDB via Twitch credentials

## Levantar local

```bash
npm install
npm run dev
```

Frontend: `http://127.0.0.1:5173`

Backend: `http://127.0.0.1:8787`

## Modo live

Copiá `backend/.env.example` a `backend/.env` y cargá:

```env
TWITCH_CLIENT_ID=...
TWITCH_CLIENT_SECRET=...
```

Con eso el backend deja de usar mocks y consulta IGDB.

## Deploy en GitHub Pages

Para GitHub Pages no hace falta backend en produccion.

El workflow de [deploy-pages.yml](E:\Lucas\gamecalendar-clone\.github\workflows\deploy-pages.yml):

- descarga datos reales desde la fuente publica
- genera snapshots JSON en `frontend/public/data`
- compila el frontend en modo estatico
- publica el resultado en GitHub Pages

Eso deja todo en un solo repo y una sola publicacion. La contra es que los datos no son en tiempo real: se actualizan cada vez que corre el workflow. Ya quedo programado tambien para correr semanalmente.

Si queres regenerar el snapshot localmente:

```bash
npm run snapshot:data
```
