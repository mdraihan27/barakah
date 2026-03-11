import { useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../LanguageContext';
import { authAPI } from '../api/auth';
import { T } from '../translations';
import SiteHeader from '../components/SiteHeader';
import Footer from '../components/Footer';
import PageShell from '../components/common/PageShell';

export default function ResetPassword() {
  const { isBangla } = useLanguage();
  const t = useMemo(() => (isBangla ? T.bn : T.en), [isBangla]);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const emailParam = params.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(isBangla ? 'পাসওয়ার্ড মিলছে না' : 'Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error(isBangla ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষর' : 'Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, code, new_password: newPassword });
      toast.success(isBangla ? 'পাসওয়ার্ড রিসেট হয়েছে!' : 'Password reset successfully!');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <SiteHeader t={t} links={[{ to: '/', label: t.navHome, hideOnMobile: true }, { to: '/login', label: t.navLogin, hideOnMobile: true }]} />

      <main className="flex-1 px-6 pt-12 pb-10">
        <div className="mx-auto max-w-lg">
          <div className="relative">
            <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-emerald-700/18 via-gold/12 to-amber-600/18 blur" aria-hidden="true" />
            <div className="relative rounded-[26px] border border-stone-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] backdrop-blur p-8">
              <h1 className="font-cerialebaran text-[28px] leading-tight text-heading">
                {isBangla ? 'নতুন পাসওয়ার্ড সেট করুন' : 'Set New Password'}
              </h1>
              <p className="mt-2 text-[13px] text-muted">
                {isBangla ? 'ইমেইলে পাঠানো কোড ও নতুন পাসওয়ার্ড দিন।' : 'Enter the code from your email and your new password.'}
              </p>

              <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
                {!emailParam && (
                  <div>
                    <label className="block text-[12px] font-medium text-body mb-2">{t.labelEmail}</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="name@email.com"
                      className="w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-3 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600/40" />
                  </div>
                )}

                <div>
                  <label className="block text-[12px] font-medium text-body mb-2">{isBangla ? 'রিসেট কোড' : 'Reset code'}</label>
                  <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} type="text" required maxLength={6} placeholder="000000"
                    className="w-full max-w-[200px] rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-3 text-[18px] tracking-[0.4em] text-heading dark:text-white text-center font-mono placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600/40" />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-body mb-2">{isBangla ? 'নতুন পাসওয়ার্ড' : 'New password'}</label>
                  <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" required placeholder="••••••••"
                    className="w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-3 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600/40" />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-body mb-2">{t.labelPassword2}</label>
                  <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" required placeholder="••••••••"
                    className="w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-3 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600/40" />
                </div>

                <button type="submit" disabled={loading}
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-emerald-900/30 disabled:opacity-60">
                  <span className="relative z-10">{loading ? '...' : (isBangla ? 'পাসওয়ার্ড রিসেট' : 'Reset Password')}</span>
                </button>
              </form>

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
