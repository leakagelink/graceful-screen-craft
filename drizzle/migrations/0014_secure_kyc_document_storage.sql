CREATE POLICY "Drivers upload own KYC documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] IN ('licenses', 'rc', 'insurance')
  AND starts_with(storage.filename(name), auth.uid()::text || '.')
);

CREATE POLICY "Drivers and admins read KYC documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    starts_with(storage.filename(name), auth.uid()::text || '.')
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Drivers replace own KYC documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND starts_with(storage.filename(name), auth.uid()::text || '.')
)
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] IN ('licenses', 'rc', 'insurance')
  AND starts_with(storage.filename(name), auth.uid()::text || '.')
);

CREATE POLICY "Drivers delete own KYC documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND starts_with(storage.filename(name), auth.uid()::text || '.')
);