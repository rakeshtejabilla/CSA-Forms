# Form Builder — Frontend

React + Vite frontend for Form Builder. Deployed as a Static Site on [Render](https://render.com).

## Tech Stack
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Offline:** Dexie (IndexedDB) for local-first form submissions

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Start the dev server
npm run dev
```

The app will start at `http://localhost:5173`.

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ Yes | Backend API URL (e.g., `https://your-backend.onrender.com/api`) |
| `VITE_WS_URL` | No | WebSocket URL for real-time features |

## Deployment on Render

1. Create a **Static Site** on [Render](https://render.com)
2. Connect this GitHub branch (`frontend`)
3. Set `VITE_API_URL` to your deployed backend URL
4. Render will use the settings in `render.yaml` automatically

**Build Command:**
```
npm install && npm run build
```

**Publish Directory:**
```
dist
```

> ℹ️ The SPA rewrite rule (`/* → /index.html`) is defined in `render.yaml` and handles React Router navigation correctly.
