# Acme Data Room MVP — Implementation Plan

This plan is intentionally incremental. Each phase should leave the project in a runnable, testable state.

## Phase 1 — Project foundation

- Create the Next.js frontend and NestJS backend projects.
- Add TypeScript, Tailwind, Shadcn UI, Prisma, validation, and shared environment configuration.
- Create local development scripts and a basic health-check endpoint.
- Configure the frontend to call the NestJS API.

**Checkpoint:** frontend and backend run locally; the frontend can display the backend health status.

## Phase 2 — Supabase infrastructure and authentication

- Create the Supabase project, PostgreSQL connection, Auth providers, and private Storage bucket.
- Configure email/password and Google OAuth.
- Implement frontend login, signup, logout, and session handling.
- Implement the NestJS JWT Guard using Supabase issuer, audience, signature/JWKS, expiry, and `sub` validation.

**Checkpoint:** a signed-in user can access a protected API endpoint; an unauthenticated request is rejected.

## Phase 3 — Database schema and default workspace provisioning

- Define Prisma models for Data Rooms, folders, files, and shares.
- Add `data_room_id` to folders and files.
- Add normalized names and uniqueness constraints for sibling folders/files.
- Create the custom Prisma migration for the partial default-room index.
- Implement idempotent server-side provisioning of `My Data Room`.

**Checkpoint:** every authenticated user receives exactly one default Data Room, including concurrent first-login requests.

## Phase 4 — Core Data Room navigation

- Build the main application shell and protected Data Room route.
- Load the default room and its immediate contents.
- Implement folder creation, nested navigation, breadcrumbs, and folder rename.
- Add loading, empty, error, and unauthorized states.
- Add room rename while keeping the root room non-deletable.

**Checkpoint:** a user can navigate a nested folder tree and return through breadcrumbs.

## Phase 5 — File upload and listing

- Implement multi-file PDF upload with drag-and-drop and file picker support.
- Add frontend size/type checks and per-file progress.
- Add NestJS multipart limits, DTO/file-pipe validation, and PDF signature validation.
- Upload to private Supabase Storage using UUID-based paths.
- Persist file metadata in PostgreSQL.
- Implement file listing, rename, conflict suffixing, and move.

**Checkpoint:** a user can upload, see, rename, and move PDFs without duplicate sibling names.

## Phase 6 — Preview and download

- Add a PDF preview route/modal.
- Generate short-lived signed URLs only after authorization.
- Add an explicit download action.
- Display metadata and `Preview unavailable` for unsupported preview cases.

**Checkpoint:** an authorized user can preview and download a PDF; unauthorized users cannot obtain its URL.

## Phase 7 — Sharing and access control

- Implement public share creation, resolution, and revocation with high-entropy tokens.
- Implement permissioned user shares and recipient lookup by normalized email/user ID.
- Support Data Room, folder, and file share scopes.
- Add `VIEWER`/`EDITOR` role fields while enabling only `VIEWER` behavior.
- Centralize ancestor-aware authorization in NestJS.

**Checkpoint:** public links work anonymously; permissioned links require the correct signed-in user; revocation takes effect on the next request.

## Phase 8 — Deletion and edge cases

- Implement folder subtree and file deletion confirmation.
- Collect storage keys, delete blobs idempotently, then delete PostgreSQL records transactionally.
- Protect the default Data Room from deletion at the API and UI layers.
- Handle concurrent viewing of deleted content with `404`/`403`, toast feedback, and parent redirect.
- Add retry/reconciliation logging for a database failure after successful blob deletion.

**Checkpoint:** destructive flows clearly explain impact and do not silently leave the UI in an invalid location.

## Phase 9 — UX polish and validation

- Review every required loading, empty, success, validation, authorization, upload, and deletion state.
- Remove controls for unimplemented features.
- Improve responsive layout, keyboard/focus behavior, and destructive-action messaging.
- Add a small seed/demo path if useful for evaluation.

**Checkpoint:** the complete core flow is usable without developer knowledge or manual database edits.

## Phase 10 — Testing and deployment

- Add backend unit/integration tests for authentication, ownership, ancestor sharing, revocation, naming conflicts, and protected-room deletion.
- Add frontend checks for upload states, breadcrumbs, preview, and share flows.
- Run Prisma migrations against the hosted Supabase database.
- Deploy NestJS to Render and Next.js to Vercel.
- Configure CORS, environment variables, callback URLs, and production storage settings.
- Verify the deployed end-to-end flow with a fresh account and a second shared account.

**Checkpoint:** both hosted URLs work end to end, including authentication, upload, preview, sharing, revocation, and deletion.

## Phase 11 — README and handoff

- Document setup, environment variables, migrations, and deployment.
- Include the ERD and the three required scaling answers.
- Document the default-room simplification and PostgreSQL partial-index migration.
- Document the Storage/Database deletion consistency limitation and reconciliation approach.
- Add the AI-usage note and hosted frontend/backend URLs.

## Optional work only after the checkpoints pass

- Search and filtering by file name across a Data Room.
- File versioning on name conflicts.
- Editor permissions in the UI.
