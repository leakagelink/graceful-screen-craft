import { useState } from 'react';
import { ArrowLeft, ShieldCheck, FileText, Truck, Upload, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { supabase, type KycStatus } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button, Field, inputClass, Spinner } from '@/components/ui';
import KycDocumentLink from '@/components/KycDocumentLink';

interface Props {
  onBack: () => void;
}

export default function KycScreen({ onBack }: Props) {
  const { profile, refreshProfile } = useAuth();
  const [licenseNumber, setLicenseNumber] = useState(profile?.license_number ?? '');
  const [rcNumber, setRcNumber] = useState(profile?.rc_number ?? '');
  const [vehicleNumber, setVehicleNumber] = useState(profile?.vehicle_number ?? '');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [rcFile, setRcFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const kycStatus: KycStatus = profile?.kyc_status ?? 'not_submitted';
  const canEdit = kycStatus === 'not_submitted' || kycStatus === 'rejected';

  async function uploadFile(file: File, folder: string): Promise<string | null> {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${folder}/${profile?.id}.${ext}`;
    const { error } = await supabase.storage.from('kyc-documents').upload(path, file, { upsert: true });
    if (error) {
      console.error('Upload error:', error.message);
      return null;
    }
    return path;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!licenseNumber.trim() || !rcNumber.trim() || !vehicleNumber.trim()) {
      setMsg({ type: 'error', text: 'Please fill in all document numbers.' });
      return;
    }
    setBusy(true);
    setMsg(null);

    let licenseUrl = profile?.license_url ?? null;
    let rcUrl = profile?.rc_url ?? null;
    let insuranceUrl = profile?.insurance_url ?? null;

    if (licenseFile) {
      const url = await uploadFile(licenseFile, 'licenses');
      if (!url) { setBusy(false); setMsg({ type: 'error', text: 'Could not upload license document.' }); return; }
      licenseUrl = url;
    }
    if (rcFile) {
      const url = await uploadFile(rcFile, 'rc');
      if (!url) { setBusy(false); setMsg({ type: 'error', text: 'Could not upload RC document.' }); return; }
      rcUrl = url;
    }
    if (insuranceFile) {
      const url = await uploadFile(insuranceFile, 'insurance');
      if (!url) { setBusy(false); setMsg({ type: 'error', text: 'Could not upload insurance document.' }); return; }
      insuranceUrl = url;
    }

    const { error } = await supabase.rpc('submit_kyc', {
      _license_number: licenseNumber.trim(),
      _rc_number: rcNumber.trim(),
      _vehicle_number: vehicleNumber.trim(),
      ...(licenseUrl ? { _license_url: licenseUrl } : {}),
      ...(rcUrl ? { _rc_url: rcUrl } : {}),
      ...(insuranceUrl ? { _insurance_url: insuranceUrl } : {}),
    });

    setBusy(false);
    if (error) {
      setMsg({ type: 'error', text: error.message });
      return;
    }
    setMsg({ type: 'success', text: 'KYC submitted! We will review your documents within 24 hours.' });
    await refreshProfile();
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-slate-900 leading-tight">KYC Verification</h1>
            <p className="text-xs text-slate-400">Driver document verification</p>
          </div>
          <StatusBadge status={kycStatus} />
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-md mx-auto">
        {/* Status banner */}
        {kycStatus === 'pending' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Under review</p>
              <p className="text-xs text-amber-700">Your documents are being reviewed. This usually takes 24 hours.</p>
            </div>
          </div>
        )}
        {kycStatus === 'approved' && (
          <div className="bg-accent-50 border border-accent-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-accent-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-accent-800 text-sm">KYC Approved</p>
              <p className="text-xs text-accent-700">You can now accept loads and earn on Vahakam.</p>
            </div>
          </div>
        )}
        {kycStatus === 'rejected' && (
          <div className="bg-error-500/10 border border-error-500/20 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-error-700 text-sm">KYC Rejected</p>
              <p className="text-xs text-error-600 mt-0.5">{profile?.kyc_rejection_reason ?? 'Please resubmit your documents.'}</p>
            </div>
          </div>
        )}

        {msg && (
          <div className={`rounded-xl p-3.5 flex items-start gap-3 ${msg.type === 'success' ? 'bg-accent-50 border border-accent-200' : 'bg-error-500/10 border border-error-500/20'}`}>
            {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-accent-600 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />}
            <p className={`text-sm font-medium ${msg.type === 'success' ? 'text-accent-800' : 'text-error-700'}`}>{msg.text}</p>
          </div>
        )}

        {canEdit ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-primary-600" /> Document Details</h3>
              <Field label="Driving License Number">
                <input className={inputClass} placeholder="e.g. MH12 20180001234" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} required />
              </Field>
              <Field label="Vehicle RC Number">
                <input className={inputClass} placeholder="e.g. MH12 AB 1234" value={rcNumber} onChange={(e) => setRcNumber(e.target.value)} required />
              </Field>
              <Field label="Vehicle Number">
                <input className={inputClass} placeholder="e.g. MH12 AB 1234" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} required />
              </Field>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><Upload className="w-4 h-4 text-primary-600" /> Upload Documents</h3>
              <FileInput label="Driving License" file={licenseFile} onChange={setLicenseFile} />
              <FileInput label="Vehicle RC Book" file={rcFile} onChange={setRcFile} />
              <FileInput label="Insurance Certificate" file={insuranceFile} onChange={setInsuranceFile} />
            </div>

            <Button type="submit" size="lg" variant="primary" className="w-full" disabled={busy} loading={busy}>
              <ShieldCheck className="w-5 h-5" /> Submit for Verification
            </Button>
          </form>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Submitted Documents</h3>
            <DocRow label="License #" value={profile?.license_number} />
            <DocRow label="RC #" value={profile?.rc_number} />
            <DocRow label="Vehicle #" value={profile?.vehicle_number} />
            {profile?.license_url && <DocLink url={profile.license_url} label="View License" />}
            {profile?.rc_url && <DocLink url={profile.rc_url} label="View RC" />}
            {profile?.insurance_url && <DocLink url={profile.insurance_url} label="View Insurance" />}
          </div>
        )}
      </div>
    </div>
  );
}

function FileInput({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-700 mb-1.5">{label}</p>
      <label className="flex items-center gap-3 border-2 border-dashed border-slate-300 rounded-xl p-3.5 cursor-pointer hover:border-primary-400 transition-colors">
        <Upload className="w-5 h-5 text-slate-400" />
        <span className="text-sm text-slate-500 flex-1">
          {file ? file.name : 'Tap to upload (JPG, PNG, PDF)'}
        </span>
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}

function DocRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value ?? '—'}</span>
    </div>
  );
}

function DocLink({ url, label }: { url: string; label: string }) {
  return <KycDocumentLink path={url} label={label} className="block text-center text-sm font-semibold text-primary-700 bg-primary-50 rounded-lg py-2.5 hover:bg-primary-100 transition-colors" />;
}

function StatusBadge({ status }: { status: KycStatus }) {
  const map = {
    not_submitted: { label: 'Not Submitted', color: 'slate' as const },
    pending: { label: 'Pending', color: 'amber' as const },
    approved: { label: 'Approved', color: 'green' as const },
    rejected: { label: 'Rejected', color: 'red' as const },
  };
  const m = map[status];
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold bg-${m.color === 'green' ? 'accent' : m.color === 'slate' ? 'slate' : m.color === 'amber' ? 'amber' : 'red'}-100 text-${m.color === 'green' ? 'accent' : m.color}-700`}>{m.label}</span>;
}

export { Spinner };
