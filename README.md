# Form Builder — Backend

NestJS + Prisma backend for Form Builder. Deployed on [Render](https://render.com) with [Neon](https://neon.tech) PostgreSQL.

## Tech Stack
- **Framework:** NestJS (Node.js)
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** JWT (access + refresh tokens)
- **Queue:** BullMQ + Redis *(optional — falls back to in-memory if Redis not configured)*
- **Cache:** Redis *(optional — falls back to in-memory)*

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Generate Prisma client
npx prisma generate

# 4. Run database migrations
npx prisma migrate deploy

# 5. Start the dev server
npm run start:dev
```

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string (Neon) |
| `JWT_SECRET` | ✅ Yes | Secret for access tokens |
| `JWT_REFRESH_SECRET` | ✅ Yes | Secret for refresh tokens |
| `PORT` | No | Server port (default: `10000`) |
| `CORS_ORIGIN` | No | Comma-separated allowed frontend origins |
| `REDIS_HOST` | No | Redis host (omit to use in-memory fallback) |
| `REDIS_URL` | No | Full Redis URL (alternative to REDIS_HOST) |

## Deployment on Render

1. Create a **Web Service** on [Render](https://render.com)
2. Connect this GitHub branch (`backend`)
3. Set the environment variables from the table above
4. Render will use the settings in `render.yaml` automatically

**Build Command:**
```
npm install && npx prisma generate && npm run build
```

**Start Command:**
```
npx prisma migrate deploy && npm start
```
