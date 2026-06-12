# EiendomsPRO — designsystem (redesign 2026)

«Varmt & friskt» — Airbnb-vibe for langtidsutleie. Lyst kremlerret, frisk teal,
myk mint for positivt/aktivt, dempet amber for «krever oppfølging». Humanistisk
sans (Plus Jakarta Sans). **Ingen emoji** — bruk `lucide-react`-ikoner.

Stack: Vite + React 19 (JSX), **Tailwind v4**. Fargene er definert som
`@theme`-tokens i `src/index.css`, så de finnes som vanlige utility-klasser
(`bg-brand`, `text-muted`, `border-line` osv.). Bruk ALLTID tokens — aldri rå
hex som `#16284A`/`#0E9384` i klasser.

## Farge-tokens (utility-navn)

| Rolle | Token | Hex |
|---|---|---|
| Lerret | `canvas` | `#F6F4EF` |
| Kort | `surface` | `#FFFFFF` |
| Nedtonet kort/rad | `surface-2` | `#FBFAF7` |
| Rolig seksjon | `sand` | `#F9F8F4` |
| Standard kant | `line` | `#EAE6DD` |
| Myk kant/skille | `line-soft` | `#F1EEE6` |
| Input-kant | `line-input` | `#E3DECF` |
| Merkevare teal | `brand` | `#0E9384` |
| Teal hover | `brand-hover` | `#0B7D6E` |
| Mørk teal (CTA-flate/hero) | `brand-deep` | `#0C7F72` |
| Teal-tekst på lyst | `brand-ink` | `#0A6B5F` |
| Mint tint | `mint` | `#E3F3F0` |
| Mint mykt | `mint-soft` | `#F1F9F7` |
| Mint kant | `mint-line` | `#C8E7E1` |
| Amber tekst/aksent | `amber` | `#B97D10` |
| Amber bg | `amber-bg` | `#FBF3E2` |
| Amber mykt | `amber-soft` | `#FDFAF2` |
| Amber kant | `amber-line` | `#F3E8CF` |
| Tekst primær | `ink` | `#212724` |
| Tekst sterk sek. | `ink-2` | `#2B332E` |
| Brødtekst dempet | `muted` | `#66706B` |
| Etiketter | `muted-2` | `#8A938D` |
| Svak | `faint` | `#98A19B` |
| Svakest (ikoner) | `faint-2` | `#B5BCB6` |
| Destruktiv/feil | `danger` | `#C2410C` |

Opacity-modifier funker: `bg-surface/95`, `border-danger/25`, `bg-white/[0.07]`.

## Typografi
- Font: Plus Jakarta Sans (lastet i `index.html`). `font-sans` er default på `body`.
- Overskrifter: `font-extrabold` (800), stram knip `tracking-[-0.025em]`.
- Sidetittel (h1): `text-[clamp(24px,3vw,30px)] font-extrabold tracking-[-0.025em]`.
- Korttittel (h2): `text-base font-extrabold tracking-[-0.01em]`.
- Brødtekst: `text-sm`/`text-[14.5px] text-muted`, linjehøyde `leading-relaxed`/`1.6`.
- Tall: legg `num`-klassen på beløp/nøkkeltall (tabularfigurer).

## Form & elevasjon
- Radius: knapper `rounded-xl` (12px); kort `rounded-[18px]`/`rounded-[20px]`;
  store kort/hero `rounded-[22px]`/`rounded-[26px]`; piller/avatar `rounded-full`.
- Skygger: `shadow-card`, `shadow-card-lg` (hover-løft), `shadow-lift`,
  `shadow-soft` (modal), `shadow-brand` (teal-knapp).
- Hover-løft på klikkbare kort: `hover:-translate-y-0.5 hover:shadow-card-lg`.

## Primitiver (importer fra `src/components/ui`)
- `Button` (`components/ui/Button`): `variant` = `primary|secondary|danger|ghost|amber`, `size` = `sm|md|lg`.
- `Card`, `Modal`, `Badge`, `EmptyState`, `StatCard` (`components/ui/Card`).
  - `StatCard` props: `label, value, sub, color (green|amber|red|ink), icon`.
  - `Badge`/`Pill`-toner: `mint`(positiv/aktiv), `amber`(oppfølging), `neutral`, `muted`, `dark`.
