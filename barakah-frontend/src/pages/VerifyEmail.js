import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { T } from '../translations';
import SiteHeader from '../components/SiteHeader';
import Footer from '../components/Footer';

export default function VerifyEmail() {
  const { isBangla } = useLanguage();
  const t = useMemo(() => (isBangla ? T.bn : T.en), [isBangla]);

  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const [sentCount, setSentCount] = useState(1);

  const shellClassName = `min-h-screen bg-page text-body overflow-x-hidden geo-bg transition-colors duration-300${isBangla ? ' lang-bn' : ''}`;

  return (
    <div className={shellClassName}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-18%] left-[10%] h-[760px] w-[760px] rounded-full bg-emerald-200/25 dark:bg-emerald-700/[0.12] blur-[190px]" />
        <div className="absolute bottom-[-5%] right-[0%] h-[520px] w-[520px] rounded-full bg-amber-200/20 dark:bg-gold/[0.045] blur-[150px]" />
      </div>

      <SiteHeader
        t={t}
        links={[
          { to: '/', label: t.navHome, hideOnMobile: true },
          { to: '/login', label: t.navLogin, hideOnMobile: true },
          { to: '/signup', label: t.navSignup, hideOnMobile: true },
        ]}
      />

      <main className="px-6 pt-12 pb-10">
        <div className="mx-auto max-w-3xl">
          <div className="relative">
            <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-emerald-700/18 via-gold/12 to-amber-600/18 blur" aria-hidden="true" />

            <div className="relative rounded-[26px] border border-stone-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] backdrop-blur p-8 sm:p-10">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h1 className="font-cerialebaran text-[32px] leading-tight text-heading">{t.authVerifyTitle}</h1>
                  <p className="mt-2 text-[14px] text-body max-w-xl leading-relaxed">{t.authVerifySubtitle}</p>
                  {email ? (
                    <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-stone-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] px-4 py-1.5 text-[12px] text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/35" />
                      {t.verifySentTo(email)}
                    </p>
                  ) : null}
                </div>

                <div className="hidden sm:flex h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/[0.12] border border-emerald-600/10 dark:border-emerald-400/10 items-center justify-center">
                  <svg className="w-7 h-7 text-emerald-700 dark:text-emerald-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4V4z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8 6 8-6" />
                  </svg>
                </div>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSentCount((c) => c + 1)}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:shadow-emerald-500/20"
                >
                  <span className="relative z-10">{t.actionResend}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>

                <Link
                  to="/signup"
                  className="rounded-xl border border-stone-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] px-6 py-3.5 text-[14px] font-medium text-body hover:border-emerald-600/40 dark:hover:border-emerald-400/25 transition flex items-center justify-center"
                >
                  {t.actionChangeEmail}
                </Link>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-[12px] text-muted">
                  {sentCount > 1 ? (isBangla ? `পাঠানো হয়েছে ${sentCount} বার` : `Sent ${sentCount} times`) : null}
                </p>

                <Link
                  to="/login"
                  className="text-[13px] text-emerald-700 dark:text-emerald-300 hover:underline"
                >
                  {t.actionBackToLogin}
                </Link>
              </div>

              <div className="mt-10 rounded-3xl border border-stone-200/70 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] backdrop-blur px-7 py-6">
                <p className="font-cerialebaran text-gold text-lg" dir="rtl">
                  {t.ayah}
                </p>
                <p className="mt-2 text-[12px] text-muted italic">{t.ayahTranslation}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer
        t={t}
        links={[
          { to: '/', label: t.navHome },
          { to: '/login', label: t.navLogin },
          { to: '/signup', label: t.navSignup },
        ]}
      />
    </div>
  );
}
