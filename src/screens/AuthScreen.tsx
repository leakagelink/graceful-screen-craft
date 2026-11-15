import { useRef, useState } from 'react';
import {
  Truck,
  Store,
  ArrowRight,
  Mail,
  Lock,
  User,
  Phone,
  Gift,
  FileText,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/lib/supabase';
import '@lovable.dev/cloud-auth-js/styles.css';
import { Button, Field, inputClass } from '@/components/ui';

type Mode = 'select' | 'policies' | 'auth';

export default function AuthScreen() {
  const { signIn, signUp, signInWithGoogle, signInWithLovable, completeRegistration, user, profileError } = useAuth();
  const [mode, setMode] = useState<Mode>('select');
  const [selectedRole, setSelectedRole] = useState<'shipper' | 'driver'>('shipper');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  function pickRole(role: UserRole) {
    if (role === 'admin') return;
    setSelectedRole(role);
    setAcceptedPolicies(false);
    setMode('policies');
    setError(null);
  }

  function continueAfterPolicies() {
    if (!acceptedPolicies) return;
    sessionStorage.setItem('vahakam-registration-role', selectedRole);
    sessionStorage.setItem('vahakam-policies-accepted', 'yes');
    if (user) { void completeRegistration(selectedRole).then(result => setError(result.error)); return; }
    setMode('auth');
    setError(null);
  }

  async function handleGoogle(provider: 'google' | 'lovable' = 'google') {
    if (submittingRef.current) return;
    setError(null);
    if (isSignUp && !acceptedPolicies) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const { error: err } = await (provider === 'google' ? signInWithGoogle() : signInWithLovable());
      if (err) {
        setError(translateError(err));
        setLoading(false);
        submittingRef.current = false;
      }
    } catch (err) {
      setError(translateError(errorMessage(err)));
      setLoading(false);
      submittingRef.current = false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter both your email and password.');
      return;
    }
    if (isSignUp && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    try {
      const result = isSignUp
        ? await signUp(trimmedEmail, password, fullName.trim(), phone.trim(), referralCode.trim(), selectedRole)
        : await signIn(trimmedEmail, password);
      if (result.error) setError(translateError(result.error));
      else if ('confirmationRequired' in result && result.confirmationRequired) setConfirmation(true);
    } catch (err) {
      console.error('[auth] Unexpected error during form submit:', errorMessage(err));
      setError(translateError(errorMessage(err)));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  if (confirmation) return <div className="min-h-screen bg-background flex items-center justify-center p-5"><div className="max-w-md space-y-4 text-foreground"><h1 className="text-2xl font-bold">Check your email</h1><p>Open the confirmation link sent to {email} before signing in.</p><Button onClick={() => { setConfirmation(false); setIsSignUp(false); }}>Back to sign in</Button></div></div>;

  if (mode === 'select') {
    return <RoleSelection onPick={pickRole} />;
  }

  if (mode === 'policies') {
    return (
      <PolicyAgreement
        role={selectedRole}
        accepted={acceptedPolicies}
        onAcceptedChange={setAcceptedPolicies}
        onBack={() => setMode('select')}
        onContinue={continueAfterPolicies}
      />
    );
  }

  const roleLabel =
    selectedRole === 'shipper' ? 'Shipper / Merchant' : 'Driver / Transporter';
  const roleLabelHi = selectedRole === 'shipper' ? 'व्यापारी' : 'ड्रायव्हर';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary-950 via-primary-900 to-primary-800">
      <div className="flex-1 flex flex-col justify-center px-5 py-8 max-w-md w-full mx-auto">
        <button
          onClick={() => setMode('select')}
          className="text-primary-200 text-sm mb-6 self-start hover:text-white transition-colors"
        >
          ← Change role
        </button>

        <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 p-6 animate-scale-in">
          <div className="flex items-center gap-3 mb-1">
            {selectedRole === 'shipper' ? (
              <Store className="w-6 h-6 text-primary-600" />
            ) : (
              <Truck className="w-6 h-6 text-primary-600" />
            )}
            <h1 className="text-xl font-bold text-slate-900">{roleLabel}</h1>
          </div>
          <p className="text-sm text-slate-500 mb-6">{roleLabelHi}</p>

          <button
            type="button"
            onClick={() => handleGoogle()}
            disabled={loading || (isSignUp && !acceptedPolicies)}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <GoogleMark />
            Continue with Google
          </button>

          <button type="button" className="lovable-auth-button w-full mt-3" disabled={loading} onClick={() => handleGoogle('lovable')}>Continue with Lovable</button>

          <div className="flex items-center gap-3 my-5 text-xs text-slate-400">
            <span className="flex-1 h-px bg-slate-200" />
            or with email
            <span className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <Field label="Full name">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    className={`${inputClass} pl-11`}
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </Field>
            )}

            <Field label="Email">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  className={`${inputClass} pl-11`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </Field>

            {isSignUp && (
              <Field label="Phone (optional)">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    className={`${inputClass} pl-11`}
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </Field>
            )}

            {isSignUp && (
              <Field label="Referral code (optional)">
                <div className="relative">
                  <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    className={`${inputClass} pl-11 uppercase`}
                    placeholder="Enter code for 1 month free"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    maxLength={8}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Enter a friend's code and you both get 1 month commission-free.
                </p>
              </Field>
            )}

            <Field label="Password">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  className={`${inputClass} pl-11`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
              </div>
            </Field>

            {(error ?? profileError) && (
              <div role="alert" className="text-sm text-error-600 bg-error-500/10 rounded-lg px-3 py-2 font-medium">
                {error ?? profileError}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={loading}
            >
              {loading
                ? isSignUp
                  ? 'Creating account...'
                  : 'Signing in...'
                : isSignUp
                  ? 'Create account'
                  : 'Sign in'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="font-semibold text-primary-600 hover:text-primary-700"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.2-2 3.5-5 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.4 7.4 24 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V6.5H1.4C.5 8.2 0 10 0 12s.5 3.8 1.4 5.5l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}

function PolicyAgreement({
  role,
  accepted,
  onAcceptedChange,
  onBack,
  onContinue,
}: {
  role: UserRole;
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const roleLabel = role === 'shipper' ? 'Shipper / Merchant' : 'Driver / Transporter';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary-950 via-primary-900 to-primary-800">
      <div className="flex-1 flex flex-col justify-center px-5 py-8 max-w-md w-full mx-auto">
        <button
          onClick={onBack}
          className="text-primary-200 text-sm mb-6 self-start hover:text-white transition-colors"
        >
          ← Change role
        </button>

        <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 p-6 animate-scale-in">
          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-primary-700" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Before you continue</h1>
          <p className="text-sm text-slate-500 mt-2 leading-6">
            You are joining Vahakam Transport as a {roleLabel}. Please review and accept these documents before creating your account.
          </p>

          <div className="space-y-3 mt-6">
            <PolicyLink
              icon={<ShieldCheck className="w-5 h-5" />}
              label="Privacy Policy"
              href="/vahakam_privacy_policy.docx"
            />
            <PolicyLink
              icon={<FileText className="w-5 h-5" />}
              label="Transport Terms and Conditions"
              href="/vahakam_transport_Terms_and_Conditions.docx"
            />
            <PolicyLink
              icon={<FileText className="w-5 h-5" />}
              label="Cancellation and Refund Policy"
              href="/Vahakam_-_Cancellation_&_Refund_Policy_.pdf"
            />
          </div>

          <label className="flex items-start gap-3 mt-6 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => onAcceptedChange(event.target.checked)}
              className="mt-1 w-4 h-4 accent-primary-600"
            />
            <span className="text-sm text-slate-700 leading-5">
              I have read and agree to the Privacy Policy, Transport Terms and Conditions, and Cancellation and Refund Policy.
            </span>
          </label>

          <Button
            type="button"
            size="lg"
            className="w-full mt-6"
            disabled={!accepted}
            onClick={onContinue}
          >
            Accept and continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PolicyLink({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-slate-700 hover:border-primary-300 hover:bg-primary-50 transition-colors"
    >
      <span className="text-primary-600">{icon}</span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <ExternalLink className="w-4 h-4 text-slate-400" />
    </a>
  );
}

function RoleSelection({ onPick }: { onPick: (role: UserRole) => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary-950 via-primary-900 to-primary-800 relative overflow-hidden">
      {/* decorative shapes */}
      <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-accent-500/20 blur-3xl" />
      <div className="absolute bottom-10 -left-20 w-72 h-72 rounded-full bg-primary-500/30 blur-3xl" />

      <div className="flex-1 flex flex-col justify-center px-5 py-10 max-w-md w-full mx-auto relative">
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 mb-4">
            <Truck className="w-8 h-8 text-accent-400" strokeWidth={2.2} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Vahakam Transport
          </h1>
          <p className="text-primary-200 mt-1.5 text-base">
            वाहकम ट्रान्सपोर्ट
          </p>
          <p className="text-primary-300/80 mt-3 text-sm">
            Book trucks. Move goods. Earn on every trip.
          </p>
        </div>

        <div className="space-y-4">
          <RoleCard
            icon={<Store className="w-7 h-7" />}
            title="Shipper / Merchant"
            subtitle="व्यापारी"
            description="Book trucks for your goods and track deliveries"
            onClick={() => onPick('shipper')}
            accent="primary"
          />
          <RoleCard
            icon={<Truck className="w-7 h-7" />}
            title="Driver / Transporter"
            subtitle="ड्राइवर / ट्रांसपोर्टर"
            description="Find loads, make offers and earn on every trip"
            onClick={() => onPick('driver')}
            accent="accent"
          />
        </div>

        <p className="text-center text-primary-300/60 text-xs mt-8">
          Choose your role to continue
        </p>
      </div>
    </div>
  );
}

function RoleCard({
  icon,
  title,
  subtitle,
  description,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  onClick: () => void;
  accent: 'primary' | 'accent';
}) {
  const ring =
    accent === 'primary'
      ? 'group-hover:border-primary-400'
      : 'group-hover:border-accent-400';
  const iconBg =
    accent === 'primary'
      ? 'bg-primary-500 text-white'
      : 'bg-accent-500 text-white';
  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-4 p-4 bg-white/95 backdrop-blur rounded-2xl shadow-lg shadow-black/20 border-2 border-transparent ${ring} transition-all duration-200 active:scale-[0.98] text-left animate-fade-in-up`}
    >
      <div
        className={`flex-shrink-0 w-14 h-14 rounded-xl ${iconBg} flex items-center justify-center transition-transform group-hover:scale-105`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-900 text-base">{title}</div>
        <div className="text-sm text-slate-500">{subtitle}</div>
        <div className="text-xs text-slate-400 mt-0.5">{description}</div>
      </div>
      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Unexpected error. Please try again.';
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials'))
    return 'Incorrect email or password.';
  if (m.includes('email not confirmed'))
    return 'Your email is not confirmed yet. Open the confirmation link sent to your inbox, then sign in again.';
  if (m.includes('user already registered'))
    return 'An account with this email already exists. Try signing in.';
  if (m.includes('email') && m.includes('invalid'))
    return 'Please enter a valid email.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts. Please wait a moment and try again.';
  if (
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('network request failed') ||
    m.includes('load failed') ||
    m.includes('fetch failed')
  )
    return 'Network error: could not reach the server. Check your internet connection and try again.';
  if (m.includes('invalid api key') || m.includes('no api key'))
    return `Configuration error: the server rejected the app's connection key (${msg}).`;
  return msg;
}
