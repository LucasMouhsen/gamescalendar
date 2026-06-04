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
