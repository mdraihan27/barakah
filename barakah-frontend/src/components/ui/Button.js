import LoadingSpinner from '../common/LoadingSpinner';

const variants = {
  primary:
    'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-900/30 hover:shadow-emerald-500/20',
  secondary:
    'border border-stone-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] text-body hover:border-emerald-600/40 dark:hover:border-emerald-400/25',
  danger:
    'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-900/20 hover:shadow-red-500/20',
  ghost:
    'text-body hover:bg-stone-100 dark:hover:bg-white/[0.05]',
  gold:
    'border border-gold/30 text-gold hover:border-gold/60',
};

const sizes = {
  sm: 'px-4 py-2 text-[12px] rounded-lg',
  md: 'px-6 py-3 text-[14px] rounded-xl',
  lg: 'px-8 py-3.5 text-[14px] rounded-xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`group relative overflow-hidden font-semibold transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        variants[variant]
      } ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && <LoadingSpinner size="sm" />}
      <span className={loading ? 'opacity-70' : ''}>{children}</span>
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
      {variant === 'primary' && (
        <span className="relative z-10 flex items-center gap-2">
          {loading && <LoadingSpinner size="sm" />}
          {children}
        </span>
      )}
    </button>
  );
}
