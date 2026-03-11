import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../context/AuthContext';
import { T } from '../translations';
import SiteHeader from '../components/SiteHeader';
import Footer from '../components/Footer';
import PageShell from '../components/common/PageShell';

function GoogleIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M21.805 10.023H12v3.955h5.615c-.244 1.272-.977 2.35-2.08 3.072v2.545h3.364c1.97-1.815 3.106-4.49 3.106-7.572 0-.67-.06-1.315-.17-1.956z" fill="#4285F4" />
      <path d="M12 22c2.835 0 5.215-.94 6.953-2.545l-3.364-2.545c-.934.626-2.13.995-3.59.995-2.73 0-5.04-1.845-5.87-4.324H2.65v2.674A9.997 9.997 0 0012 22z" fill="#34A853" />
      <path d="M6.13 13.58A6.01 6.01 0 015.815 12c0-.548.094-1.08.315-1.58V7.745H2.65A9.997 9.997 0 002 12c0 1.614.386 3.14 1.07 4.455l3.06-2.875z" fill="#FBBC05" />
      <path d="M12 6.095c1.54 0 2.923.53 4.01 1.57l3.01-3.01C17.21 2.94 14.835 2 12 2A9.997 9.997 0 002.65 7.745l3.48 2.675c.83-2.48 3.14-4.325 5.87-4.325z" fill="#EA4335" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { isBangla } = useLanguage();
  const { login, loading: authLoading, isAuthenticated } = useAuth();
  const t = useMemo(() => (isBangla ? T.bn : T.en), [isBangla]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(email, password);
      toast.success(isBangla ? 'সফলভাবে লগ ইন হয়েছে!' : 'Logged in successfully!');
      // If email is not verified, send user to verify page
      const userData = data?.user;
      if (userData && !userData.is_email_verified) {
        navigate(`/verify-email?email=${encodeURIComponent(userData.email || email)}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = process.env.REACT_APP_GOOGLE_OAUTH_URL;
  };

  return (
    <PageShell>
      <SiteHeader
        t={t}
        links={[
          { to: '/', label: t.navHome, hideOnMobile: true },
          { to: '/signup', label: t.navSignup, hideOnMobile: true },
        ]}
        cta={{ to: '/signup', label: t.navSignup }}
      />

      <main className="flex-1 px-6 pb-8 pt-10">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-10 items-center">
          <section className="hidden lg:block">
            <p className="text-[12px] uppercase tracking-[0.35em] text-emerald-700 dark:text-emerald-400 mb-5">{t.heroTag}</p>
            <h1 className="font-cerialebaran text-[clamp(2.4rem,4.8vw,4rem)] leading-[1.05] text-heading">{t.authLoginTitle}</h1>
            <p className="mt-5 text-[15px] leading-relaxed text-body max-w-md">{t.authLoginSubtitle}</p>
            <div className="mt-10 rounded-3xl border border-stone-200/70 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] backdrop-blur px-7 py-6">
              <p className="font-cerialebaran text-gold text-lg" dir="rtl">{t.loginAyah}</p>
              <p className="mt-2 text-[12px] text-muted italic">{t.loginAyahTranslation}</p>
            </div>
          </section>

          <section className="relative">
            <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-emerald-700/20 via-gold/15 to-amber-600/20 blur" aria-hidden="true" />
            <div className="relative rounded-[26px] border border-stone-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] backdrop-blur p-7 sm:p-8">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="font-cerialebaran text-[28px] leading-tight text-heading">{t.actionLogin}</h2>
                  <p className="mt-1 text-[13px] text-muted">{t.authLoginSubtitle}</p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
                  <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-white/[0.08]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/20" />
                </div>
              </div>

              <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-[12px] font-medium text-body mb-2">{t.labelEmail}</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="name@email.com"
                    className="w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-3 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600/40" />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-body mb-2">{t.labelPassword}</label>
                  <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="••••••••"
                    className="w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-3 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600/40" />
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 text-[12px] text-body select-none">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-emerald-600" />
                    {t.helperRemember}
                  </label>
                  <Link to="/forgot-password" className="text-[12px] text-muted hover:text-emerald-700 dark:hover:text-emerald-300 transition">{t.helperForgot}</Link>
                </div>

                <button type="submit" disabled={loading}
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:shadow-emerald-500/20 disabled:opacity-60">
                  <span className="relative z-10">{loading ? '...' : t.actionLogin}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-stone-200 dark:bg-white/[0.08]" />
                  <span className="text-[11px] text-muted">or</span>
                  <div className="h-px flex-1 bg-stone-200 dark:bg-white/[0.08]" />
                </div>

                <button type="button" onClick={handleGoogleLogin}
                  className="w-full rounded-xl border border-stone-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] px-4 py-3 text-[14px] font-medium text-body hover:border-emerald-600/40 dark:hover:border-emerald-400/25 transition flex items-center justify-center gap-3">
                  <GoogleIcon className="w-5 h-5" />
                  {t.actionGoogle}
                </button>

                <p className="pt-2 text-[13px] text-muted">
                  {t.helperNoAccount}{' '}
                  <Link to="/signup" className="text-emerald-700 dark:text-emerald-300 hover:underline">{t.navSignup}</Link>
                </p>
              </form>
            </div>
          </section>
        </div>
      </main>

      <Footer t={t} links={[{ to: '/', label: t.navHome }, { to: '/signup', label: t.navSignup }]} />
    </PageShell>
  );
}
