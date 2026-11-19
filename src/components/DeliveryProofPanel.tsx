import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, FileImage, Upload } from 'lucide-react';
import { supabase, type Booking } from '@/lib/supabase';
import { Button } from '@/components/ui';
import { uploadDeliveryProof, type DeliveryProof } from '@/lib/trip-payment';

export default function DeliveryProofPanel({ booking, role, onChanged }: { booking: Booking; role: 'shipper' | 'driver'; onChanged?: () => void | Promise<void> }) {
  const [proof, setProof] = useState<DeliveryProof | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const canUpload = role === 'driver' && ['in_progress', 'otp_sent'].includes(booking.status);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase.from('delivery_proofs').select('*').eq('booking_id', booking.id).maybeSingle();
    if (loadError) { setError(loadError.message); return; }
    const row = data as DeliveryProof | null;
    setProof(row);
    if (row?.file_path) {
      const { data: signed, error: signedError } = await supabase.storage.from('delivery-proofs').createSignedUrl(row.file_path, 3600);
      if (signedError) setError(signedError.message);
      else setImageUrl(signed.signedUrl);
    } else setImageUrl('');
  }, [booking.id]);

  useEffect(() => {
    void load();
    const channel = supabase.channel(`delivery-proof:${booking.id}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_proofs', filter: `booking_id=eq.${booking.id}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [booking.id, load]);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError('');
    try {
      await uploadDeliveryProof(booking.id, file);
      await load();
      await onChanged?.();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'POD upload nahi ho paya.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  if (!canUpload && !proof && role === 'driver') return null;
  return (
    <section aria-label="POD delivery proof" className="bg-card text-card-foreground rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><FileImage className="w-5 h-5" /></div><div><h2 className="font-bold">POD · Proof of Delivery</h2><p className="text-xs text-muted-foreground">Delivered goods/receipt ki clear photo</p></div></div>
      {proof ? <div role="status" className="space-y-3"><p className="flex items-center gap-2 text-sm font-semibold text-accent-foreground"><CheckCircle2 className="w-5 h-5" />POD photo uploaded</p>{imageUrl && <img src={imageUrl} alt="Uploaded proof of delivery" className="w-full max-h-96 rounded-xl border border-border object-contain bg-muted" />}<p className="text-xs text-muted-foreground">{new Date(proof.created_at).toLocaleString('en-IN')}</p></div> : <p className="text-sm text-muted-foreground">{canUpload ? 'Delivery OTP request karne se pehle POD photo upload karna zaroori hai.' : 'Driver delivery par POD photo upload karega.'}</p>}
      {canUpload && <><input ref={inputRef} id={`pod-upload-${booking.id}`} type="file" accept="image/*" capture="environment" className="sr-only" onChange={event => void upload(event.target.files?.[0])} /><Button type="button" className="w-full" variant="secondary" loading={busy} onClick={() => inputRef.current?.click()}><Camera />{proof ? 'POD photo replace karein' : 'POD photo upload karein'}<Upload className="w-4 h-4" /></Button></>}
      {error && <p role="alert" className="rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}
