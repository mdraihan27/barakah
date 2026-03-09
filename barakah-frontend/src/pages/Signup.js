import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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

function RoleCard({ selected, title, desc, icon, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`relative text-left rounded-2xl border px-5 py-4 transition backdrop-blur focus:outline-none ${
        selected
          ? 'border-emerald-600/40 dark:border-emerald-400/35 bg-emerald-50/70 dark:bg-emerald-500/[0.10]'
          : 'border-stone-200/70 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] hover:border-emerald-600/25 dark:hover:border-emerald-400/20'
      }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          selected ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-200' : 'bg-amber-100 dark:bg-gold/20 text-amber-700 dark:text-gold'
        }`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-heading">{title}</p>
          <p className="mt-1 text-[12px] text-muted leading-relaxed">{desc}</p>
        </div>
      </div>
      {selected && (
        <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.42 0l-3.6-3.6a1 1 0 111.42-1.42l2.89 2.89 6.49-6.49a1 1 0 011.42 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </button>
  );
}

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isBangla } = useLanguage();
  const { signup } = useAuth();
  const t = useMemo(() => (isBangla ? T.bn : T.en), [isBangla]);

  const initialRole = (() => {
    const q = (searchParams.get('role') || '').toLowerCase();
    if (q === 'owner' || q === 'shop_owner' || q === 'seller') return 'owner';
    return 'consumer';
  })();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [role, setRole] = useState(initialRole);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== password2) {
      toast.error(isBangla ? 'পাসওয়ার্ড মিলছে না' : 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error(isBangla ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে' : 'Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await signup({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        is_shop_owner: role === 'owner',
      });
      toast.success(isBangla ? 'অ্যাকাউন্ট তৈরি হয়েছে!' : 'Account created!');
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = process.env.REACT_APP_GOOGLE_OAUTH_URL;
  };

  return (
    <PageShell>
      <SiteHeader
        t={t}
        links={[
          { to: '/', label: t.navHome, hideOnMobile: true },
          { to: '/login', label: t.navLogin, hideOnMobile: true },
        ]}
        cta={{ to: '/login', label: t.navLogin }}
      />

      <main className="px-6 pb-8 pt-10">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-10 items-start">
          <section className="hidden lg:block pt-4">
            <p className="text-[12px] uppercase tracking-[0.35em] text-emerald-700 dark:text-emerald-400 mb-5">{t.pathsTag}</p>
            <h1 className="font-cerialebaran text-[clamp(2.4rem,4.8vw,4rem)] leading-[1.05] text-heading">{t.authSignupTitle}</h1>
            <p className="mt-5 text-[15px] leading-relaxed text-body max-w-md">{t.authSignupSubtitle}</p>
            <div className="mt-10 grid gap-3">
              <div className="rounded-3xl border border-stone-200/70 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] backdrop-blur px-7 py-6">
                <p className="text-[12px] text-muted mb-1">{t.roleTitle}</p>
                <p className="text-[14px] text-body leading-relaxed">{role === 'owner' ? t.roleOwnerDesc : t.roleConsumerDesc}</p>
              </div>
              <div className="rounded-3xl border border-stone-200/70 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] backdrop-blur px-7 py-6">
                <p className="font-cerialebaran text-gold text-lg" dir="rtl">{t.ayah}</p>
                <p className="mt-2 text-[12px] text-muted italic">{t.ayahTranslation}</p>
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-emerald-700/18 via-gold/12 to-amber-600/18 blur" aria-hidden="true" />
            <div className="relative rounded-[26px] border border-stone-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] backdrop-blur p-7 sm:p-8">
              <h2 className="font-cerialebaran text-[28px] leading-tight text-heading">{t.actionSignup}</h2>
              <p className="mt-1 text-[13px] text-muted">{t.authSignupSubtitle}</p>

              <div className="mt-7">
                <p className="text-[12px] font-medium text-body mb-3">{t.roleTitle}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <RoleCard selected={role === 'owner'} title={t.roleOwnerTitle} desc={t.roleOwnerDesc} onClick={() => setRole('owner')}
                    icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4v13a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" /></svg>} />
                  <RoleCard selected={role === 'consumer'} title={t.roleConsumerTitle} desc={t.roleConsumerDesc} onClick={() => setRole('consumer')}
                    icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
                </div>
              </div>

              <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-body mb-2">{isBangla ? 'নামের প্রথম অংশ' : 'First name'}</label>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} type="text" required placeholder={isBangla ? 'প্রথম নাম' : 'First name'}
                      className="w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-3 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600/40" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-body mb-2">{isBangla ? 'নামের শেষ অংশ' : 'Last name'}</label>
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} type="text" required placeholder={isBangla ? 'শেষ নাম' : 'Last name'}
                      className="w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-3 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600/40" />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-body mb-2">{t.labelEmail}</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="name@email.com"
                    className="w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-3 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600/40" />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-body mb-2">{t.labelPassword}</label>
                    <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="••••••••"
                      className="w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-3 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600/40" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-body mb-2">{t.labelPassword2}</label>
                    <input value={password2} onChange={(e) => setPassword2(e.target.value)} type="password" required placeholder="••••••••"
                      className="w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-3 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600/40" />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:shadow-emerald-500/20 disabled:opacity-60">
                  <span className="relative z-10">{loading ? '...' : t.actionSignup}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-stone-200 dark:bg-white/[0.08]" />
                  <span className="text-[11px] text-muted">or</span>
                  <div className="h-px flex-1 bg-stone-200 dark:bg-white/[0.08]" />
                </div>

                <button type="button" onClick={handleGoogleSignup}
                  className="w-full rounded-xl border border-stone-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] px-4 py-3 text-[14px] font-medium text-body hover:border-emerald-600/40 dark:hover:border-emerald-400/25 transition flex items-center justify-center gap-3">
                  <GoogleIcon className="w-5 h-5" />
                  {t.actionGoogle}
                </button>

                <p className="pt-2 text-[13px] text-muted">
                  {t.helperHaveAccount}{' '}
                  <Link to="/login" className="text-emerald-700 dark:text-emerald-300 hover:underline">{t.navLogin}</Link>
                </p>
              </form>
            </div>
          </section>
        </div>
      </main>

      <Footer t={t} links={[{ to: '/', label: t.navHome }, { to: '/login', label: t.navLogin }]} />
    </PageShell>
  );
}
