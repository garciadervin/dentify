-- Move pgvector extension from public to a dedicated schema for security
CREATE SCHEMA IF NOT EXISTS extensions;

ALTER EXTENSION vector SET SCHEMA extensions;

-- Ensure the search_path includes extensions so the vector type is accessible
ALTER ROLE postgres SET search_path TO public, extensions;
ALTER ROLE anon SET search_path TO public, extensions;
ALTER ROLE authenticated SET search_path TO public, extensions;
ALTER ROLE service_role SET search_path TO public, extensions;
