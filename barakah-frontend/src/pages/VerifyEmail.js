import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../LanguageContext';
import { authAPI } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { T } from '../translations';
import SiteHeader from '../components/SiteHeader';
import Footer from '../components/Footer';
import PageShell from '../components/common/PageShell';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { isBangla } = useLanguage();
  const { loading: authLoading, isAuthenticated, user, refreshUser } = useAuth();
  const t = useMemo(() => (isBangla ? T.bn : T.en), [isBangla]);

  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Only redirect away if the user is already authenticated AND already verified.
    // If they are logged in but unverified, they should stay here to verify.
    if (!authLoading && isAuthenticated && user?.is_email_verified) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error(isBangla ? '৬ সংখ্যার কোড দিন' : 'Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await authAPI.verifyEmail(email, code);
      setVerified(true);
      toast.success(isBangla ? 'ইমেইল ভেরিফাই হয়েছে!' : 'Email verified!');
      // Refresh user profile so is_email_verified flag updates in context
      if (refreshUser) await refreshUser().catch(() => { });
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await authAPI.sendVerificationCode(email);
      toast.success(isBangla ? 'কোড আবার পাঠানো হয়েছে' : 'Code resent!');
    } catch (err) {
      toast.error('Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <PageShell>
      <SiteHeader
        t={t}
        links={[
          { to: '/', label: t.navHome, hideOnMobile: true },
          { to: '/login', label: t.navLogin, hideOnMobile: true },
        ]}
      />

      <main className="flex-1 px-6 pt-12 pb-10">
        <div className="mx-auto max-w-3xl">
          <div className="relative">
            <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-emerald-700/18 via-gold/12 to-amber-600/18 blur" aria-hidden="true" />
            <div className="relative rounded-[26px] border border-stone-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] backdrop-blur p-8 sm:p-10">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h1 className="font-cerialebaran text-[32px] leading-tight text-heading">
                    {verified ? (isBangla ? 'ভেরিফাই হয়েছে!' : 'Verified!') : t.authVerifyTitle}
                  </h1>
                  <p className="mt-2 text-[14px] text-body max-w-xl leading-relaxed">
                    {verified
                      ? (isBangla ? 'আপনার ইমেইল সফলভাবে ভেরিফাই হয়েছে। এখন লগ ইন করতে পারেন।' : 'Your email has been verified. You can now log in.')
                      : (isBangla ? 'আপনার ইমেইলে একটি ৬ সংখ্যার কোড পাঠানো হয়েছে।' : 'A 6-digit code has been sent to your email.')}
                  </p>
                  {email && !verified && (
                    <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-stone-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] px-4 py-1.5 text-[12px] text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/35" />
                      {t.verifySentTo(email)}
                    </p>
                  )}
                </div>
                <div className="hidden sm:flex h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/[0.12] border border-emerald-600/10 dark:border-emerald-400/10 items-center justify-center">
                  {verified ? (
                    <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-7 h-7 text-emerald-700 dark:text-emerald-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4V4z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8 6 8-6" />
                    </svg>
                  )}
                </div>
              </div>

              {!verified ? (
                <form className="mt-8" onSubmit={handleVerify}>
                  <label className="block text-[12px] font-medium text-body mb-2">{isBangla ? 'ভেরিফিকেশন কোড' : 'Verification code'}</label>
                  <div className="flex gap-3 items-start">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      className="flex-1 max-w-[200px] rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-3 text-[18px] tracking-[0.4em] text-heading dark:text-white text-center font-mono placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600/40"
                    />
                    <button type="submit" disabled={loading || code.length !== 6}
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-[14px] font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:shadow-emerald-500/20 disabled:opacity-50">
                      <span className="relative z-10">{loading ? '...' : (isBangla ? 'ভেরিফাই' : 'Verify')}</span>
                    </button>
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button type="button" onClick={handleResend} disabled={resending}
                      className="rounded-xl border border-stone-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] px-5 py-2.5 text-[13px] font-medium text-body hover:border-emerald-600/40 transition disabled:opacity-50">
                      {resending ? '...' : t.actionResend}
                    </button>
                    <Link to="/signup"
                      className="rounded-xl border border-stone-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] px-5 py-2.5 text-[13px] font-medium text-body hover:border-emerald-600/40 transition text-center">
                      {t.actionChangeEmail}
                    </Link>
                  </div>
                </form>
              ) : (
                <div className="mt-8">
                  <Link
                    to={isAuthenticated ? "/dashboard" : "/login"}
                    className="inline-flex items-center gap-2 group relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:shadow-emerald-500/20">
                    <span className="relative z-10">
                      {isAuthenticated ? (isBangla ? 'ড্যাশবোর্ডে যান' : 'Go to Dashboard') : t.actionLogin}
                    </span>
                  </Link>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>

      <Footer t={t} links={[{ to: '/', label: t.navHome }, { to: '/login', label: t.navLogin }]} />
    </PageShell>
  );
}
