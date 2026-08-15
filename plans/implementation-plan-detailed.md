# Acme Data Room MVP — Detailed Implementation Plan

This plan translates the approved specification into implementation steps. Work through the phases in order; do not start polish or optional features until the relevant checkpoint passes.

## Phase 0 — Repository and development setup

### Tasks

- Inspect the repository and preserve any existing project structure.
- Create or confirm separate `frontend` and `backend` applications.
- Configure TypeScript, linting, formatting, environment files, and scripts.
- Add a root README section explaining local prerequisites.
- Add a basic NestJS `GET /health` endpoint.
- Add a minimal Next.js page that calls the health endpoint.

### Checkpoint

Both applications start locally and the frontend successfully reports backend health.

## Phase 1 — Supabase and deployment foundations

### Tasks

- Create/configure the Supabase project.
- Enable email/password and Google OAuth providers.
- Create a private Storage bucket for PDF files.
- Collect database URL, Supabase URL, anon key, service-role key, JWT issuer, audience, and JWKS URL.
- Add environment validation in the NestJS application.
- Configure local CORS for the frontend origin.
- Create initial Vercel and Render projects without committing secrets.

### Checkpoint

The backend can connect to Supabase PostgreSQL and Storage in a development environment.

## Phase 2 — Authentication

### Backend tasks

- Implement a singleton Supabase JWKS service.
- Fetch and cache keys by `kid` with a refresh interval.
- Refresh once when an unknown `kid` is encountered.
- Reject requests when signature, issuer, audience, expiry, or `sub` validation fails.
- Implement a global NestJS Auth Guard and a public-route decorator for anonymous share endpoints.
- Expose a protected `GET /auth/me` endpoint.

### Frontend tasks

- Build signup, login, Google OAuth, logout, and session restoration.
- Store/manage the Supabase session using the official client.
- Attach access tokens to API requests.
- Route unauthenticated users to the login page.

### Checkpoint

A signed-in user can call `/auth/me`; invalid, expired, and missing tokens are rejected.

## Phase 3 — Prisma schema and migrations

### Tasks

- Define models for `data_rooms`, `folders`, `files`, and `shares`.
- Use UUID primary keys and timestamps.
- Add `data_room_id` to folders and files.
- Add `parent_id` for self-referencing folders.
- Add `normalized_name` fields.
- Add `role`, `share_type`, `resource_type`, recipient ID, public token, revocation, and optional expiry fields to shares.
- Add foreign keys and cascading database relations where appropriate.
- Add normal indexes for owner, Data Room, parent folder, listing, and share lookup.
- Create a custom migration containing:

```sql
CREATE UNIQUE INDEX one_default_room_per_owner
ON data_rooms (owner_id)
WHERE is_default = true;
```

- Keep this PostgreSQL-specific migration under version control.

### Checkpoint

Prisma migrations apply cleanly to a fresh database and the schema supports the ERD requirements.

## Phase 4 — Default Data Room provisioning

### Tasks

- Implement a server-side `ensureDefaultDataRoom(userId)` service.
- Provision `My Data Room` during the first authenticated request for both auth methods.
- Use `INSERT ... ON CONFLICT DO NOTHING` through a raw query, or catch `P2002` and fetch the existing room.
- Never accept the owner ID from client input.
- Add API-level protection preventing deletion of `is_default = true` rooms; return `403 Forbidden`.
- Allow default-room rename while retaining the stable UUID and default marker.

### Checkpoint

Repeated and concurrent calls result in exactly one default room per user.

## Phase 5 — Core Data Room API and navigation

### Backend tasks

- Add endpoints for default room resolution and rename.
- Add folder create, list, rename, and delete endpoints.
- Use `parent_id` and recursive CTEs for subtree operations and ancestor permission checks.
- Scope every query by validated owner/user access and `data_room_id`.
- Normalize names consistently before uniqueness checks.
- Return stable UUIDs for rooms and folders.

### Frontend tasks

- Build the authenticated application shell.
- Display the default Data Room as the root node.
- Add folder listing, create-folder dialog, rename action, and breadcrumbs.
- Use stable UUID route segments.
- Add loading, empty, error, unauthorized, and not-found states.

### Checkpoint

A user can create and navigate nested folders, rename them, and use breadcrumbs without full-page confusion.

## Phase 6 — PDF upload and file management

### Backend tasks

- Configure multipart limits: 10 MB maximum per file.
- Validate PDF MIME type and `%PDF-` magic bytes before Storage writes.
- Use UUID-based Storage paths.
- Upload to a private Supabase bucket with `upsert: false`.
- Persist file metadata only after successful Storage upload.
- Add file list, rename, move, and delete endpoints.
- Enforce sibling name uniqueness with a database constraint and transactional suffix generation.

