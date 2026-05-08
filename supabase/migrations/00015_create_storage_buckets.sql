-- ============================================================
-- Migration 00015: Criar buckets de storage e políticas
-- ============================================================

-- --------------------------------------------------------
-- Bucket: tour-images (fotos dos passeios, público)
-- --------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tour-images',
  'tour-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- Leitura pública
CREATE POLICY "tour_images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tour-images');

-- Upload apenas admin autenticado
CREATE POLICY "tour_images_insert_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tour-images'
    AND auth.role() = 'authenticated'
    AND public.is_admin()
  );

-- Update apenas admin
CREATE POLICY "tour_images_update_admin"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'tour-images'
    AND auth.role() = 'authenticated'
    AND public.is_admin()
  );

-- Delete apenas admin
CREATE POLICY "tour_images_delete_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tour-images'
    AND auth.role() = 'authenticated'
    AND public.is_admin()
  );

-- --------------------------------------------------------
-- Bucket: ai-documents (documentos de contexto IA, público)
-- --------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'ai-documents',
  'ai-documents',
  true,
  10485760 -- 10MB
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- Leitura pública
CREATE POLICY "ai_documents_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ai-documents');

-- Upload apenas admin
CREATE POLICY "ai_documents_insert_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ai-documents'
    AND auth.role() = 'authenticated'
    AND public.is_admin()
  );

-- Update apenas admin
CREATE POLICY "ai_documents_update_admin"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'ai-documents'
    AND auth.role() = 'authenticated'
    AND public.is_admin()
  );

-- Delete apenas admin
CREATE POLICY "ai_documents_delete_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ai-documents'
    AND auth.role() = 'authenticated'
    AND public.is_admin()
  );
