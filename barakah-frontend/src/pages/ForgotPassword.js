import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../LanguageContext';
import { authAPI } from '../api/auth';
import { T } from '../translations';
import SiteHeader from '../components/SiteHeader';
import Footer from '../components/Footer';
import PageShell from '../components/common/PageShell';

export default function ForgotPassword() {
  const { isBangla } = useLanguage();
  const t = useMemo(() => (isBangla ? T.bn : T.en), [isBangla]);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
      toast.success(isBangla ? 'রিসেট কোড পাঠানো হয়েছে' : 'Reset code sent!');
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Failed to send reset code');
    } finally {
      setLoading(false);
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
        <div className="mx-auto max-w-lg">
          <div className="relative">
            <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-emerald-700/18 via-gold/12 to-amber-600/18 blur" aria-hidden="true" />
            <div className="relative rounded-[26px] border border-stone-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] backdrop-blur p-8">
              <h1 className="font-cerialebaran text-[28px] leading-tight text-heading">
                {isBangla ? 'পাসওয়ার্ড রিসেট' : 'Reset Password'}
              </h1>
              <p className="mt-2 text-[13px] text-muted">
                {isBangla ? 'আপনার ইমেইলে একটি রিসেট কোড পাঠানো হবে।' : "We'll send a reset code to your email."}
              </p>

              {!sent ? (
                <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-[12px] font-medium text-body mb-2">{t.labelEmail}</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="name@email.com"
                      className="w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-3 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600/40" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-emerald-900/30 disabled:opacity-60">
                    <span className="relative z-10">{loading ? '...' : (isBangla ? 'কোড পাঠান' : 'Send Reset Code')}</span>
                  </button>
                </form>
              ) : (
                <div className="mt-7 space-y-4">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/[0.08] border border-emerald-200/50 dark:border-emerald-500/20 p-4">
                    <p className="text-[13px] text-emerald-700 dark:text-emerald-300">
                      {isBangla ? `${email} এ একটি ৬ সংখ্যার কোড পাঠানো হয়েছে।` : `A 6-digit code has been sent to ${email}.`}
                    </p>
                  </div>
                  <Link to={`/reset-password?email=${encodeURIComponent(email)}`}
                    className="block w-full text-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-emerald-900/30">
                    {isBangla ? 'কোড দিয়ে রিসেট করুন' : 'Enter Code & Reset'}
                  </Link>
                </div>
              )}

              <p className="mt-6 text-[13px] text-muted">
                <Link to="/login" className="text-emerald-700 dark:text-emerald-300 hover:underline">{t.actionBackToLogin}</Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer t={t} links={[{ to: '/', label: t.navHome }, { to: '/login', label: t.navLogin }]} />
    </PageShell>
  );
}
