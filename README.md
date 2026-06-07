# Game Calendar Rebuilt

Calendario de lanzamientos de videojuegos con frontend React + Vite y arquitectura 100% estatica.

## Como funciona

- Los datos se descargan desde la API publica de `gamerelease.app`.
- El repo genera snapshots JSON en `frontend/public/data`.
- El frontend consume siempre esos archivos estaticos.
- No hay backend runtime ni credenciales privadas para produccion.

Archivos generados:

- `frontend/public/data/config.json`
- `frontend/public/data/platforms.json`
- `frontend/public/data/games-YYYY.json`

El rango soportado por defecto es desde `anio actual - 1` hasta `anio actual + 2`.
Se puede ajustar con `STATIC_START_YEAR` y `STATIC_END_YEAR`.

## Desarrollo local

```bash
npm install
npm run snapshot:data
npm run dev
```

Frontend: `http://127.0.0.1:5173`

## Build local

```bash
npm run build
```

Ese comando regenera el snapshot antes de compilar.

## Actualizacion de datos

Para regenerar el snapshot manualmente:

```bash
npm run snapshot:data
```

El script falla si la API devuelve un snapshot vacio o invalido.

## Deploy en GitHub Pages

El workflow de [deploy-pages.yml](./.github/workflows/deploy-pages.yml):

- instala dependencias
- genera un snapshot fresco
- compila el frontend
- publica el resultado en GitHub Pages

La publicacion sigue siendo estatica. Los datos se actualizan cuando corre el workflow por `push`, manualmente, o por el cron semanal.
