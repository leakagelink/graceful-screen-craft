import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function KycDocumentLink({ path, label, className }: { path: string; label: string; className?: string }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setUrl('');
    setFailed(false);
    void supabase.storage.from('kyc-documents').createSignedUrl(path, 3600).then(({ data, error }) => {
      if (!active) return;
      if (error || !data?.signedUrl) setFailed(true);
      else setUrl(data.signedUrl);
    });
    return () => { active = false; };
  }, [path]);

  if (failed) return <span className={className}>Document unavailable</span>;
  if (!url) return <span className={className}>Loading document…</span>;
  return <a href={url} target="_blank" rel="noreferrer" className={className}>{label}</a>;
}
