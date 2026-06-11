export function Card({ children, className = '', onClick, hover = false }) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-line rounded-[18px] p-5 transition-all duration-200
        ${hover || onClick ? 'hover:-translate-y-0.5 hover:shadow-card-lg cursor-pointer' : ''}
        ${className}`}
    >
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[#141A17]/45 backdrop-blur-sm" />
      <div
        className={`relative w-full ${sizes[size]} bg-surface border border-line rounded-3xl shadow-soft max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
          <h2 className="text-base font-extrabold tracking-[-0.01em] text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Lukk" className="text-muted-2 hover:text-ink transition-colors text-xl leading-none cursor-pointer w-8 h-8 flex items-center justify-center rounded-[10px] hover:bg-line-soft">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ children, color = 'default' }) {
  const colors = {
    default: 'bg-line-soft text-ink-2',
    green: 'bg-mint text-brand-ink',
    mint: 'bg-mint text-brand-ink',
    red: 'bg-danger/10 text-danger',
    yellow: 'bg-amber-bg text-amber',
    amber: 'bg-amber-bg text-amber',
    blue: 'bg-mint text-brand-ink',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-extrabold ${colors[color]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-[18px] bg-mint flex items-center justify-center text-brand mb-5">{icon}</div>
      <h3 className="text-lg font-extrabold tracking-[-0.02em] text-ink mb-2">{title}</h3>
      <p className="text-sm text-muted max-w-xs mb-6 leading-relaxed">{description}</p>
      {action}
    </div>
  );
}

export function StatCard({ label, value, sub, color = 'ink', icon }) {
  const colors = {
    green: 'text-brand-ink',
    mint: 'text-brand-ink',
    red: 'text-danger',
    yellow: 'text-amber',
    amber: 'text-amber',
    blue: 'text-brand-ink',
    white: 'text-ink',
    ink: 'text-ink',
  };
  const tileBg = color === 'yellow' || color === 'amber' ? 'bg-amber-bg text-amber' : 'bg-mint text-brand';
  return (
    <div className="bg-surface border border-line rounded-[18px] p-5">
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[12.5px] font-bold text-muted-2">{label}</span>
        {icon && <span className={`w-[34px] h-[34px] rounded-[11px] flex items-center justify-center ${tileBg}`}>{icon}</span>}
      </div>
      <div className={`text-[26px] font-extrabold tracking-[-0.02em] num ${colors[color]}`}>{value}</div>
      {sub && <div className="text-[12.5px] font-semibold text-muted-2 mt-1.5">{sub}</div>}
    </div>
  );
}
