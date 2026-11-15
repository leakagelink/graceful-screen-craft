import { useState } from 'react';
import { X, Building2, User, Hash, Banknote } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button, Field, inputClass, Spinner } from '@/components/ui';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function BankAccountModal({ onClose, onSaved }: Props) {
  const { profile } = useAuth();
  const [holderName, setHolderName] = useState(profile?.bank_holder_name ?? profile?.full_name ?? '');
  const [accountNumber, setAccountNumber] = useState(profile?.bank_account_number ?? '');
  const [ifsc, setIfsc] = useState(profile?.bank_ifsc ?? '');
  const [bankName, setBankName] = useState(profile?.bank_name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave =
    holderName.trim() &&
    accountNumber.trim() &&
    ifsc.trim() &&
    !saving;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || !profile) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from('profiles')
      .update({
        bank_holder_name: holderName.trim(),
        bank_account_number: accountNumber.trim(),
        bank_ifsc: ifsc.trim().toUpperCase(),
        bank_name: bankName.trim() || null,
      })
      .eq('id', profile.id);
    setSaving(false);
    if (err) {
      setError('Could not save bank details. Please try again.');
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Bank Account Details</h2>
              <p className="text-xs text-slate-400">Required for receiving trip payouts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-5 py-4 space-y-4">
          <Field label="Account holder name">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                className={`${inputClass} pl-11`}
                placeholder="Name on bank account"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                required
              />
            </div>
          </Field>

          <Field label="Account number">
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                className={`${inputClass} pl-11`}
                placeholder="Bank account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
              />
            </div>
          </Field>

          <Field label="IFSC code" hint="e.g. HDFC0001234">
            <div className="relative">
              <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                className={`${inputClass} pl-11 uppercase`}
                placeholder="IFSC code"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                required
              />
            </div>
          </Field>

          <Field label="Bank name (optional)">
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                className={`${inputClass} pl-11`}
                placeholder="e.g. HDFC Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>
          </Field>

          {error && (
            <div className="text-sm text-error-600 bg-error-500/10 rounded-lg px-3 py-2 font-medium">
              {error}
            </div>
          )}

          <div className="bg-primary-50 rounded-xl p-3 text-xs text-primary-700 flex items-start gap-2">
            <Banknote className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Bank details are private. Saving them does not initiate a payout;
              transfers appear only after payment processing is enabled.
            </span>
          </div>

          <Button
            type="submit"
            size="lg"
            variant="primary"
            className="w-full"
            disabled={!canSave}
            loading={saving}
          >
            {saving ? (
              <>
                <Spinner className="w-4 h-4" /> Saving…
              </>
            ) : (
              'Save bank details'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
