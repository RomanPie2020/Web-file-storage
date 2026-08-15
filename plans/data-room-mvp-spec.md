# Acme Corp. Data Room Software MVP Specification

## 1. Objective

Build a deployed virtual Data Room MVP for secure document storage, organization, preview, and read-only sharing. The product should be intuitive and reliable for M&A due-diligence workflows.

Priority order:

1. User experience and functionality
2. Design and polish
3. Code quality and readability
4. Documentation

The implementation is time-boxed to approximately 6–8 hours. Optional search and file versioning are out of scope unless the core experience is complete.

## 2. Confirmed Technology Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, and Shadcn UI.
- Backend: independent NestJS service deployed on Render.
- Database: PostgreSQL supplied by Supabase, accessed through Prisma.
- Authentication: Supabase Auth with email/password and Google OAuth.
- File storage: private Supabase Storage bucket.
- Frontend deployment: Vercel.
- Backend deployment: Render.

The frontend must communicate with the NestJS API. The API is responsible for authorization, database access, storage operations, and signed URL generation.

## 3. Authentication and Identity

- Support email/password registration and login.
- Support Google OAuth through Supabase Auth.
- NestJS must validate Supabase JWTs by checking:
  - signature using cached JWKS keys;
  - issuer;
  - audience;
  - expiry;
  - the `sub` user identifier.
- The authenticated user ID must always come from the validated JWT. `owner_id`, `user_id`, and equivalent identity fields must never be trusted from request bodies or URL parameters.
- Permissioned shares require an authenticated Supabase session.
- Recipient email addresses must be normalized to lowercase. The recipient’s Supabase user ID is the authoritative identity for access checks.

## 4. Data Room Structure

- One default Data Room named `My Data Room` is provisioned automatically for every user during the first authenticated onboarding request.
- The database and NestJS API remain multi-room capable, but the MVP UI exposes only this primary Data Room and does not include room switching or room creation controls.
- A Data Room is a top-level workspace.
- Each Data Room contains nested folders and files.
- Folders use a self-referencing `parent_id` relationship.
- Folders and files also store denormalized `data_room_id` values for authorization, indexing, and large-room queries.
- Owners have full control over their Data Rooms and all descendants.
- The default root Data Room cannot be deleted. Users can delete and manage its internal folders and files.
- Users may rename the default Data Room through a lightweight header/settings action.
- Breadcrumbs, folder paths, and share URLs use stable UUIDs; display-name changes must never invalidate links.

### Default workspace provisioning

- Provisioning is server-side and must support both email/password and Google OAuth onboarding.
- Provisioning is idempotent and safe under concurrent first requests.
- PostgreSQL must enforce one default room per owner with a partial unique index:

```sql
CREATE UNIQUE INDEX one_default_room_per_owner
ON data_rooms (owner_id)
WHERE is_default = true;
```

- The index is applied through a custom Prisma migration because the partial predicate is PostgreSQL-specific and is not fully represented by the Prisma schema DSL.
- Provisioning may use `INSERT ... ON CONFLICT DO NOTHING` through a Prisma raw query, or catch a Prisma `P2002` error and fetch the existing default room.

## 5. Functional Requirements

### Data Rooms and folders

- Resolve and load the current user’s default Data Room.
- Create a folder at the Data Room root or inside another folder.
- Browse folder contents with nested navigation and breadcrumbs.
- Rename a folder.
- Delete a folder and all nested folders/files.
- Show a destructive confirmation that explains the number of folders/files and total size affected when practical.
- Do not expose Data Room deletion in the MVP UI or API for the protected default room; the API must enforce this independently of UI state and return `403 Forbidden`.

### Files

- Upload one or more PDF files.
- Support drag-and-drop and file picker selection.
- Display per-file upload progress, success, and failure states.
- Maximum file size: 10 MB per file.
- Accepted type: PDF (`application/pdf`).
- Validate file type and size in the browser and again in NestJS.
- Enforce the size limit in the multipart upload configuration.
- Verify the PDF signature server-side; client MIME metadata is not trusted.
- Store blobs under UUID-based storage keys, not user-supplied names.
- Preserve the original display name in PostgreSQL.
- Preview PDFs in the application and provide an explicit Download action.
- For unsupported preview cases, show file metadata and `Preview unavailable`.
- Rename a file.
- Move a file to another folder in the same Data Room.
- Delete a file.

### Naming conflicts

- File and folder names must be unique within their containing folder after normalization.
- Name normalization should be deterministic (including lowercase comparison and whitespace handling).
- Resolve collisions using a transaction and a suffix such as `document (1).pdf`.
- Enforce uniqueness with a database constraint, for example `(folder_id, normalized_name)`.
- The same rule must handle simultaneous multi-file uploads and concurrent rename requests.

## 6. Sharing and Authorization

Sharing is read-only in the MVP, but the schema must support future editor permissions.

### Public links

- Public links use opaque, high-entropy tokens, for example `/share/:token`.
- No Supabase session is required.
- Access is read-only.
- A Data Room share grants access to its complete subtree.
- A folder share grants access to that folder and its descendants.
- A file share grants access only to that file.
- The owner can revoke the link immediately.
- Revoked or invalid tokens return an appropriate not-found/unauthorized response without leaking resource details.

