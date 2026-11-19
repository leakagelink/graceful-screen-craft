import { useState } from 'react';
import { BellRing, CheckCircle2, Send, Users } from 'lucide-react';
import { supabase, type Profile } from '@/lib/supabase';
import { validateNotificationDraft, type NotificationAudience } from '@/lib/admin-notifications';
import { Button, Field, inputClass } from '@/components/ui';

export default function AdminNotificationSender({ profiles }: { profiles: Profile[] }) {
  const [audience, setAudience] = useState<NotificationAudience>('user');
  const [recipientId, setRecipientId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateNotificationDraft(audience, recipientId, title, body);
    if (validation) { setError(validation); setSuccess(''); return; }
    setBusy(true); setError(''); setSuccess('');
    const { data, error: failure } = await supabase.rpc('admin_send_notification', {
      _audience: audience,
      _recipient_id: audience === 'user' ? recipientId : '00000000-0000-0000-0000-000000000000',
      _title: title.trim(),
      _body: body.trim(),
    });
    setBusy(false);
    if (failure) { setError(failure.message); return; }
    const count = Number((data as { sent?: number } | null)?.sent ?? 0);
    setSuccess(`Notification sent to ${count} ${count === 1 ? 'user' : 'users'}. It is now visible in their Alerts.`);
    setTitle(''); setBody('');
  }

  return (
    <section aria-labelledby="admin-notification-title" className="overflow-hidden rounded-2xl border border-border bg-card shadow-3d">
      <div className="bg-gradient-to-br from-primary-800 to-primary-950 p-5 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-foreground/10"><BellRing className="h-5 w-5 text-warning-500" /></div>
          <div><h2 id="admin-notification-title" className="font-display text-lg font-bold">Send a notification</h2><p className="text-xs text-primary-200">Deliver an instant in-app alert to the right users.</p></div>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4 p-5">
        <Field label="Audience">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([['user', 'One user'], ['all', 'All users'], ['shippers', 'Shippers'], ['drivers', 'Drivers']] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={audience === value} onClick={() => { setAudience(value); setError(''); setSuccess(''); }} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${audience === value ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-border bg-background text-muted-foreground hover:text-foreground'}`}>{label}</button>
            ))}
          </div>
        </Field>
        {audience === 'user' && (
          <Field label="Recipient">
            <select aria-label="Notification recipient" className={inputClass} value={recipientId} onChange={(event) => setRecipientId(event.target.value)}>
              <option value="">Choose a user…</option>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name} · {profile.role}{profile.phone ? ` · ${profile.phone}` : ''}</option>)}
            </select>
          </Field>
        )}
        {audience !== 'user' && <p className="flex items-center gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground"><Users className="h-4 w-4" />This message will be sent to every eligible profile in the selected audience.</p>}
        <Field label="Title"><input aria-label="Notification title" className={inputClass} maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Service update" /></Field>
        <Field label="Message">
          <textarea aria-label="Notification message" className={`${inputClass} resize-none`} rows={4} maxLength={500} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write the update users should see…" />
          <p className="mt-1 text-right text-[11px] text-muted-foreground">{body.length}/500</p>
        </Field>
        {error && <p role="alert" className="rounded-xl bg-error-500/10 p-3 text-sm font-medium text-error-600">{error}</p>}
        {success && <p role="status" className="flex items-start gap-2 rounded-xl bg-accent-50 p-3 text-sm font-medium text-accent-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={busy} loading={busy}><Send className="h-4 w-4" />Send notification</Button>
      </form>
    </section>
  );
}
