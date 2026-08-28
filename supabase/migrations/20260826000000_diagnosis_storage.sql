-- Storage bucket + RLS for diagnosis captures.
-- The bucket is public so captured images are readable by URL; uploads are
-- restricted to the authenticated owner's folder.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('diagnosis-images', 'diagnosis-images', true, 10485760, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own diagnosis images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'diagnosis-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own diagnosis images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'diagnosis-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
