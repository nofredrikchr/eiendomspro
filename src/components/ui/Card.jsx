export function Card({ children, className = '', onClick, hover = false }) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-5 shadow-card transition-all duration-150
        ${hover || onClick ? 'hover:shadow-card-lg hover:border-[#DCDAD2] cursor-pointer' : ''}
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative w-full ${sizes[size]} bg-[#FFFFFF] border border-[#E9E8E2] rounded-2xl shadow-soft max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E9E8E2] shrink-0">
          <h2 className="text-base font-semibold text-[#1A1B1E]">{title}</h2>
          <button onClick={onClose} className="text-[#65696F] hover:text-[#1A1B1E] transition-colors text-xl leading-none cursor-pointer w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/[0.045]">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ children, color = 'default' }) {
  const colors = {
    default: 'bg-black/[0.045] text-[#4B4E54]',
    green: 'bg-[#15803D]/10 text-[#15803D]',
    red: 'bg-[#DC2626]/10 text-[#DC2626]',
    yellow: 'bg-[#B45309]/10 text-[#B45309]',
    blue: 'bg-[#2563EB]/10 text-[#2563EB]',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-4xl mb-5 opacity-20">{icon}</div>
      <h3 className="text-base font-semibold text-[#1A1B1E] mb-2">{title}</h3>
      <p className="text-sm text-[#65696F] max-w-xs mb-6 leading-relaxed">{description}</p>
      {action}
    </div>
  );
}

export function StatCard({ label, value, sub, color = 'green', icon }) {
  const colors = {
    green: 'text-[#15803D]',
    red: 'text-[#DC2626]',
    yellow: 'text-[#B45309]',
    blue: 'text-[#2563EB]',
    white: 'text-[#1A1B1E]',
  };
  return (
    <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-5 shadow-card">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-[#7A7D83] font-medium uppercase tracking-wider">{label}</span>
        {icon && <span className="text-[#AEB0B4]">{icon}</span>}
      </div>
      <div className={`text-2xl font-semibold num ${colors[color]}`}>{value}</div>
      {sub && <div className="text-xs text-[#7A7D83] mt-1.5">{sub}</div>}
    </div>
  );
}
