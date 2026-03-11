import { useLanguage } from '../../LanguageContext';

/**
 * Wraps every page with consistent bg, ambient glows, and lang class.
 */
export default function PageShell({ children, className = '' }) {
  const { isBangla } = useLanguage();

  return (
    <div
      className={`min-h-screen flex flex-col bg-page text-body selection:bg-emerald-400/30 overflow-x-hidden geo-bg transition-colors duration-300${
        isBangla ? ' lang-bn' : ''
      } ${className}`}
    >
      {/* ambient glows */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-[-15%] left-[15%] h-[700px] w-[700px] rounded-full bg-emerald-200/30 dark:bg-emerald-700/[0.14] blur-[180px]" />
        <div className="absolute bottom-[0%] right-[5%] h-[500px] w-[500px] rounded-full bg-amber-200/20 dark:bg-gold/[0.045] blur-[140px]" />
      </div>
      {children}
    </div>
  );
}
