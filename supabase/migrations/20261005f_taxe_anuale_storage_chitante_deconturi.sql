-- Faza 33 (33-03, sectiunea 4): bucket privat pentru dovada de transfer catre federatie.
-- Pe live nu exista niciun bucket (verificat 2026-10-05); UI-ul (FederationInvoices) incerca upload in
-- 'chitante_deconturi' care lipsea. Cale obligatorie: public/{club_id}/{uuid}/{fisier} (verificata si de RPC).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chitante_deconturi', 'chitante_deconturi', false, 5242880, ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS chitante_deconturi_select_club ON storage.objects;
DROP POLICY IF EXISTS chitante_deconturi_insert_club ON storage.objects;
CREATE POLICY chitante_deconturi_select_club ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chitante_deconturi'
         AND (storage.foldername(name))[1] = 'public'
         AND public.poate_gestiona_taxe_club(
               CASE WHEN (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$' THEN ((storage.foldername(name))[2])::uuid END));
CREATE POLICY chitante_deconturi_insert_club ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chitante_deconturi'
         AND (storage.foldername(name))[1] = 'public'
         AND public.poate_gestiona_taxe_club(
               CASE WHEN (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$' THEN ((storage.foldername(name))[2])::uuid END));
