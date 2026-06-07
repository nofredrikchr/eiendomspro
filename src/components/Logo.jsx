/**
 * EiendomsPRO logo-komponent.
 * variant="light"  → hvit ikon + hvit "Eiendoms" + gull "PRO"  (for mørk bakgrunn)
 * variant="dark"   → navy ikon + navy "Eiendoms" + gull "PRO"  (for lys bakgrunn)
 */
export function Logo({ variant = 'light', height = 28, className = '' }) {
  const isLight = variant === 'light';
  const ikon  = isLight ? '#ffffff' : '#162840';
  const gull  = '#9A7A24';
  const tekst = isLight ? '#ffffff' : '#162840';

  // Ikonet er proporsjonalt: viewBox 28×28, h kontrolleres via height-prop
  const ikonH = height;
  const ikonW = ikonH; // kvadrat
  const fontSize = height * 0.5;
  const fontSizeNo = height * 0.32;

  return (
    <div className={`flex items-center gap-2 ${className}`} style={{ height }}>
      {/* Ikon — inline SVG, alltid transparent bakgrunn */}
      <svg
        width={ikonW}
        height={ikonH}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Huskontur */}
        <polyline
          points="2,16 14,4 26,16"
          stroke={ikon}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <line x1="2" y1="16" x2="2" y2="27" stroke={ikon} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="2" y1="27" x2="12" y2="27" stroke={ikon} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="26" y1="16" x2="26" y2="27" stroke={ikon} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="14" y1="27" x2="26" y2="27" stroke={ikon} strokeWidth="2.2" strokeLinecap="round" />
        {/* Søylediagram i gull */}
        <rect x="11" y="21" width="3" height="6" rx="0.5" fill={gull} />
        <rect x="15" y="17" width="3" height="10" rx="0.5" fill={gull} />
        <rect x="19" y="13" width="3" height="14" rx="0.5" fill={gull} />
      </svg>

      {/* Ordmerke */}
      <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1 }}>
        <span style={{ color: tekst }}>Eiendoms</span>
        <span style={{ color: gull, fontWeight: 700 }}>PRO</span>
        <span style={{ color: gull, fontSize: fontSizeNo, fontWeight: 500 }}>.no</span>
      </span>
    </div>
  );
}
