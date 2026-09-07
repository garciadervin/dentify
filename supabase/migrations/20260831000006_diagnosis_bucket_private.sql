-- Make the diagnosis-images bucket private.
-- Diagnosis images hold patient data; they must not be served via public URLs.
-- Reads happen through owner-scoped storage policies using signed URLs only.

UPDATE storage.buckets
SET public = false
WHERE id = 'diagnosis-images';
