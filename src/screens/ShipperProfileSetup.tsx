import { useState } from 'react';
import { Building2, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button, Field, inputClass } from '@/components/ui';

const BUSINESS_TYPES = [
  'Individual',
  'Proprietorship',
  'Partnership',
  'Private Limited',
  'LLP',
  'Other',
];

const PHONE_RE = /^[6-9]\d{9}$/;
const PINCODE_RE = /^[1-9]\d{5}$/;
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function ShipperProfileSetup() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [form, setForm] = useState({
    fullName: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    businessName: '',
    businessType: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const phone = form.phone.replace(/\s+/g, '');
    const pincode = form.pincode.trim();
    const gstin = form.gstin.trim().toUpperCase();

    if (!form.fullName.trim()) return setError('Please enter your full name.');
    if (!PHONE_RE.test(phone)) return setError('Enter a valid 10-digit mobile number.');
    if (!form.businessName.trim()) return setError('Please enter your business or shop name.');
    if (!form.businessType) return setError('Please select a business type.');
    if (!form.address.trim()) return setError('Please enter your pickup or business address.');
    if (!form.city.trim() || !form.state.trim()) return setError('Please enter your city and state.');
    if (!PINCODE_RE.test(pincode)) return setError('Enter a valid 6-digit pincode.');
    if (gstin && !GSTIN_RE.test(gstin)) return setError('GSTIN format looks incorrect. Check it or leave it blank.');

    setError(null);
    setSaving(true);
    const { data, error: dbError } = await supabase
      .from('profiles')
      .update({
        full_name: form.fullName.trim(),
        phone,
        business_name: form.businessName.trim(),
        business_type: form.businessType,
        business_address: form.address.trim(),
        business_city: form.city.trim(),
        business_state: form.state.trim(),
        business_pincode: pincode,
        gstin: gstin || null,
        shipper_profile_completed: true,
      })
      .eq('id', user.id)
      .select('id')
      .maybeSingle();
    setSaving(false);

    if (dbError) return setError('Could not save your details. Please try again.');
    if (!data) return setError('Your profile could not be found. Please sign in again.');
    await refreshProfile();
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Complete your profile</h1>
            <p className="text-sm text-slate-500">Required fields are marked *. GSTIN is optional.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <Field label="Full name *">
            <input className={inputClass} value={form.fullName} onChange={(e) => update('fullName', e.target.value)} required />
          </Field>
          <Field label="Mobile number *">
            <input type="tel" className={inputClass} placeholder="98765 43210" value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
          </Field>
          <Field label="Business / shop / company name *">
            <input className={inputClass} value={form.businessName} onChange={(e) => update('businessName', e.target.value)} required />
          </Field>
          <Field label="Business type *">
            <select className={inputClass} value={form.businessType} onChange={(e) => update('businessType', e.target.value)} required>
              <option value="">Select type</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Pickup / business address *">
            <textarea className={inputClass} rows={2} value={form.address} onChange={(e) => update('address', e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City *">
              <input className={inputClass} value={form.city} onChange={(e) => update('city', e.target.value)} required />
            </Field>
            <Field label="State *">
              <input className={inputClass} value={form.state} onChange={(e) => update('state', e.target.value)} required />
            </Field>
          </div>
          <Field label="Pincode *">
            <input inputMode="numeric" className={inputClass} maxLength={6} value={form.pincode} onChange={(e) => update('pincode', e.target.value)} required />
          </Field>
          <Field label="GSTIN (optional)">
            <input className={`${inputClass} uppercase`} maxLength={15} value={form.gstin} onChange={(e) => update('gstin', e.target.value)} />
          </Field>

          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 font-medium">{error}</div>}

          <Button type="submit" size="lg" className="w-full" loading={saving}>
            <Save className="w-4 h-4" /> Save and continue
          </Button>
          <button type="button" onClick={() => signOut()} className="w-full text-sm text-slate-500 hover:text-slate-700">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
