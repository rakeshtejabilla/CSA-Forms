# Form Builder Backend Server (NestJS Monolith)

This folder contains the backend monolith application powering the Form Builder Platform. It is built using NestJS, TypeScript, Prisma ORM, PostgreSQL, and Redis.

---

## 🏛 Architecture & Core Modules

The backend is structured as a modular monolith:

- **Auth Module (`src/auth`)**: Handles token-based JWT authentication, password hashing, refreshing, and user role validation (`SUPER_ADMIN`, `ORG_ADMIN`, `ENUMERATOR`).
- **Forms Module (`src/forms`)**: Manages form template templates, JSON schema definitions, form versions, and sharing of forms to enumerators.
- **Submissions Module (`src/submissions`)**: Handles incoming survey submissions, validation, offline queue syncing, and mapping to registered farmers.
- **Farmers Module (`src/farmers`)**: Manages the farmers database and implements the **Fuzzy Hierarchical Disambiguation Rule** to group duplicate records.
- **Audit Module (`src/audit`)**: Captures actions (login/logout, user creation, role updates, form creations, syncs) and provides human-friendly audit logs.
- **Notifications Module (`src/notifications`)**: Powered by Socket.io WebSockets to push real-time audit updates and notifications to logged-in admins.

---

## 📂 Project Directory Structure

```
backend/
├── src/
│   ├── auth/            # Auth controller, user CRUD, JWT token guards
│   ├── forms/           # Form templates builder APIs & XLS imports
│   ├── submissions/     # Survey submissions, queue sync, validation
│   ├── farmers/         # Farmers registry database handler
│   ├── audit/           # Action audit logging module
│   ├── notifications/   # Socket.io WebSockets gateway
│   └── common/          # Global interceptors, decorators, filters
├── prisma/
│   ├── schema.prisma    # Database schemas and models
│   └── migrations/      # DB SQL migration files
├── database/
│   └── seed.js          # DB seed script for testing data
├── Dockerfile           # Multi-stage production container image
├── nginx.conf           # Reverse proxy configuration template
└── tsconfig.json        # TypeScript compiler configurations
```

---

## ⚙️ Environment Configurations (`.env`)

Create a `.env` file in this directory based on the following template:

| Parameter | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection URL string | `postgresql://postgres:password@localhost:5433/formbuilder?schema=public` |
| `REDIS_HOST` | Host address of Redis server | `localhost` |
| `REDIS_PORT` | Port of Redis server | `6379` |
| `PORT` | Listening port of NestJS server | `3000` |
| `JWT_SECRET` | Secret key used to sign Access Tokens | `super-secret-key-change-in-production` |
| `JWT_EXPIRY` | Duration of access token validity | `15m` |
| `JWT_REFRESH_SECRET` | Secret key used to sign Refresh Tokens | `super-secret-refresh-key-change-in-production` |
| `JWT_REFRESH_EXPIRY` | Duration of refresh token validity | `7d` |
| `FILE_UPLOAD_DIR` | Directory path where uploads are saved | `./uploads` |

---

## 🚀 Installation & Local Run

### Prerequisites
- Node.js (v18+) installed
- Running PostgreSQL database (v15+)
- Running Redis instance

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set up Database & ORM
1. Generate the Prisma Client:
   ```bash
   npx prisma generate
   ```
2. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```
3. Seed default users & templates:
   ```bash
   node database/seed.js
   ```

### Step 3: Run Server
```bash
# Run in live watch mode for development
npm run start:dev

# Run in production mode
npm run build
npm run start:prod
```
The NestJS server will start listening on `http://localhost:3000`.

---

## 🐳 Docker Deployment

To build and package the backend into a container:
```bash
docker build -t formbuilder-backend .
```
Exposes container port `3000`.
