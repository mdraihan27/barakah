/**
 * Reusable text input component following the project's design system.
 */
export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  className = '',
  ...rest
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-[12px] font-medium text-body mb-2">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border px-4 py-3 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600/40 transition ${
          error
            ? 'border-red-400 dark:border-red-500/50'
            : 'border-stone-200/70 dark:border-white/[0.08]'
        }`}
        {...rest}
      />
      {error && (
        <p className="mt-1.5 text-[11px] text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 4,
  error,
  className = '',
  ...rest
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-[12px] font-medium text-body mb-2">
          {label}
        </label>
      )}
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        className={`w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border px-4 py-3 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600/40 transition resize-none ${
          error
            ? 'border-red-400 dark:border-red-500/50'
            : 'border-stone-200/70 dark:border-white/[0.08]'
        }`}
        {...rest}
      />
      {error && (
        <p className="mt-1.5 text-[11px] text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
