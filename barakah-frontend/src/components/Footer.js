import { Link } from 'react-router-dom';

function StarIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect
        x="22"
        y="22"
        width="56"
        height="56"
        rx="2"
        transform="rotate(0 50 50)"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="22"
        y="22"
        width="56"
        height="56"
        rx="2"
        transform="rotate(45 50 50)"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function FooterLink({ to, href, children, className = '' }) {
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

export default function Footer({ t, links = [] }) {
  return (
    <>
      <div className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-stone-300 dark:via-white/[0.06] to-transparent" />

      <footer className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-cerialebaran text-lg bg-gradient-to-r from-emerald-700 to-amber-600 dark:from-emerald-200 dark:to-gold bg-clip-text text-transparent">
              Barakah
            </div>
            <p className="mt-1 text-[13px] text-muted">{t.footerTagline}</p>
          </div>

          {links.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-body">
              {links.map((l) => (
                <FooterLink key={l.to || l.href || l.label} to={l.to} href={l.href}>
                  {l.label}
                </FooterLink>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <p className="text-[11px] text-muted">{t.footerCopyright(new Date().getFullYear())}</p>
          <StarIcon className="w-4 h-4 text-muted/30" />
        </div>
      </footer>
    </>
  );
}
