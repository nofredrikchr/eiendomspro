export function Button({ children, onClick, variant = 'primary', size = 'md', className = '', disabled = false, type = 'button' }) {
  const base = 'inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'px-3.5 py-2 text-[13px]',
    md: 'px-[18px] py-2.5 text-sm',
    lg: 'px-6 py-3 text-[15px]',
  };
  const variants = {
    primary: 'bg-brand text-white shadow-brand hover:bg-brand-hover active:bg-brand-hover',
    secondary: 'bg-surface text-ink-2 border-[1.5px] border-line-input hover:border-brand hover:text-brand-ink',
    danger: 'bg-transparent text-danger border-[1.5px] border-danger/25 hover:bg-danger/[0.06]',
    ghost: 'text-muted hover:text-ink-2 hover:bg-line-soft',
    amber: 'bg-amber-bg text-amber border-[1.5px] border-amber-line hover:bg-[#F6E8C8]',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
