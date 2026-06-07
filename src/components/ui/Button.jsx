export function Button({ children, onClick, variant = 'primary', size = 'md', className = '', disabled = false, type = 'button' }) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-sm';
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  };
  const variants = {
    primary: 'bg-[#16284A] text-white hover:bg-[#1E3A5F] active:bg-[#1E3A5F]',
    secondary: 'bg-[#E9E8E2] text-[#2A2D33] border border-[#DCDAD2] hover:bg-[#DCDAD2] hover:text-[#1A1B1E]',
    danger: 'bg-transparent text-[#DC2626] border border-[#DC2626]/20 hover:bg-[#DC2626]/8',
    ghost: 'text-[#4B4E54] hover:text-[#1A1B1E] hover:bg-black/[0.045]',
    amber: 'bg-[#B45309] text-[#F6F6F4] hover:bg-[#92400E]',
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
