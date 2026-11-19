import { useState } from 'react';
import { Building2, ShieldCheck, LogOut, FileText, Copy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import BankAccountModal from '@/components/BankAccountModal';
import DriverPermissions from '@/components/DriverPermissions';
import DriverRatingCard from '@/components/DriverRatingCard';
import { LangSwitcher } from '@/components/LangSwitcher';

export default function DriverAccount({ onKyc }: { onKyc: () => void }) {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const p = profile as (typeof profile & Partial<Database['public']['Tables']['profiles']['Row']>);
  const [form, setForm] = useState({ full_name: p?.full_name ?? '', phone: p?.phone ?? '', vehicle_type: p?.vehicle_type ?? '', vehicle_capacity: p?.vehicle_capacity ?? '', service_routes: p?.service_routes ?? '', upi_id: p?.upi_id ?? '' });
  const [bank, setBank] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!profile) return;
    setBusy(true); setMessage('');
    const { error } = await supabase.from('profiles').update(form).eq('id', profile.id);
    if (!error) await refreshProfile();
    setMessage(error ? error.message : 'Profile saved'); setBusy(false);
  }
  return <div className="max-w-md mx-auto px-4 py-6 space-y-6">
    <div className="flex justify-between items-start gap-3"><div><h1 className="text-2xl font-bold">My account</h1><p className="text-sm text-muted-foreground break-all">{user?.email}</p></div><LangSwitcher /></div>
    <form onSubmit={save} className="space-y-4">{Object.entries(form).map(([key, value]) => <label key={key} className="block text-sm font-medium">{{ full_name: 'Full name', phone: 'Phone', vehicle_type: 'Vehicle type', vehicle_capacity: 'Vehicle capacity', service_routes: 'Service routes / areas', upi_id: 'UPI ID' }[key]}<input className="mt-1.5 w-full h-11 px-3 rounded-md border border-input bg-background text-foreground" value={value} required={key === 'full_name'} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} /></label>)}<Button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save profile'}</Button>{message && <p role="status" className="text-sm">{message}</p>}</form>
    {profile?.id && <DriverRatingCard driverId={profile.id} ownProfile />}
    <section className="border-t border-border pt-4 space-y-3"><Button variant="outline" className="w-full justify-start" onClick={onKyc}><ShieldCheck />KYC · {profile?.kyc_status.replaceAll('_', ' ')}</Button><Button variant="outline" className="w-full justify-start" onClick={() => setBank(true)}><Building2 />Bank account · {profile?.bank_account_number ? `•••• ${profile.bank_account_number.slice(-4)}` : 'Not linked'}</Button>
    {profile?.referral_code && <div className="flex items-center justify-between gap-3 text-sm"><span>Referral · {profile.referral_code}</span><Button size="icon" variant="ghost" title="Copy referral code" onClick={() => { if (profile.referral_code) void navigator.clipboard.writeText(profile.referral_code).then(() => setMessage('Referral code copied')).catch(() => setMessage('Could not copy referral code')); }}><Copy /></Button></div>}
    {profile?.free_until && <p className="text-sm text-muted-foreground">Trial ends {new Date(profile.free_until).toLocaleDateString('en-IN')}</p>}</section>
    <DriverPermissions />
    <section className="border-t border-border pt-4 space-y-2"><h2 className="font-semibold">Policy documents</h2>{[['Terms & conditions', '/vahakam_transport_Terms_and_Conditions.docx'], ['Privacy policy', '/vahakam_privacy_policy.docx'], ['Cancellation & refund', '/Vahakam_-_Cancellation_&_Refund_Policy_.pdf']].map(([label, href]) => <Button asChild variant="ghost" className="w-full justify-start" key={href}><a href={href} target="_blank" rel="noreferrer"><FileText />{label}</a></Button>)}</section>
    <Button variant="destructive" onClick={signOut}><LogOut />Sign out</Button>
    {bank && <BankAccountModal onClose={() => setBank(false)} onSaved={() => { setBank(false); void refreshProfile(); }} />}
  </div>;
}