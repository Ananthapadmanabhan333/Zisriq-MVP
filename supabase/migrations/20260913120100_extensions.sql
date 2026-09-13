-- Extensions used across the schema.
create extension if not exists pgcrypto with schema extensions;  -- gen_random_uuid, digest, crypt
create extension if not exists citext    with schema extensions;  -- case-insensitive email
