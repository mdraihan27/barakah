/**
 * Reusable styled <select> component matching the project design system.
 * Uses a solid background (not transparent) so the native option popup
 * inherits the right color in all browsers.
 */
export default function Select({
  label,
  value,
  onChange,
  children,
  className = '',
  disabled = false,
  ...rest
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-[12px] font-medium text-body mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="
            w-full appearance-none rounded-xl
            bg-[#f5f2eb] dark:bg-[#0d1a10]
            border border-stone-200/70 dark:border-white/[0.08]
            px-4 py-2.5 pr-9
            text-[14px] text-heading dark:text-white
            focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600/40
            disabled:opacity-50 disabled:cursor-not-allowed
            transition
          "
          {...rest}
        >
          {children}
        </select>
        {/* custom chevron */}
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
    </div>
  );
}