### Frontend tasks

- Add file picker and drag-and-drop upload.
- Send each file as a separate request.
- Limit concurrent uploads to approximately three.
- Show per-file progress, success, validation errors, and retry actions.
- Display files alongside folders.

### Checkpoint

Multiple PDFs can be uploaded, duplicate names are resolved safely, and files can be renamed or moved.

## Phase 7 — Preview and signed downloads

### Tasks

- Add an authorized preview endpoint.
- Verify access before generating a short-lived Supabase signed URL.
- Add an in-app PDF viewer and explicit Download action.
- Do not expose permanent public Storage URLs.
- Show file metadata and `Preview unavailable` for unsupported preview cases.

### Checkpoint

Owners and authorized viewers can preview/download files; unauthorized users cannot obtain signed URLs.

## Phase 8 — Sharing and authorization

### Backend tasks

- Centralize an authorization service that evaluates owner access, direct shares, and ancestor Data Room/folder shares.
- Implement public share creation, resolution, and revocation.
- Generate high-entropy public tokens and store only what is required for lookup.
- Implement permissioned shares by normalized recipient email and Supabase user ID.
- Require authentication for user shares.
- Scope shares to Data Room, folder, or file resources.
- Enforce `VIEWER` now while retaining `EDITOR` in the schema.
- Ensure revoked shares fail on the next API request.

### Frontend tasks

- Add share dialog for Data Room, folder, and file resources.
- Support public-link copy/revoke.
- Support permissioned recipient entry and revoke.
- Add a public share route that does not require an active session.

### Checkpoint

Anonymous public links and authenticated permissioned shares work with correct subtree scope and immediate revocation.

## Phase 9 — Deletion, consistency, and edge cases

### Tasks

- Add delete confirmation showing affected folders/files and size where available.
- Resolve all descendant file storage keys before deletion.
- Attempt idempotent bulk Storage deletion.
- If Storage deletion fails, leave database records unchanged and retry the operation.
- After successful Storage deletion, perform the PostgreSQL cascade delete.
- Log/retry a database failure occurring after Storage deletion.
- Treat missing Storage objects during retry as already deleted.
- Return `404`/`403` for resources deleted while another user is viewing them.
- Redirect the frontend to the nearest accessible parent and show a toast.

### Checkpoint

Deletion is explicit, protected for the root room, and does not leave the UI stuck on inaccessible content.

## Phase 10 — UX quality and security review

### Tasks

- Verify every loading, empty, validation, upload, authorization, preview, sharing, revocation, and deletion state.
- Check keyboard navigation, focus management, responsive layout, and readable error messages.
- Remove controls for search, versioning, editor actions, and other unimplemented features.
- Verify CORS is restricted to known frontend origins.
- Confirm service-role credentials are server-only.
- Confirm every data query is scoped by ownership or share authorization.
- Add rate limiting to public share resolution and upload endpoints where practical.

### Checkpoint

The primary workflow is understandable without developer assistance and no private resource is exposed through unauthorized routes.

## Phase 11 — Tests and hosted deployment

### Tests

- Auth Guard: valid, invalid, expired, wrong-audience, and unknown-key tokens.
- Provisioning: repeat and concurrent first-login requests.
- Authorization: owner, public share, permissioned share, ancestor share, revoked share, and unrelated user.
- Naming: simultaneous uploads and rename collisions.
- Upload: size, MIME, magic bytes, and Storage failure.
- Deletion: nested subtree, protected root, partial Storage failure, and stale viewer.

### Deployment

- Apply Prisma migrations to Supabase PostgreSQL.
- Deploy NestJS to Render.
- Deploy Next.js to Vercel.
- Configure OAuth callback URLs and production CORS.
- Configure production Storage bucket and environment variables.
- Test with a fresh owner account and a separate shared account.

### Checkpoint

The hosted frontend and backend work end to end for authentication, folders, uploads, previews, sharing, revocation, and deletion.

## Phase 12 — README and handoff

- Document setup, environment variables, migration commands, and deployment.
- Add the ERD and scaling answers for recursive totals, 100,000-file rooms, and future roles.
- State: “One default Data Room is provisioned automatically per user; multi-room support is schema-ready but omitted from the MVP UI to optimize time-to-delivery.”
- Explain the PostgreSQL partial-index migration.
- Explain the non-atomic Storage/Database deletion boundary and retry/reconciliation behavior.
- Add hosted frontend/backend URLs and the AI-usage note.

## Deferred work

Only after all checkpoints pass:

- Search and filtering across a Data Room.
- File versioning on conflicts.
- Editor permissions in the UI.
- Audit logs, notifications, and advanced administration.
