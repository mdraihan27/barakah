import './App.css';
import { useLanguage } from './LanguageContext';
import { Link } from 'react-router-dom';
import { T } from './translations';
import SiteHeader from './components/SiteHeader';
import Footer from './components/Footer';

function App() {
  const { isBangla } = useLanguage();
  const t = isBangla ? T.bn : T.en;

  /* ── inline SVG helpers ── */
  const IslamicStar = ({ className = '' }) => (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect x="22" y="22" width="56" height="56" rx="2" transform="rotate(0 50 50)"
        fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="22" y="22" width="56" height="56" rx="2" transform="rotate(45 50 50)"
        fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );

  const MihrabArch = ({ className = '' }) => (
    <svg viewBox="0 0 400 60" className={className} preserveAspectRatio="none" aria-hidden="true">
      <path d="M0,60 L0,30 Q0,0 200,0 Q400,0 400,30 L400,60"
        fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );

  const StarRating = ({ filled = 5, total = 5 }) => (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < filled ? 'text-gold' : 'text-stone-200 dark:text-white/10'}`}
          viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );

  /* ── tasbih bead section divider ── */
  const BeadDivider = () => (
    <div className="flex items-center justify-center gap-2.5 py-4">
      <span className="block w-1 h-1 rounded-full bg-stone-300 dark:bg-white/[0.08]" />
      <span className="block w-1.5 h-1.5 rounded-full bg-emerald-500/25 dark:bg-emerald-400/[0.12]" />
      <IslamicStar className="w-3.5 h-3.5 text-gold/30" />
      <span className="block w-1.5 h-1.5 rounded-full bg-emerald-500/25 dark:bg-emerald-400/[0.12]" />
      <span className="block w-1 h-1 rounded-full bg-stone-300 dark:bg-white/[0.08]" />
    </div>
  );

  /* ────────────────────────────── JSX ────────────────────────────── */
  return (
    <div className={`min-h-screen bg-page text-body selection:bg-emerald-400/30 overflow-x-hidden geo-bg transition-colors duration-300${isBangla ? ' lang-bn' : ''}`}>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="relative isolate min-h-screen flex flex-col">
        {/* ambient glows */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-[-15%] left-[15%] h-[700px] w-[700px] rounded-full bg-emerald-200/30 dark:bg-emerald-700/[0.14] blur-[180px]" />
          <div className="absolute bottom-[0%] right-[5%] h-[500px] w-[500px] rounded-full bg-amber-200/20 dark:bg-gold/[0.045] blur-[140px]" />
        </div>

        {/* floating crescent moon */}
        <svg className="absolute top-24 right-[8%] w-36 h-36 text-emerald-700/10 dark:text-emerald-400/[0.07] animate-float hidden sm:block"
          viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <mask id="crescentHero">
              <rect width="100" height="100" fill="black" />
              <circle cx="50" cy="50" r="40" fill="white" />
              <circle cx="65" cy="40" r="33" fill="black" />
            </mask>
          </defs>
          <circle cx="50" cy="50" r="40" fill="currentColor" mask="url(#crescentHero)" />
        </svg>

        {/* floating geometric stars */}
        <IslamicStar className="absolute top-44 left-[6%] w-16 h-16 text-emerald-600/[0.08] dark:text-emerald-500/[0.06] animate-spin-slow hidden sm:block" />
        <IslamicStar className="absolute bottom-40 right-[12%] w-10 h-10 text-gold/10 dark:text-gold/[0.07] animate-spin-slow-r hidden sm:block" />
        <IslamicStar className="absolute top-[65%] left-[3%] w-7 h-7 text-emerald-600/[0.06] dark:text-emerald-400/[0.05] animate-spin-slow hidden lg:block" />

        {/* navbar */}
        <SiteHeader
          t={t}
          logoTo="/"
          links={[
            { href: '#paths', label: t.navFeatures, hideOnMobile: true },
            { href: '#prices', label: t.navPrices, hideOnMobile: true },
            { href: '#community', label: t.navCommunity, hideOnMobile: true },
            { to: '/login', label: t.navLogin, hideOnMobile: true },
          ]}
          cta={{ href: '#join', label: t.navCta }}
        />

        {/* hero content */}
        <div id="top" className="relative z-10 flex-1 flex items-center justify-center px-6">
          <div className="max-w-3xl text-center">
            {/* Bismillah */}
            {/* <p className="font-cerialebaran text-gold text-2xl mb-8 tracking-wider select-none"
              dir="rtl">
              {t.bismillah}
            </p> */}

            <p className="text-[12px] uppercase tracking-[0.35em] text-emerald-700 dark:text-emerald-400 mb-5">
              {t.heroTag}
            </p>

            <h1 className="font-cerialebaran text-[clamp(2.6rem,7.5vw,5.8rem)] leading-[1.02]">
              <span className="block text-heading">
                {t.heroH1a}
              </span>
              <span className="block bg-gradient-to-r from-emerald-700 via-emerald-600 to-amber-600 dark:from-emerald-300 dark:via-emerald-200 dark:to-gold bg-clip-text text-transparent">
                {t.heroH1b}
              </span>
            </h1>

            <p className="mx-auto mt-8 max-w-lg text-[15px] leading-relaxed text-body">
              {t.heroDesc}
            </p>

            <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
              <a href="#paths"
                className="group relative overflow-hidden rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:shadow-emerald-500/20">
                <span className="relative z-10">{t.heroCta1}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
              <a href="#paths"
                className="rounded-full border border-stone-300 dark:border-white/10 px-8 py-3.5 text-[14px] font-medium text-body backdrop-blur transition hover:border-emerald-600 dark:hover:border-emerald-400/25 hover:text-emerald-700 dark:hover:text-emerald-200">
                {t.heroCta2}
              </a>
            </div>
          </div>
        </div>

        {/* scroll indicator */}
        <div className="flex justify-center pb-10">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted">{t.scroll}</span>
            <div className="w-px h-10 bg-gradient-to-b from-emerald-500/40 dark:from-emerald-400/40 to-transparent animate-pulse" />
          </div>
        </div>
      </section>

      {/* thin line */}
      <div className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-stone-300 dark:via-white/[0.06] to-transparent" />

      <BeadDivider />

      {/* ═══════════════════════ DUAL PATHS ═══════════════════════ */}
      <section id="paths" className="relative py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-12">
            <p className="text-[12px] uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-400 mb-4">
              {t.pathsTag}
            </p>
            <h2 className="font-cerialebaran text-[clamp(1.8rem,4.5vw,3rem)] text-heading">
              {t.pathsH2}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ── shop owner path ── */}
            <div className="relative group">
              <MihrabArch className="w-full text-emerald-600/15 dark:text-emerald-400/[0.08] group-hover:text-emerald-600/30 dark:group-hover:text-emerald-400/[0.18] transition-colors duration-700" />
              <div className="absolute top-[56px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-500/30 group-hover:bg-emerald-500/60 transition-colors" />

              <div className="border border-stone-200 dark:border-white/[0.05] border-t-0 rounded-b-2xl bg-gradient-to-b from-emerald-50/60 dark:from-emerald-900/[0.06] to-transparent p-8 pt-6 shadow-sm dark:shadow-none transition-all duration-500 group-hover:border-emerald-300 dark:group-hover:border-emerald-400/[0.12]">
                <div className="flex items-center gap-3 mb-8">
                  <IslamicStar className="w-5 h-5 text-emerald-600/50 dark:text-emerald-400/50" />
                  <h3 className="text-xl font-semibold text-emerald-800 dark:text-emerald-200">{t.pathsOwnerH3}</h3>
                </div>
                <div className="space-y-6">
                  {t.ownerFeatures.map((f) => (
                    <div key={f.num} className="flex gap-4">
                      <span className="mt-1 text-[11px] tabular-nums text-gold font-mono">{f.num}</span>
                      <div>
                        <h4 className="text-[15px] font-medium text-heading">{f.title}</h4>
                        <p className="mt-1 text-[13px] leading-relaxed text-body">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── shopper path ── */}
            <div className="relative group">
              <MihrabArch className="w-full text-amber-500/15 dark:text-gold/[0.08] group-hover:text-amber-500/30 dark:group-hover:text-gold/[0.18] transition-colors duration-700" />
              <div className="absolute top-[56px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gold/30 group-hover:bg-gold/60 transition-colors" />

              <div className="border border-stone-200 dark:border-white/[0.05] border-t-0 rounded-b-2xl bg-gradient-to-b from-amber-50/60 dark:from-gold/[0.03] to-transparent p-8 pt-6 shadow-sm dark:shadow-none transition-all duration-500 group-hover:border-amber-300 dark:group-hover:border-gold/[0.12]">
                <div className="flex items-center gap-3 mb-8">
                  <IslamicStar className="w-5 h-5 text-amber-600/50 dark:text-gold/50" />
                  <h3 className="text-xl font-semibold text-amber-800 dark:text-gold">{t.pathsShopperH3}</h3>
                </div>
                <div className="space-y-6">
                  {t.shopperFeatures.map((f) => (
                    <div key={f.num} className="flex gap-4">
                      <span className="mt-1 text-[11px] tabular-nums text-emerald-700 dark:text-emerald-400 font-mono">{f.num}</span>
                      <div>
                        <h4 className="text-[15px] font-medium text-heading">{f.title}</h4>
                        <p className="mt-1 text-[13px] leading-relaxed text-body">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BeadDivider />

      {/* decorative arch divider */}
      <div className="mx-auto max-w-xs">
        <svg viewBox="0 0 200 30" className="w-full text-stone-300 dark:text-white/[0.04]" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,30 Q0,0 100,0 Q200,0 200,30" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </svg>
      </div>

      {/* ═══════════════════════ PRICE INTELLIGENCE ═══════════════════════ */}
      <section id="prices" className="relative py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* mock notification card */}
            <div className="relative order-2 lg:order-1 flex justify-center">
              <div className="relative w-[320px]">
                {/* glow */}
                <div className="absolute inset-0 bg-emerald-200/30 dark:bg-emerald-500/[0.08] rounded-3xl blur-xl" />

                <div className="relative rounded-2xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-[#0a1a0f]/90 backdrop-blur-xl p-6 shadow-xl shadow-stone-200/50 dark:shadow-2xl dark:shadow-black/20">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{t.alertLabel}</span>
                  </div>

                  {/* alert card 1 */}
                  <div className="rounded-xl bg-emerald-50/60 dark:bg-white/[0.03] border border-emerald-100/60 dark:border-white/[0.05] p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-heading">{t.item1Name}</p>
                        <p className="text-[11px] text-muted mt-0.5">{t.item1Shop}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[15px] font-semibold text-emerald-600 dark:text-emerald-400">{t.item1Price}</p>
                        <p className="text-[11px] text-muted line-through">{t.item1Was}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1 flex-1 rounded-full bg-stone-200 dark:bg-white/[0.05] overflow-hidden">
                        <div className="h-full w-[23%] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
                      </div>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{t.item1Pct}</span>
                    </div>
                  </div>

                  {/* alert card 2 */}
                  <div className="rounded-xl bg-amber-50/60 dark:bg-white/[0.03] border border-amber-100/60 dark:border-white/[0.05] p-4 mt-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-heading">{t.item2Name}</p>
                        <p className="text-[11px] text-muted mt-0.5">{t.item2Shop}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[15px] font-semibold text-gold">{t.item2Price}</p>
                        <p className="text-[11px] text-muted line-through">{t.item2Was}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1 flex-1 rounded-full bg-stone-200 dark:bg-white/[0.05] overflow-hidden">
                        <div className="h-full w-[16%] rounded-full bg-gradient-to-r from-gold to-gold-light" />
                      </div>
                      <span className="text-[10px] text-gold whitespace-nowrap">{t.item2Pct}</span>
                    </div>
                  </div>

                  <button className="mt-4 w-full rounded-xl bg-emerald-50 dark:bg-emerald-500/[0.08] border border-emerald-200 dark:border-emerald-400/[0.15] py-2.5 text-[12px] font-medium text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-100 dark:hover:bg-emerald-500/[0.15]">
                    {t.viewAlerts}
                  </button>
                </div>

                <IslamicStar className="absolute -top-3 -right-3 w-6 h-6 text-gold/20" />
              </div>
            </div>

            {/* text */}
            <div className="order-1 lg:order-2">
              <p className="text-[12px] uppercase tracking-[0.3em] text-gold mb-4">{t.pricesTag}</p>
              <h2 className="font-cerialebaran text-[clamp(1.8rem,4vw,2.8rem)] leading-tight text-heading">
                {t.pricesH2}
              </h2>
              <p className="mt-6 text-[15px] leading-relaxed text-body">
                {t.pricesDesc1}
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-body">
                {t.pricesDesc2}
              </p>
            </div>
          </div>
        </div>
      </section>

      <BeadDivider />

      {/* ═══════════════════════ COMMUNITY ═══════════════════════ */}
      <section id="community" className="relative py-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-100/40 dark:bg-emerald-600/[0.04] blur-[120px]" />
        </div>

        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-12">
            <IslamicStar className="w-6 h-6 text-emerald-600/20 dark:text-emerald-400/[0.15] mx-auto mb-4" />
            <h2 className="font-cerialebaran text-[clamp(1.8rem,4.5vw,3rem)] text-heading">
              {t.communityH2}
            </h2>
            <p className="mt-4 max-w-lg mx-auto text-[15px] text-body">
              {t.communityDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ── review mock ── */}
            <div className="rounded-2xl border border-stone-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.02] p-6 shadow-sm dark:shadow-none transition-all duration-500 hover:shadow-md hover:border-stone-300 dark:hover:border-white/[0.1] dark:hover:bg-white/[0.035]">
              <div className="flex items-center gap-2 mb-4">
                <StarRating filled={4} />
                <span className="text-[12px] text-muted ml-1">4.0</span>
              </div>
              <p className="text-[14px] leading-relaxed text-body italic">
                {t.reviewText}
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-[11px] text-emerald-700 dark:text-emerald-300 font-medium select-none">
                  A
                </div>
                <div>
                  <p className="text-[12px] text-heading">{t.reviewAuthor}</p>
                  <p className="text-[10px] text-muted">{t.reviewTime}</p>
                </div>
              </div>
            </div>

            {/* ── chat mock ── */}
            <div className="rounded-2xl border border-stone-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.02] p-6 shadow-sm dark:shadow-none transition-all duration-500 hover:shadow-md hover:border-stone-300 dark:hover:border-white/[0.1] dark:hover:bg-white/[0.035]">
              {/* chat header */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-200 dark:border-white/[0.05]">
                <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-gold/20 flex items-center justify-center text-[11px] text-amber-700 dark:text-gold font-medium select-none">
                  M
                </div>
                <div>
                  <p className="text-[12px] text-heading font-medium">{t.chatShopName}</p>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400">{t.chatOnline}</p>
                </div>
              </div>
              {/* messages */}
              <div className="space-y-3">
                <div className="flex justify-start">
                  <div className="max-w-[78%] rounded-2xl rounded-tl-sm bg-stone-100 dark:bg-white/[0.04] px-4 py-2.5">
                    <p className="text-[13px] text-body">{t.chatMsg1}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-emerald-50 dark:bg-emerald-500/[0.12] px-4 py-2.5">
                    <p className="text-[13px] text-emerald-800 dark:text-emerald-200">{t.chatMsg2}</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[78%] rounded-2xl rounded-tl-sm bg-stone-100 dark:bg-white/[0.04] px-4 py-2.5">
                    <p className="text-[13px] text-body">{t.chatMsg3}</p>
                  </div>
                </div>
              </div>
              {/* input */}
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 rounded-full bg-stone-50 dark:bg-white/[0.025] border border-stone-200 dark:border-white/[0.05] px-4 py-2">
                  <span className="text-[12px] text-muted">{t.chatPlaceholder}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/[0.12] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* thin line */}
      <div className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-stone-300 dark:via-white/[0.06] to-transparent" />

      {/* ═══════════════════════ CTA ═══════════════════════ */}
      <section id="join" className="relative py-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-100/40 dark:bg-emerald-700/[0.07] blur-[160px]" />
        </div>

        {/* large background crescent */}
        <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] text-emerald-700/[0.04] dark:text-emerald-400/[0.025]"
          viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <mask id="crescentCta">
              <rect width="100" height="100" fill="black" />
              <circle cx="50" cy="50" r="45" fill="white" />
              <circle cx="65" cy="40" r="37" fill="black" />
            </mask>
          </defs>
          <circle cx="50" cy="50" r="45" fill="currentColor" mask="url(#crescentCta)" />
        </svg>

        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <p className="font-cerialebaran text-gold text-xl mb-5" dir="rtl">
            {t.ayah}
          </p>
          <p className="text-[11px] text-muted mb-12 italic">
            {t.ayahTranslation}
          </p>

          <h2 className="font-cerialebaran text-[clamp(2rem,5vw,3.5rem)] leading-tight text-heading">
            {t.ctaH2}
          </h2>
          <p className="mt-5 text-[15px] text-body max-w-md mx-auto">
            {t.ctaDesc}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/signup"
              className="group relative overflow-hidden rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:shadow-emerald-500/20"
            >
              <span className="relative z-10">{t.ctaBtn1}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
            <Link
              to="/login"
              className="rounded-full border border-gold/30 px-8 py-3.5 text-[14px] font-medium text-gold transition hover:border-gold/60"
            >
              {t.ctaBtn2}
            </Link>
          </div>
        </div>
      </section>

      <Footer
        t={t}
        links={[
          { href: '#top', label: t.footerTop },
          { href: '#paths', label: t.footerFeatures },
          { href: '#prices', label: t.footerPrices },
          { href: '#community', label: t.footerCommunity },
        ]}
      />
    </div>
  );
}

export default App;
