import { Home } from 'lucide-react';

/* ─── Foto med rolig plassholder ──────────────────────────────────────────────
   Bruker opplastet bilde når `src` finnes; ellers en varm farget flate med et
   dempet ikon. Ingen eksterne bilde-kall — plassholderen er ren CSS. */
export function Photo({ src, alt = '', className = '', icon, children }) {
  return (
    <div className={`relative overflow-hidden bg-[#E8E4DB] ${className}`}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" className="w-full h-full object-cover block" />
      ) : (
        <div className="foto-plassholder w-full h-full flex items-center justify-center text-[#B7BEA9]">
          {icon || <Home size={26} strokeWidth={1.75} />}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Liten ikon-flate (rundet firkant) ───────────────────────────────────── */
export function IconTile({ children, tone = 'mint', size = 34, radius = 11, className = '' }) {
  const tones = {
    mint: 'bg-mint text-brand',
    amber: 'bg-amber-bg text-amber',
    sand: 'bg-line-soft text-muted-2',
  };
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${tones[tone]} ${className}`}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {children}
    </span>
  );
}

/* ─── Status-pille ────────────────────────────────────────────────────────── */
export function Pill({ children, tone = 'neutral', className = '' }) {
  const tones = {
    mint: 'bg-mint text-brand-ink',
    amber: 'bg-amber-bg text-amber',
    neutral: 'bg-line-soft text-ink-2',
    muted: 'bg-line-soft text-muted',
    dark: 'bg-ink-2 text-white',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-extrabold ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

/* ─── Avatar med initialer ────────────────────────────────────────────────── */
export function Avatar({ navn = '', tone = 'mint', size = 36, className = '' }) {
  const initialer = navn
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((d) => d[0]?.toUpperCase())
    .join('') || '–';
  const tones = {
    mint: 'bg-mint text-brand-ink',
    amber: 'bg-amber-bg text-amber',
    sand: 'bg-line-soft text-muted-2',
  };
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-extrabold shrink-0 ${tones[tone]} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initialer}
    </span>
  );
}

/* ─── Sideoverskrift (tittel + undertittel + handlinger) ──────────────────── */
export function PageHeader({ tittel, undertittel, children, className = '' }) {
  return (
    <div className={`flex items-start gap-4 flex-wrap mb-6 ${className}`}>
      <div className="flex-1 min-w-[220px]">
        <h1 className="m-0 text-[clamp(24px,3vw,30px)] font-extrabold tracking-[-0.025em] text-ink">{tittel}</h1>
        {undertittel && <p className="mt-1.5 mb-0 text-[14.5px] font-medium text-muted">{undertittel}</p>}
      </div>
      {children && <div className="flex gap-2.5 flex-wrap">{children}</div>}
    </div>
  );
}

/* ─── Seksjonskort med tittel ─────────────────────────────────────────────── */
export function SectionCard({ tittel, action, children, className = '', bodyClassName = '' }) {
  return (
    <div className={`bg-surface border border-line rounded-[20px] p-[22px] ${className}`}>
      {(tittel || action) && (
        <div className="flex items-baseline justify-between gap-3 mb-4">
          {tittel && <h2 className="m-0 text-base font-extrabold tracking-[-0.01em] text-ink">{tittel}</h2>}
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

/* ─── Etikett/verdi-rad ───────────────────────────────────────────────────── */
export function DataRow({ label, value, valueClass = '', last = false }) {
  return (
    <div className={`flex justify-between gap-3 py-2.5 ${last ? '' : 'border-b border-line-soft'}`}>
      <span className="text-[13px] font-semibold text-muted-2">{label}</span>
      <span className={`text-[13.5px] font-extrabold text-ink num ${valueClass}`}>{value}</span>
    </div>
  );
}
