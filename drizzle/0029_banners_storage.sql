-- Bucket público do Supabase Storage para as imagens de capa dos eventos.
-- Só roda onde existe o schema "storage" (Supabase local/cloud); no PGlite é no-op.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('banners', 'banners', true, 5242880,
            ARRAY['image/jpeg', 'image/png', 'image/webp'])
    ON CONFLICT (id) DO NOTHING;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname = 'banners_upload_autenticado'
    ) THEN
      CREATE POLICY banners_upload_autenticado ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'banners');
    END IF;
  END IF;
END $$;