### Permissioned shares

- A share is granted to a specific Supabase user.
- The recipient must be authenticated with the granted account.
- Access is read-only while the role is `VIEWER`.
- The owner can revoke access immediately.
- Revocation must affect all subsequent API requests.

### Share fields

The share model should include at least:

- `id`
- `resource_type`: `DATA_ROOM | FOLDER | FILE`
- `resource_id`
- `share_type`: `PUBLIC | USER`
- `shared_with_user_id` (nullable for public shares)
- `public_token` (nullable for user shares, unique when present)
- `role`: `VIEWER | EDITOR`
- `revoked_at` (nullable)
- `expires_at` (optional)
- `created_at` and `updated_at`

The API must validate that public shares have a token and user shares have a recipient. Authorization must check the requested resource and its ancestors within the same Data Room.

## 7. Storage and Deletion

- Use a private Supabase Storage bucket.
- Never expose permanent public blob URLs.
- Generate short-lived signed URLs only after the API has authorized the request.
- Storage paths use UUIDs and retain no trust-sensitive user input.

### Folder/file deletion flow

1. Authorize the owner’s delete request.
2. Resolve the complete descendant file set and collect storage keys.
3. Execute an idempotent bulk delete in Supabase Storage.
4. If storage deletion fails, stop and leave PostgreSQL records unchanged.
5. If storage succeeds, execute the PostgreSQL `DELETE` transaction with cascading database relations.
6. If the database transaction fails after storage deletion, retain/log the failed operation for retry or reconciliation.

This is not a distributed atomic transaction: the sequence protects metadata when storage deletion fails, but a later database failure can leave metadata pointing to a deleted blob. The implementation must make retries idempotent and document this limitation.

If another user is viewing a deleted resource, subsequent requests should receive `404` or `403`, and the frontend should show a toast and redirect to the nearest accessible parent.

## 8. Suggested Data Model

Core entities:

- `users` / Supabase Auth users
- `data_rooms`
  - `id`, `owner_id`, `name`, `is_default`, timestamps
- `folders`
  - `id`, `data_room_id`, `parent_id`, `name`, `normalized_name`, timestamps
- `files`
  - `id`, `data_room_id`, `folder_id`, `owner_id`, `name`, `normalized_name`, `size_bytes`, `mime_type`, `storage_path`, timestamps
- `shares`
  - fields described in Section 6

Recommended indexes:

- `data_rooms(owner_id)`
- partial unique index on `data_rooms(owner_id) WHERE is_default = true`
- `folders(data_room_id, parent_id, normalized_name)`
- `files(data_room_id, folder_id, normalized_name)`
- `files(folder_id, created_at, id)`
- `shares(resource_type, resource_id, revoked_at)`
- `shares(shared_with_user_id, revoked_at)`
- unique `shares(public_token)` when present

## 9. API and UX Expectations

The API should provide resource-oriented endpoints for:

- authentication/session validation;
- default Data Room resolution and rename, plus folder listing/creation/rename/deletion;
- file upload, listing, preview URL, rename, move, and deletion;
- public share creation/revocation/resolution;
- permissioned share creation/listing/revocation.

The UI must include loading, empty, success, validation-error, authorization-error, upload-error, and deletion-error states. Destructive actions require confirmation. The interface should not expose controls for features that are not implemented.

## 10. Scaling Notes for the README

### Folder totals

For the MVP, use PostgreSQL recursive CTEs to calculate descendant file size and item counts. At larger scale, introduce cached aggregates maintained by mutation events/workers, or use a materialized-path/closure-table strategy.

### 100,000 files in one Data Room

- Use cursor-based pagination instead of large `OFFSET` queries.
- Index by Data Room, folder, normalized name, and stable sort keys such as `(created_at, id)`.
- Return only the fields required by the listing UI.
- Add list virtualization only if the client must render very large result sets.

### Future roles

The existing `role` field supports `VIEWER` and `EDITOR` without remodeling the share relationship. NestJS authorization guards can later distinguish read, write, move, and delete permissions.

## 11. Deployment and Security Checklist

- Configure Vercel and Render environment variables without committing secrets.
- Keep the custom PostgreSQL partial-index migration under version control and document that it is PostgreSQL-specific.
- Restrict NestJS CORS to the deployed frontend origin(s).
- Keep Supabase service-role credentials server-side only.
- Use parameterized Prisma queries and validate all DTOs.
- Rate-limit public share resolution and upload endpoints where practical.
- Do not reveal whether unrelated private resources exist.
- Include local setup, migrations, seed/demo instructions, deployment URLs, ERD, scaling notes, and an AI-usage note in the README.
- README must explicitly state: “One default Data Room is provisioned automatically per user; multi-room support is schema-ready but omitted from the MVP UI to optimize time-to-delivery.”

## 12. Out of Scope Unless Time Remains

- Cross-Data-Room search and filtering.
- File version history.
- Editor permissions in the UI.
- Audit logs, notifications, commenting, and full administrative user management.
