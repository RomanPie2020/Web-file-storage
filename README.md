# Acme Data Room MVP

See [CODING_STANDARDS.md](CODING_STANDARDS.md) for the project-wide rules for readable, secure, and maintainable code.

## Local development

Prerequisites: Node.js 20+ and npm.

Install dependencies and run the applications in separate terminals:

```powershell
cd backend; npm install; npm run start:dev
cd frontend; npm install; npm run dev
```

Copy `.env.example` to the repository root as `.env` and keep all local configuration there. Both applications read the shared root environment file. The backend defaults to port `3001`; the frontend defaults to port `3000`.

The backend health endpoint is available at `http://localhost:3001/health`; the frontend runs at `http://localhost:3000` and reports backend health on its home page.

To check PostgreSQL and Supabase Storage connectivity, open `http://localhost:3001/health/dependencies`. The response must report both `database.ok` and `storage.ok` as `true`.

## Phase 1 configuration

Fill in the root `.env` with the Supabase URL, database URL, anon key, service-role key, JWT issuer, audience, and JWKS URL. Keep `.env` files out of version control; service-role credentials must remain server-only.
