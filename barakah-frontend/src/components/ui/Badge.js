const colorMap = {
  emerald: 'bg-emerald-50 dark:bg-emerald-500/[0.10] text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-500/20',
  gold: 'bg-amber-50 dark:bg-gold/10 text-amber-700 dark:text-gold border-amber-200/50 dark:border-gold/20',
  red: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200/50 dark:border-red-500/20',
  gray: 'bg-stone-100 dark:bg-white/[0.05] text-stone-600 dark:text-stone-300 border-stone-200/50 dark:border-white/[0.08]',
  blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-500/20',
};

export default function Badge({ children, color = 'emerald', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${colorMap[color]} ${className}`}
    >
      {children}
    </span>
  );
}
