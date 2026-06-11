/**
 * EiendomsPRO ordmerke (redesign 2026).
 * Frisk teal-flate med et lite, rundet hus-glyf + ordmerket «eiendoms<pro>».
 *
 * variant="dark"  → blekk-tekst (for lyst lerret) — standard i app/sidebar
 * variant="light" → hvit tekst (for mørk/teal bakgrunn)
 *
 * `height` styrer hele merket proporsjonalt (ikon-firkanten = height).
 */
export function Logo({ variant = 'dark', height = 32, className = '' }) {
  const lys = variant === 'light';
  const tekst = lys ? '#FFFFFF' : '#212724';
  const pro = lys ? '#FFFFFF' : '#0E9384';

  const boks = height;
  const radius = Math.round(height * 0.3);
  const ikon = Math.round(height * 0.54);
  const fontSize = Math.round(height * 0.55);

  return (
    <div className={`flex items-center gap-2.5 ${className}`} style={{ height }}>
      <div
        style={{
          width: boks, height: boks, borderRadius: radius, background: '#0E9384',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <svg width={ikon} height={ikon} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
      <span style={{ fontSize, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, color: tekst }}>
        eiendoms<span style={{ color: pro }}>pro</span>
      </span>
    </div>
  );
}
