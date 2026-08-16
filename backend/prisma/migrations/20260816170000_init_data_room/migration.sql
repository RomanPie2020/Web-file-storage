-- PostgreSQL-specific initial schema for the Acme Data Room MVP.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "ShareResourceType" AS ENUM ('DATA_ROOM', 'FOLDER', 'FILE');
CREATE TYPE "ShareType" AS ENUM ('PUBLIC', 'USER');
CREATE TYPE "ShareRole" AS ENUM ('VIEWER', 'EDITOR');

CREATE TABLE "data_rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "data_rooms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "folders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "data_room_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "data_room_id" UUID NOT NULL,
    "folder_id" UUID,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "files_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "files_storage_path_key" UNIQUE ("storage_path")
);

CREATE TABLE "shares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_type" "ShareResourceType" NOT NULL,
    "resource_id" UUID NOT NULL,
    "share_type" "ShareType" NOT NULL,
    "shared_with_user_id" UUID,
    "public_token" TEXT,
    "role" "ShareRole" NOT NULL DEFAULT 'VIEWER',
    "revoked_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shares_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shares_public_token_key" UNIQUE ("public_token"),
    CONSTRAINT "shares_type_recipient_or_token_check" CHECK (
      ("share_type" = 'PUBLIC' AND "public_token" IS NOT NULL AND "shared_with_user_id" IS NULL)
      OR
      ("share_type" = 'USER' AND "shared_with_user_id" IS NOT NULL AND "public_token" IS NULL)
    )
);

ALTER TABLE "folders"
  ADD CONSTRAINT "folders_data_room_id_fkey"
  FOREIGN KEY ("data_room_id") REFERENCES "data_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "folders"
  ADD CONSTRAINT "folders_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "files"
  ADD CONSTRAINT "files_data_room_id_fkey"
  FOREIGN KEY ("data_room_id") REFERENCES "data_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "files"
  ADD CONSTRAINT "files_folder_id_fkey"
  FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "data_rooms_owner_id_idx" ON "data_rooms"("owner_id");
CREATE INDEX "folders_data_room_id_idx" ON "folders"("data_room_id");
CREATE INDEX "folders_parent_id_idx" ON "folders"("parent_id");
CREATE INDEX "folders_data_room_id_parent_id_normalized_name_idx"
  ON "folders"("data_room_id", "parent_id", "normalized_name");
CREATE INDEX "files_owner_id_idx" ON "files"("owner_id");
CREATE INDEX "files_data_room_id_idx" ON "files"("data_room_id");
CREATE INDEX "files_folder_id_created_at_id_idx" ON "files"("folder_id", "created_at", "id");
CREATE INDEX "files_data_room_id_folder_id_normalized_name_idx"
  ON "files"("data_room_id", "folder_id", "normalized_name");
CREATE INDEX "shares_resource_type_resource_id_revoked_at_idx"
  ON "shares"("resource_type", "resource_id", "revoked_at");
CREATE INDEX "shares_shared_with_user_id_revoked_at_idx"
  ON "shares"("shared_with_user_id", "revoked_at");

-- NULL parent/folder IDs represent the Data Room root. COALESCE makes those
-- root-level names unique as well as names within ordinary folders.
CREATE UNIQUE INDEX "folders_unique_sibling_normalized_name"
  ON "folders"("data_room_id", COALESCE("parent_id", '00000000-0000-0000-0000-000000000000'::uuid), "normalized_name");
CREATE UNIQUE INDEX "files_unique_sibling_normalized_name"
  ON "files"("data_room_id", COALESCE("folder_id", '00000000-0000-0000-0000-000000000000'::uuid), "normalized_name");

CREATE UNIQUE INDEX one_default_room_per_owner
  ON data_rooms (owner_id)
  WHERE is_default = true;
