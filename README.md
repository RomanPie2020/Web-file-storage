# Acme Data Room MVP

## Local development

Prerequisites: Node.js 20+ and npm.

Install dependencies and run the applications in separate terminals:

```powershell
cd backend; npm install; npm run start:dev
cd frontend; npm install; npm run dev
```

The backend health endpoint is available at `http://localhost:3001/health`; the frontend runs at `http://localhost:3000` and reports backend health on its home page.

To check PostgreSQL and Supabase Storage connectivity, open `http://localhost:3001/health/dependencies`. The response must report both `database.ok` and `storage.ok` as `true`.

## Phase 1 configuration

Copy `backend/.env.example` to `backend/.env` after creating a Supabase project. Fill in the Supabase URL, database URL, anon key, service-role key, JWT issuer, audience, and JWKS URL. Keep `.env` files out of version control; service-role credentials must remain server-only.
