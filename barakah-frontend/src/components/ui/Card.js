export default function Card({ children, className = '', hover = true, ...rest }) {
  return (
    <div
      className={`rounded-2xl border border-stone-200/70 dark:border-white/[0.06] bg-white/70 dark:bg-white/[0.02] backdrop-blur shadow-sm dark:shadow-none ${
        hover
          ? 'transition-all duration-300 hover:shadow-md hover:border-stone-300 dark:hover:border-white/[0.1] dark:hover:bg-white/[0.035]'
          : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-b border-stone-200/50 dark:border-white/[0.05] ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>;
}