- `Input`, `Select`, `Textarea`, `Toggle` (`components/ui/Input`).
- Kit (`components/ui/kit`):
  - `Photo({ src, alt, className, icon, children })` — viser `<img>` hvis `src`
    finnes, ellers en varm `foto-plassholder`-flate med dempet ikon. **Bruk denne
    for alle bygg/objekt-bilder.** Plasser badges som `children` (absolutt posisjonert).
  - `IconTile({ children, tone (mint|amber|sand), size, radius })` — liten ikon-flate.
  - `Pill({ children, tone })` — statuspille.
  - `Avatar({ navn, tone, size })` — initialer i sirkel.
  - `PageHeader({ tittel, undertittel, children })` — `children` = handlingsknapper til høyre.
  - `SectionCard({ tittel, action, children })` — hvitt kort med tittel.
  - `DataRow({ label, value, valueClass, last })` — etikett/verdi-rad med skille.

## Mønstre
- **Sidetopp:** `<PageHeader tittel="…" undertittel="…"><Button>…</Button></PageHeader>`.
- **Nøkkeltall-rad:** grid `repeat(auto-fit, minmax(min(100%,215px),1fr))` av `StatCard`.
- **Foto-kort (bygg/objekt):** `Card` med `Photo` på topp (aspect 16/9 bygg, 4/3 objekt),
  status-`Pill` oppe i hjørnet, så tittel + `MapPin`-adresse + nøkkeltall/piller.
- **Liste-rader (kontrakter o.l.):** hvitt kort, rader skilt med `border-line-soft`,
  `Avatar` + navn + meta + beløp + status-`Pill` + `ChevronRight`.
- **Aktiv/positiv** = mint; **oppfølging/utløp** = amber; **mørk teal-flate** = `brand-deep`
  (hvit tekst) for hero/utvalgte nøkkeltall.

## Bevegelse («rolig, men levende»)

Bevegelsesspråket skal kjennes varmt og omsorgsfullt — aldri hektisk. Innhold
*glir på plass*, det spretter ikke.

**To nivåer:**

1. **App-sidene (innlogget):** kun CSS. `animate-fade-up` på sidecontainer,
   `transition-all` + `hover:-translate-y-0.5 hover:shadow-card-lg` på klikkbare
   kort. Ikke dra GSAP inn i appen — den skal føles umiddelbar.
2. **Markedssidene (forside m.fl.):** GSAP + ScrollTrigger (`useGSAP` med
   `scope`). Mønstrene under er etablert i `src/pages/LandingPage.jsx` — kopier
   derfra ved nye markedssider.

**Grunnverdier:** ease `power3.out`, varighet 0.7–0.9 s, innglidning fra
`y: 24–28`, stagger 0.07–0.09 s. Scrub-effekter (parallakse, linjer) bruker
`ease: 'none'`.

**Etablerte mønstre (data-attributter på landingssiden):**
- `data-reveal` / `data-reveal-gruppe` — generisk innglidning ved scroll
  (gruppe staggerer barna). `data-reveal-delay="0.08"` for forskyvning.
- `.hero-ord` — overskriftsord som glir opp fra klippede spans.
- `data-teller="5,8"` — tall som teller seg opp (norsk komma).
- `data-soyler` / `data-tegn` — søyler som vokser / SVG-stier som tegner seg.
- `data-parallakse` — foto litt høyere enn rammen (112–116 %) som driver
  oppover; bruk kun negative `yPercent`-spenn så kantene aldri blottlegges.
- `data-steg` + `.steg-aktiv` — scrolldrevet aktiv-tilstand med fyllende linje.

**Ufravikelig:** all animasjon settes opp i JS (`gsap.from`) slik at innholdet
er synlig uten JS, og ALT pakkes i
`gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', …)` —
med redusert bevegelse står siden stille og fullt synlig (CSS-fallbacks i
`index.css` håndterer dim-/opacity-tilstander). Marquee og svev er rene
CSS-animasjoner som skrus av i samme media query.

## Regler ved ombygging
1. Behold ALL dataflyt: API-kall, hooks (`useApp`, `useAuth`), props, ruter, eksport-navn
   og funksjonalitet. Kun presentasjon endres.
2. Norsk i kode/UI. Ingen emoji. Ikoner fra `lucide-react`.
3. Bruk tokens og primitivene over — ikke gammel navy/gull-palett (`#16284A`, `#9A7A24`).
4. Responsivt: `auto-fit minmax`-grids, kolonner stables pent på mobil.
5. `default export` der filen hadde det; ellers samme named exports.
