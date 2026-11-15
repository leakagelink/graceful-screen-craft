import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { CANCEL_REASONS } from '@/lib/booking-options';
import { Button } from '@/components/ui';

interface Props {
  busy: boolean;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

export default function CancelReasonSheet({ busy, onSubmit, onClose }: Props) {
  const [reason, setReason] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const submit = () => {
    if (!reason) return;
    const trimmed = comment.trim();
    onSubmit(trimmed ? `${reason} - ${trimmed}` : reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 animate-fade-in" onClick={busy ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reason for cancellation"
        className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-5 pb-6 animate-fade-in-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold text-slate-900">Please choose a reason for cancellation</h3>
          <button onClick={onClose} disabled={busy} aria-label="Close" className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <ul role="radiogroup" className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1">
          {CANCEL_REASONS.map((item) => {
            const active = reason === item;
            return (
              <li key={item}>
                <button
                  role="radio"
                  aria-checked={active}
                  onClick={() => setReason(item)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <span
                    className={`flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
                      active ? 'border-primary-600 bg-primary-600' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {active && <Check className="w-3 h-3 text-white" />}
                  </span>
                  {item}
                </button>
              </li>
            );
          })}
        </ul>

        <textarea
          className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary-500"
          rows={2}
          placeholder="You can add additional comment to help us improve"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={busy}
        />

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={busy}>
            Go Back
          </Button>
          <Button variant="danger" className="flex-1" onClick={submit} disabled={!reason || busy} loading={busy}>
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
