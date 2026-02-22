import { Link } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { useLanguage } from '../LanguageContext';

function HeaderLink({ to, href, children, className = '' }) {
  const baseClassName = `transition hover:text-emerald-700 dark:hover:text-emerald-300 ${className}`;

  if (to) {
    return (
      <Link to={to} className={baseClassName}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={baseClassName}>
      {children}
    </a>
  );
}

export default function SiteHeader({
  t,
  logoTo = '/',
  links = [],
  cta,
}) {
  const { isDark, toggleTheme } = useTheme();
  const { isBangla, toggleLanguage } = useLanguage();
  const logoUrl = `${process.env.PUBLIC_URL || ''}/logo.svg`;

  return (
    <header className="relative z-10 px-6 pt-7">
      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        <Link
          to={logoTo}
          className="logo-text inline-flex items-center"
          aria-label="Barakah"
        >
          <span className="sr-only">Barakah</span>
          <span
            aria-hidden="true"
            className="inline-block h-9 w-[52px] bg-gradient-to-r from-emerald-700 to-amber-600 dark:from-emerald-200 dark:to-gold"
            style={{
              WebkitMaskImage: `url(${logoUrl})`,
              maskImage: `url(${logoUrl})`,
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
            }}
          />
        </Link>

        <div className="flex items-center gap-6 text-[13px] text-body">
          {links.map((l) => (
            <HeaderLink
              key={l.to || l.href || l.label}
              to={l.to}
              href={l.href}
              className={l.hideOnMobile ? 'hidden sm:inline' : ''}
            >
              {l.label}
            </HeaderLink>
          ))}

          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gold hover:bg-gold/10 transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          <button
            onClick={toggleLanguage}
            className="text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full border border-stone-300/60 dark:border-white/[0.1] text-body hover:border-emerald-600 dark:hover:border-emerald-400/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            aria-label={isBangla ? 'Switch to English' : 'বাংলায় দেখুন'}
            title={isBangla ? 'Switch to English' : 'বাংলায় পড়ুন'}
          >
            {isBangla ? 'EN' : 'বাং'}
          </button>

          {cta && (
            <HeaderLink
              to={cta.to}
              href={cta.href}
              className="rounded-full border border-gold/30 px-5 py-1.5 font-medium text-gold transition hover:border-gold/60"
            >
              {cta.label}
            </HeaderLink>
          )}
        </div>
      </nav>
    </header>
  );
}
