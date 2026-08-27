# Form Builder Frontend App (React + Vite)

This folder contains the React client application powering the Form Builder Platform UI. It is built using Vite, TypeScript, TailwindCSS, Zustand, Lucide Icons, and Dexie.js for offline data caching.

---

## 💻 UI Pages & Component Architecture

The frontend is structured into modular page views:

- **Dashboard Page (`src/pages/Dashboard.tsx`)**: Displays general form templates counters, active forms, aggregate submissions, and templates quick access actions.
- **Form Builder Page (`src/pages/FormBuilder.tsx`)**: Visual drag-and-drop form canvas editor. Enables adding inputs, managing options, and setting step-by-step **Show/Hide Conditional Rules** with helper guides.
- **Farmers Registry (`src/pages/Farmers.tsx`)**: Displays grouped farmer files using the backend **Fuzzy Hierarchical Matching Algorithm** (Aadhaar or Name + Phone check, village disambiguation).
- **Submissions Page (`src/pages/Submissions.tsx`)**: Registry of completed surveys. Supports data previewing and exporting/downloading as Excel/XLS formats.
- **Admin Panel Page (`src/pages/Admin.tsx`)**: Allows organization administrators to create enumerators, change roles, assign village access boundaries, and review real-time audit logs.

---

## 📶 Offline Data Synchronization (Dexie IndexedDB)

To support enumerators working in remote villages with zero connectivity:
- Active forms are cached in local browser IndexedDB (`src/db/offlineDb.ts`) on load.
- If offline, survey submissions are automatically queued locally.
- A status monitor automatically detects internet reconnects and flushes/syncs queued surveys in the background.

---

## 📂 Project Directory Structure

```
frontend/
├── src/
│   ├── components/      # Common layout widgets (Sidebar, headers)
│   ├── context/         # Zustand store handlers (auth, form builder state)
│   ├── db/              # Dexie offline database configurations
│   ├── pages/           # Page controllers (FormBuilder, Farmers, Admin, etc.)
│   ├── App.tsx          # Main router entry and state setup
│   └── main.tsx         # Root DOM entrypoint
├── public/              # Static assets and icons
├── Dockerfile           # Multi-stage production Nginx container file
├── nginx.conf           # Production server & API proxy configs
├── tailwind.config.js   # Style custom design specifications
└── vite.config.ts       # Vite compiler configurations
```

---

## ⚙️ Environment Configurations (`.env`)

Create a `.env` file in this directory based on the following template:

| Parameter | Description | Default / Example |
|---|---|---|
| `VITE_API_URL` | Base API route endpoint of the backend gateway | `http://localhost:3000/api` |

---

## 🚀 Installation & Local Run

### Prerequisites
- Node.js (v18+) installed

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Development Server
```bash
# Start Vite local HMR server
npm run dev
```
The application will open on `http://localhost:5173`.

---

## 🐳 Production Build & Docker Container

In production, the application is built into static assets and served using a fast **Nginx** container:

```bash
docker build -t formbuilder-frontend .
```

- **Nginx configuration (`nginx.conf`)** handles client-side React Router fallback (`try_files`) and proxies API and WebSockets requests automatically to `http://backend:3000`.
- Exposes port `80`.
