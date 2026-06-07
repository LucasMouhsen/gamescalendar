# Frontend

Aplicacion React + Vite que renderiza el calendario usando snapshots estaticos ubicados en `public/data`.

El frontend no consulta ningun backend propio. Toda la informacion se carga desde:

- `data/config.json`
- `data/platforms.json`
- `data/games-YYYY.json`

Comandos utiles:

```bash
npm run dev
npm run build
```
