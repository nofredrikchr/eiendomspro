import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Logo } from '../components/Logo';
import { useSEO } from '../hooks/useSEO';
import { sporHendelse, HENDELSE } from '../utils/analytikk';
import {
  ShieldCheck, TrendingUp, Building2, Heart, ArrowRight, Check,
  CreditCard, Wrench, FileText, MessageSquare, CheckCircle2,
  Menu, X, ChevronDown, FileSignature, ChartLine, Bell,
  Banknote, CalendarClock, KeyRound, Receipt,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ─────────────────────────────────────────────────────────────────────────────
   EiendomsPRO — forside (redesign 2026, «levende» utgave)
   «Et hjem for gode leieforhold.» Samme varme kremlerret, teal og Plus Jakarta
   Sans — nå med GSAP-koreografi: ord-for-ord hero, parallakse, tellere,
   tegnende grafer og scrolldrevne seksjoner. Ingen emoji, alt på norsk.

   Bevegelsesspråket («rolig, men levende») er dokumentert i DESIGNSYSTEM.md.
   All animasjon settes opp i JS (gsap.from) slik at innholdet er fullt synlig
   uten JavaScript, og alt hopper over animasjonene ved prefers-reduced-motion.
   ──────────────────────────────────────────────────────────────────────────── */

// Foto-platene fra designet, bundlet lokalt i /public (ingen eksterne kall).
const HERO_BILDE = '/forside-stue.jpg';
const LEIETAKER_BILDE = '/forside-soverom.jpg';

/* ── Småhjelpere ────────────────────────────────────────────────────────────── */

// Ett ord i hero-overskriften: ytre span klipper, indre span gli{r} opp.
function Ord({ children, className = '' }) {
  return (
    <span className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
      <span className={`hero-ord inline-block will-change-transform ${className}`}>{children}</span>
    </span>
  );
}

// Liten «eyebrow»-etikett over seksjonsoverskrifter.
function Merke({ children }) {
  return (
    <div className="text-[13px] font-extrabold text-brand tracking-[0.08em] uppercase mb-3" data-reveal>
      {children}
    </div>
  );
}

/* ── FAQ-punkt med myk høyde-animasjon (ren CSS grid-overgang) ─────────────── */
function FaqPunkt({ sporsmal, svar, apen, onToggle }) {
  return (
    <div className="bg-surface border border-line rounded-[18px] overflow-hidden transition-shadow hover:shadow-card" data-reveal>
      <button
        onClick={onToggle}
        aria-expanded={apen}
        className="w-full flex items-center justify-between gap-4 text-left px-6 py-5 bg-transparent border-none cursor-pointer"
      >
        <span className="text-[15.5px] font-bold text-ink">{sporsmal}</span>
        <span className={`w-8 h-8 rounded-full bg-mint text-brand-ink flex items-center justify-center shrink-0 transition-transform duration-300 ${apen ? 'rotate-180' : ''}`}>
          <ChevronDown size={16} strokeWidth={2.4} />
        </span>
      </button>
      <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: apen ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <p className="m-0 px-6 pb-5 text-[14.5px] leading-[1.65] text-muted max-w-[68ch]">{svar}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Forsiden ───────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const navigate = useNavigate();
  const omfang = useRef(null);
  const [menyApen, setMenyApen] = useState(false);
  const [apenFaq, setApenFaq] = useState(0);

  useSEO({
    title: 'EiendomsPRO — Et hjem for gode leieforhold',
    description: 'Eiendomspro gir deg som leier ut rolig oversikt over bygg, kontrakter og økonomi — og gir leietakerne dine en egen portal der de føler seg ivaretatt. Laget for langtidsutleie i Norge.',
    path: '/',
  });

  const tilRegistrering = () => { sporHendelse(HENDELSE.registreringKlikk); navigate('/register'); };
  const tilLogin = () => navigate('/login');
  const skrollTil = (id) => {
    setMenyApen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Lås scroll bak mobilmenyen.
  useEffect(() => {
    document.body.style.overflow = menyApen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menyApen]);

  /* ── GSAP-koreografi ──────────────────────────────────────────────────────
     Alt ligger i én matchMedia-kontekst som KUN kjører uten reduced motion.
     Med reduced motion kjøres ingen `from`-tweens → innholdet står stille,
     fullt synlig. */
  useGSAP(() => {
    const mm = gsap.matchMedia();

    // Toppmeny: skygge + tettere bakgrunn når man har skrollet litt (alltid på).
    ScrollTrigger.create({
      start: 12,
      onToggle: (self) => omfang.current?.querySelector('header')?.classList.toggle('topp-skrollet', self.isActive),
    });

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(omfang);

      /* 1 · Hero-entré: ord glir opp, så badge/tekst/knapper, så foto + kort. */
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .from(q('.hero-ord'), { yPercent: 112, duration: 0.85, stagger: 0.07 }, 0.05)
        .from(q('[data-hero-bit]'), { y: 22, autoAlpha: 0, duration: 0.7, stagger: 0.09 }, 0.35)
        .from(q('[data-hero-foto]'), { clipPath: 'inset(8% 8% 8% 8% round 32px)', scale: 1.06, duration: 1.1, ease: 'power2.out' }, 0.4)
        .from(q('[data-hero-plate]'), { rotate: 12, scale: 0.85, autoAlpha: 0, duration: 1 }, 0.45)
        .from(q('[data-hero-kort]'), { y: 30, autoAlpha: 0, duration: 0.8, stagger: 0.14 }, 0.75)
        .from(q('[data-hero-strek]'), { strokeDashoffset: 240, duration: 0.7, ease: 'power2.inOut' }, 0.9);

      /* 2 · Parallakse i hero: foto og svevekort driver i ulik fart.
             Bildene er litt høyere enn rammen (112/116 %) og beveger seg kun
             oppover, så kantene aldri blottlegges. */
      gsap.to(q('[data-hero-foto] img'), {
        yPercent: -8, ease: 'none',
        scrollTrigger: { trigger: q('[data-hero]')[0], start: 'top top', end: 'bottom top', scrub: true },
      });
      q('[data-hero-kort]').forEach((kort, i) => {
        gsap.to(kort, {
          yPercent: i % 2 ? -26 : -14, ease: 'none',
          scrollTrigger: { trigger: q('[data-hero]')[0], start: 'top top', end: 'bottom top', scrub: true },
        });
      });

      /* Engangs-reveals bruker eksplisitt onEnter-callback (IKKE toggleActions):
         callbacks fyres garantert selv når brukeren hopper forbi en seksjon
         (ankerlenker, rask scrolling) — toggleActions nuller hverandre ut da,
         og innholdet ville blitt stående usynlig. */
      const vedSynlig = (el, start, spillAv) => {
        ScrollTrigger.create({ trigger: el, start, once: true, onEnter: spillAv });
      };

      /* 3 · Generisk inn-reveal: alt med [data-reveal] glir opp når det møter
             viewporten. Grupper med [data-reveal-gruppe] staggerer barna. */
      gsap.utils.toArray(q('[data-reveal]')).forEach((el) => {
        gsap.set(el, { y: 26, autoAlpha: 0 });
        vedSynlig(el, 'top 88%', () => gsap.to(el, {
          y: 0, autoAlpha: 1, duration: 0.85, ease: 'power3.out',
          delay: parseFloat(el.dataset.revealDelay || 0),
        }));
      });
      gsap.utils.toArray(q('[data-reveal-gruppe]')).forEach((gruppe) => {
        gsap.set(gruppe.children, { y: 24, autoAlpha: 0 });
        vedSynlig(gruppe, 'top 86%', () => gsap.to(gruppe.children, {
          y: 0, autoAlpha: 1, duration: 0.75, ease: 'power3.out', stagger: 0.09,
        }));
      });

      /* 4 · Tellere: tallene teller seg opp når raden vises. */
      gsap.utils.toArray(q('[data-teller]')).forEach((el) => {
        const mål = parseFloat(el.dataset.teller);
        const desimaler = (el.dataset.teller.split('.')[1] || '').length;
        const obj = { v: 0 };
        vedSynlig(el, 'top 92%', () => gsap.to(obj, {
          v: mål, duration: 1.6, ease: 'power2.out',
          onUpdate: () => { el.textContent = obj.v.toFixed(desimaler).replace('.', ','); },
        }));
      });

      /* 5 · Mini-UI i bento: søyler vokser, grafer tegner seg. */
      gsap.utils.toArray(q('[data-soyler]')).forEach((rad) => {
        gsap.set(rad.children, { scaleY: 0, transformOrigin: 'bottom' });
        vedSynlig(rad, 'top 90%', () => gsap.to(rad.children, {
          scaleY: 1, duration: 0.7, ease: 'power3.out', stagger: 0.05,
        }));
      });
      gsap.utils.toArray(q('[data-tegn]')).forEach((sti) => {
        const lengde = sti.getTotalLength ? sti.getTotalLength() : 300;
        gsap.set(sti, { strokeDasharray: lengde, strokeDashoffset: lengde });
        vedSynlig(sti, 'top 90%', () => gsap.to(sti, {
          strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut',
        }));
      });

      /* 6 · «Slik fungerer det»: linjen fylles mens stegene aktiveres. */
      const stegliste = q('[data-stegliste]')[0];
      if (stegliste) {
        gsap.fromTo(q('[data-steglinje]'), { scaleY: 0 }, {
          scaleY: 1, transformOrigin: 'top', ease: 'none',
          scrollTrigger: { trigger: stegliste, start: 'top 62%', end: 'bottom 62%', scrub: true },
        });
        gsap.utils.toArray(q('[data-steg]')).forEach((steg) => {
          ScrollTrigger.create({
            trigger: steg, start: 'top 64%', end: 'bottom 56%',
            onToggle: (self) => steg.classList.toggle('steg-aktiv', self.isActive),
          });
        });
      }

      /* 7 · Manifest: ordene våkner fra svakt til blekk mens man skroller. */
      const manifest = q('[data-manifest]')[0];
      if (manifest) {
        gsap.to(q('[data-manifest] .manifest-ord'), {
          opacity: 1, ease: 'none', stagger: 0.6,
          scrollTrigger: { trigger: manifest, start: 'top 78%', end: 'bottom 55%', scrub: 0.4 },
        });
      }

      /* 8 · Leietaker-foto: rolig parallakse (kun oppover-spennet, se over). */
      gsap.utils.toArray(q('[data-parallakse]')).forEach((img) => {
        gsap.fromTo(img, { yPercent: -12 }, {
          yPercent: 0, ease: 'none',
          scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });
    });

    return () => mm.revert();
  }, { scope: omfang });

  /* ── Innhold ─────────────────────────────────────────────────────────────── */

  const navPunkter = [
    { tekst: 'Funksjoner', klikk: () => skrollTil('funksjoner') },
    { tekst: 'Slik fungerer det', klikk: () => skrollTil('slik-fungerer-det') },
    { tekst: 'Priser', klikk: () => skrollTil('priser') },
    { tekst: 'Kalkulator', klikk: () => navigate('/kalkulator') },
    { tekst: 'Guider', klikk: () => navigate('/guider') },
  ];

  const marqueePunkter = [
    { icon: CheckCircle2, t: 'Husleie betalt' },
    { icon: FileSignature, t: 'Kontrakt signert' },
    { icon: ChartLine, t: 'KPI-regulering klar' },
    { icon: Wrench, t: 'Sak løst på 2 timer' },
    { icon: ShieldCheck, t: 'Depositum sikret' },
    { icon: Receipt, t: 'Rapport sendt banken' },
    { icon: Heart, t: 'Fornøyd leietaker' },
    { icon: CalendarClock, t: 'Purring sendt automatisk' },
  ];

  const stats = [
    { tall: '5', suffix: ' min', tekst: 'fra registrering til full oversikt' },
    { tall: '10', suffix: ' år', tekst: 'prognose for hver eneste bolig' },
    { tall: '149', suffix: ' kr', tekst: 'fast pris — uansett antall boliger' },
    { tall: '0', suffix: ' kr', tekst: 'å komme i gang. Ingen kort, ingen binding' },
  ];

  const steg = [
    { nr: '01', tittel: 'Legg inn boligene dine', tekst: 'Adresse, leie og bilder — du er i gang på et par minutter per bolig. Eiendomspro regner yield, kontantstrøm og skatt med en gang.' },
    { nr: '02', tittel: 'Inviter leietakerne', tekst: 'Hver leietaker får sin egen portal med kontrakt, betalingsoversikt og en direktelinje til deg. Ingen app å laste ned, ingen løse SMS-tråder.' },
    { nr: '03', tittel: 'Len deg tilbake', tekst: 'KPI-regulering, purringer og rapporter går av seg selv. Du får beskjed når noe faktisk trenger deg — resten ordner seg selv.' },
  ];

  const faq = [
    { sporsmal: 'Passer EiendomsPRO for meg med bare én bolig?', svar: 'Ja. Gratis-planen gir full lønnsomhetsanalyse og oversikt over én bolig, helt gratis. Vil du ha flere boliger, alle rapporter og ubegrensede leiekontrakter, oppgraderer du til Utleier for 149 kr/mnd — fast pris uansett antall boliger.' },
    { sporsmal: 'Er leiekontraktene juridisk gyldige?', svar: 'Ja. Kontraktene er utformet etter husleieloven og norsk lovgivning. Du laster dem ned som PDF, og BankID-signering kommer for Pro-brukere.' },
    { sporsmal: 'Hva koster det å begynne?', svar: 'Ingenting. Du kommer i gang gratis uten kredittkort og velger selv om og når du vil oppgradere. Det trekkes ingenting automatisk.' },
    { sporsmal: 'Kan jeg bruke det for et AS?', svar: 'Ja. EiendomsPRO regner skatt for både privatperson (22 %) og selskap, og du kan knytte et selskap som utleier på kontraktene.' },
    { sporsmal: 'Hvor trygt lagres dataene mine?', svar: 'Data lagres kryptert og vi følger GDPR. Vi deler ikke data med tredjeparter, og du kan når som helst eksportere eller slette alt.' },
  ];

  const manifestOrd = 'Utleie handler ikke om purringer og papirarbeid. Det handler om mennesker som skal bo godt. Vi tar oss av resten — så du kan være en god vert.'.split(' ');

  return (
    <div ref={omfang} className="min-h-screen bg-canvas text-ink overflow-x-clip">

      {/* ── Toppmeny ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-canvas/85 backdrop-blur-[14px] border-b border-transparent transition-all duration-300 [&.topp-skrollet]:border-line [&.topp-skrollet]:bg-canvas/95 [&.topp-skrollet]:shadow-card">
        <div className="max-w-[1180px] mx-auto px-[clamp(20px,4vw,40px)] h-[70px] flex items-center gap-5">
          <button onClick={() => { setMenyApen(false); navigate('/'); }} className="cursor-pointer bg-transparent border-none p-0">
            <Logo variant="dark" height={34} />
          </button>
          <nav className="hidden lg:flex gap-0.5 ml-auto">
            {navPunkter.map(({ tekst, klikk }) => (
              <button key={tekst} onClick={klikk} className="px-3.5 py-2.5 rounded-[10px] text-sm font-semibold text-muted hover:bg-line-soft hover:text-ink cursor-pointer transition-colors">
                {tekst}
              </button>
            ))}
          </nav>
          <div className="hidden lg:flex gap-2.5 items-center">
            <button onClick={tilLogin} className="px-4 py-2.5 rounded-[11px] text-sm font-bold text-ink-2 hover:bg-line-soft cursor-pointer transition-colors">Logg inn</button>
            <button onClick={tilRegistrering} className="px-[18px] py-2.5 rounded-[11px] text-sm font-bold text-white bg-brand hover:bg-brand-hover shadow-brand cursor-pointer transition-colors">Kom i gang</button>
          </div>
          <button
            onClick={() => setMenyApen(!menyApen)}
            aria-label={menyApen ? 'Lukk meny' : 'Åpne meny'}
            aria-expanded={menyApen}
            className="lg:hidden ml-auto w-11 h-11 rounded-[12px] bg-surface border border-line flex items-center justify-center text-ink cursor-pointer"
          >
            {menyApen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* ── Mobilmeny (overlegg) ─────────────────────────────────────────────── */}
      {menyApen && (
        <div className="fixed inset-0 top-[70px] z-30 lg:hidden bg-canvas animate-fade-up overflow-y-auto">
          <div className="px-6 py-6 flex flex-col gap-1">
            {navPunkter.map(({ tekst, klikk }) => (
              <button key={tekst} onClick={klikk} className="text-left px-4 py-4 rounded-[14px] text-[17px] font-bold text-ink hover:bg-line-soft cursor-pointer border-b border-line-soft">
                {tekst}
              </button>
            ))}
            <div className="mt-5 grid gap-3">
              <button onClick={tilRegistrering} className="px-5 py-4 rounded-[14px] text-[16px] font-bold text-white bg-brand shadow-brand cursor-pointer">Kom i gang gratis</button>
              <button onClick={tilLogin} className="px-5 py-4 rounded-[14px] text-[16px] font-bold text-ink-2 bg-surface border-[1.5px] border-line-input cursor-pointer">Logg inn</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section data-hero className="max-w-[1180px] mx-auto px-[clamp(20px,4vw,40px)] pt-[clamp(40px,6vw,84px)] pb-[clamp(48px,6vw,76px)] grid gap-[clamp(36px,5vw,64px)] items-center lg:grid-cols-[1.04fr_0.96fr]">
        <div>
          <div data-hero-bit className="inline-flex items-center gap-2 bg-mint text-brand-ink text-[13px] font-bold px-3.5 py-[7px] rounded-full mb-[22px]">
            <ShieldCheck size={14} />
            Laget for langtidsutleie i Norge
          </div>
          <h1 className="m-0 mb-[18px] font-extrabold tracking-[-0.035em] leading-[1.04] text-balance" style={{ fontSize: 'clamp(40px, 5.4vw, 66px)' }}>
            <Ord>Et</Ord> <Ord>hjem</Ord> <Ord>for</Ord>{' '}
            <span className="relative inline-block">
              <Ord className="text-brand-ink">gode</Ord>
              <svg className="absolute left-0 -bottom-[0.08em] w-full overflow-visible" viewBox="0 0 230 14" fill="none" aria-hidden="true">
                <path data-hero-strek d="M4 10 C 60 3, 160 2, 226 8" stroke="#0E9384" strokeWidth="5" strokeLinecap="round" strokeDasharray="240" />
              </svg>
            </span>{' '}
            <Ord>leieforhold.</Ord>
          </h1>
          <p data-hero-bit className="m-0 mb-[30px] leading-[1.6] text-muted max-w-[48ch]" style={{ fontSize: 'clamp(16px, 1.6vw, 18px)' }}>
            Eiendomspro gir deg som leier ut rolig oversikt over bygg, kontrakter og økonomi — og gir leietakerne dine en egen portal der de føler seg ivaretatt.
          </p>
          <div data-hero-bit className="flex gap-3 flex-wrap mb-[30px]">
            <button onClick={tilRegistrering} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[13px] text-[15.5px] font-bold text-white bg-brand hover:bg-brand-hover hover:-translate-y-px shadow-brand transition-all cursor-pointer">
              Kom i gang gratis
              <ArrowRight size={16} strokeWidth={2.2} />
            </button>
            <button onClick={tilLogin} className="px-6 py-3.5 rounded-[13px] text-[15.5px] font-bold text-ink-2 bg-surface border-[1.5px] border-line-input hover:border-brand hover:text-brand-ink transition-all cursor-pointer">
              Se leietakerportalen
            </button>
          </div>
          <div data-hero-bit className="flex gap-[18px] flex-wrap">
            {['Gratis å komme i gang', 'Norsk standard leiekontrakt', 'Bygget for langtidsleie'].map((t) => (
              <div key={t} className="flex items-center gap-[7px] text-[13.5px] font-semibold text-muted">
                <Check size={15} strokeWidth={2.4} className="text-brand" />
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[380px]">
          <div data-hero-plate className="absolute w-[70%] h-[70%] bg-mint rounded-[28px] rotate-3" style={{ inset: '24px -10px auto auto' }} />
          <div data-hero-foto className="relative rounded-[26px] overflow-hidden bg-[#E8E4DB] shadow-card-lg" style={{ aspectRatio: '4 / 3.4' }}>
            <img src={HERO_BILDE} alt="Lys og varm stue i utleiebolig" fetchPriority="high" className="w-full h-[112%] object-cover block will-change-transform" />
          </div>
          <div data-hero-kort className="absolute top-[26px] -left-2 bg-surface/95 backdrop-blur-sm rounded-[15px] px-[17px] py-[13px] shadow-card-lg flex items-center gap-[11px]">
            <span className="w-9 h-9 rounded-full bg-mint text-brand flex items-center justify-center"><CheckCircle2 size={17} /></span>
            <div>
              <div className="text-[13.5px] font-bold">Husleie betalt</div>
              <div className="text-xs font-semibold text-faint num">21 900 kr · 1. juni</div>
            </div>
          </div>
          <div data-hero-kort className="absolute top-[44%] -right-3 bg-surface/95 backdrop-blur-sm rounded-[15px] px-[17px] py-[13px] shadow-card-lg flex items-center gap-[11px] max-lg:hidden">
            <span className="w-9 h-9 rounded-full bg-amber-bg text-amber flex items-center justify-center"><TrendingUp size={17} /></span>
            <div>
              <div className="text-[13.5px] font-bold num">Snitt yield 5,8 %</div>
              <div className="text-xs font-semibold text-faint">Porteføljen din</div>
            </div>
          </div>
          <div data-hero-kort className="absolute -bottom-4 left-[12%] bg-surface/95 backdrop-blur-sm rounded-[15px] px-[17px] py-[13px] shadow-card-lg flex items-center gap-[11px]">
            <span className="w-9 h-9 rounded-full bg-mint text-brand flex items-center justify-center"><MessageSquare size={16} /></span>
            <div>
              <div className="text-[13.5px] font-bold">Melding fra leietaker</div>
              <div className="text-xs font-semibold text-faint">«Tusen takk for rask hjelp!»</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee: små øyeblikk fra en rolig utleiehverdag ─────────────────── */}
      <div className="border-y border-line bg-surface py-[18px] overflow-hidden marquee-maske" aria-hidden="true">
        <div className="flex w-max gap-0 animate-marquee">
          {[0, 1].map((kopi) => (
            <div key={kopi} className="flex shrink-0 items-center">
              {marqueePunkter.map(({ icon: Icon, t }) => (
                <span key={`${kopi}-${t}`} className="inline-flex items-center gap-2.5 px-7 text-[14px] font-bold text-muted whitespace-nowrap">
                  <Icon size={16} className="text-brand shrink-0" />
                  {t}
                  <span className="w-1 h-1 rounded-full bg-line-input ml-7" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Nøkkeltall ───────────────────────────────────────────────────────── */}
      <section className="max-w-[1180px] mx-auto px-[clamp(20px,4vw,40px)] py-[clamp(44px,6vw,72px)]">
        <div className="grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }} data-reveal-gruppe>
          {stats.map(({ tall, suffix, tekst }) => (
            <div key={tekst} className="bg-surface border border-line rounded-[20px] p-6 text-center">
              <div className="font-extrabold tracking-[-0.03em] text-ink num" style={{ fontSize: 'clamp(34px, 3.6vw, 46px)' }}>
                <span data-teller={tall}>{tall}</span><span className="text-brand">{suffix}</span>
              </div>
              <div className="mt-1.5 text-[13.5px] font-semibold text-muted leading-snug">{tekst}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Funksjoner (bento) ───────────────────────────────────────────────── */}
      <section id="funksjoner" className="scroll-mt-[70px] bg-surface border-y border-line px-[clamp(20px,4vw,40px)] py-[clamp(52px,7vw,92px)]">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-center mb-[clamp(36px,5vw,56px)]">
            <Merke>Alt på ett sted</Merke>
            <h2 data-reveal className="m-0 mx-auto mb-3.5 font-extrabold tracking-[-0.025em] max-w-[22ch] text-balance" style={{ fontSize: 'clamp(28px, 3.6vw, 42px)' }}>
              Mindre administrasjon. Bedre boforhold.
            </h2>
            <p data-reveal className="m-0 mx-auto text-base leading-[1.6] text-muted max-w-[52ch]">
              Eiendomspro er bygget for langtidsutleie — rolig oversikt for deg som eier, og trygghet for de som bor der.
            </p>
          </div>

          <div className="grid gap-[18px] lg:grid-cols-3">
            {/* Celle 1 — Dashbord (bred) */}
            <div data-reveal className="lg:col-span-2 bg-sand border border-line-soft rounded-[22px] p-7 transition-all hover:-translate-y-[3px] hover:shadow-card-lg">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                <div>
                  <div className="w-[46px] h-[46px] rounded-[14px] bg-mint text-brand flex items-center justify-center mb-4"><Building2 size={21} /></div>
                  <div className="text-[18px] font-extrabold tracking-[-0.01em] mb-1.5">Full oversikt i ett rolig dashbord</div>
                  <p className="m-0 text-[14.5px] leading-[1.6] text-muted max-w-[44ch]">Bygg, leieobjekter og økonomi samlet. Du ser alltid hva som krever oppfølging — og hva som går av seg selv.</p>
                </div>
              </div>
              {/* Mini-dashbord */}
              <div className="bg-surface border border-line rounded-[16px] p-5 shadow-card">
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { l: 'Leie / mnd', v: '64 300 kr', tone: 'text-ink' },
                    { l: 'Yield', v: '5,8 %', tone: 'text-brand-ink' },
                    { l: 'Oppfølging', v: '1 sak', tone: 'text-amber' },
                  ].map(({ l, v, tone }) => (
                    <div key={l} className="bg-surface-2 border border-line-soft rounded-[12px] px-3.5 py-3">
                      <div className="text-[10.5px] font-bold text-muted-2 uppercase tracking-[0.05em] mb-1 truncate">{l}</div>
                      <div className={`text-[15px] font-extrabold num ${tone} whitespace-nowrap`}>{v}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-end justify-between gap-[6px] h-[88px] px-1" data-soyler>
                  {[34, 48, 42, 60, 52, 70, 64, 78, 72, 88, 82, 96].map((h, i) => (
                    <div key={i} className={`flex-1 rounded-t-[5px] ${i === 11 ? 'bg-brand' : 'bg-mint-line'}`} style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] font-bold text-faint-2 px-1 mt-2">
                  <span>jul</span><span>aug</span><span>sep</span><span>okt</span><span>nov</span><span>des</span>
                </div>
              </div>
            </div>

            {/* Celle 2 — KPI-regulering */}
            <div data-reveal data-reveal-delay="0.08" className="bg-sand border border-line-soft rounded-[22px] p-7 transition-all hover:-translate-y-[3px] hover:shadow-card-lg flex flex-col">
              <div className="w-[46px] h-[46px] rounded-[14px] bg-mint text-brand flex items-center justify-center mb-4"><ChartLine size={21} /></div>
              <div className="text-[18px] font-extrabold tracking-[-0.01em] mb-1.5">KPI-regulering på autopilot</div>
              <p className="m-0 text-[14.5px] leading-[1.6] text-muted mb-5">Vi følger konsumprisindeksen og varsler leietaker for deg — med riktig frist etter husleieloven.</p>
              <div className="mt-auto bg-surface border border-line rounded-[16px] p-5 shadow-card">
                <svg viewBox="0 0 220 80" fill="none" className="w-full" aria-hidden="true">
                  <path d="M0 64 L36 58 L72 60 L108 46 L144 40 L180 28 L220 18" stroke="#C8E7E1" strokeWidth="3" strokeLinecap="round" />
                  <path data-tegn d="M0 64 L36 58 L72 60 L108 46 L144 40 L180 28 L220 18" stroke="#0E9384" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="220" cy="18" r="5" fill="#0E9384" />
                </svg>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[12px] font-bold text-muted">Ny leie fra 1. august</span>
                  <span className="text-[12px] font-extrabold text-brand-ink bg-mint px-2.5 py-1 rounded-full num">+3,4 %</span>
                </div>
              </div>
            </div>

            {/* Celle 3 — Kontrakter */}
            <div data-reveal className="bg-sand border border-line-soft rounded-[22px] p-7 transition-all hover:-translate-y-[3px] hover:shadow-card-lg flex flex-col">
              <div className="w-[46px] h-[46px] rounded-[14px] bg-mint text-brand flex items-center justify-center mb-4"><FileSignature size={21} /></div>
              <div className="text-[18px] font-extrabold tracking-[-0.01em] mb-1.5">Trygge kontrakter</div>
              <p className="m-0 text-[14.5px] leading-[1.6] text-muted mb-5">Norsk standard leiekontrakt, depositum og overtakelsesprotokoll — generert, signert og arkivert på ett sted.</p>
              <div className="mt-auto bg-surface border border-line rounded-[16px] p-5 shadow-card">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-9 h-9 rounded-[10px] bg-mint text-brand flex items-center justify-center shrink-0"><FileText size={16} /></span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold truncate">Leiekontrakt — Storgata 4B</div>
                    <div className="text-[11px] font-semibold text-faint">Etter husleieloven § 9-2</div>
                  </div>
                </div>
                <div className="grid gap-2 mb-4">
                  <div className="h-2 rounded-full bg-line-soft w-full" />
                  <div className="h-2 rounded-full bg-line-soft w-[82%]" />
                  <div className="h-2 rounded-full bg-line-soft w-[64%]" />
                </div>
                <div className="flex items-center justify-between">
                  <svg viewBox="0 0 110 26" fill="none" className="h-[22px]" aria-hidden="true">
                    <path data-tegn d="M4 18 C 14 6, 20 22, 30 14 C 38 8, 42 20, 52 13 C 62 6, 66 18, 78 12 C 88 7, 96 14, 106 9" stroke="#212724" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-brand-ink bg-mint px-2.5 py-1 rounded-full"><Check size={12} strokeWidth={3} /> Signert</span>
                </div>
              </div>
            </div>

            {/* Celle 4 — Meldinger */}
            <div data-reveal data-reveal-delay="0.08" className="bg-sand border border-line-soft rounded-[22px] p-7 transition-all hover:-translate-y-[3px] hover:shadow-card-lg flex flex-col">
              <div className="w-[46px] h-[46px] rounded-[14px] bg-mint text-brand flex items-center justify-center mb-4"><MessageSquare size={21} /></div>
              <div className="text-[18px] font-extrabold tracking-[-0.01em] mb-1.5">Én ryddig samtale</div>
              <p className="m-0 text-[14.5px] leading-[1.6] text-muted mb-5">Alt om boligen i én tråd — ikke spredt over SMS, e-post og lapper i gangen.</p>
              <div className="mt-auto bg-surface border border-line rounded-[16px] p-5 shadow-card grid gap-2.5" data-reveal-gruppe>
                <div className="max-w-[85%] bg-surface-2 border border-line-soft rounded-[13px] rounded-bl-[4px] px-3.5 py-2.5 text-[12.5px] font-semibold text-ink-2">Hei! Lampen i gangen har sluttet å virke.</div>
                <div className="max-w-[85%] justify-self-end bg-mint border border-mint-line rounded-[13px] rounded-br-[4px] px-3.5 py-2.5 text-[12.5px] font-semibold text-ink-2">Takk for beskjed! Elektriker kommer torsdag kl. 10.</div>
                <div className="max-w-[85%] bg-surface-2 border border-line-soft rounded-[13px] rounded-bl-[4px] px-3.5 py-2.5 text-[12.5px] font-semibold text-ink-2">Perfekt, tusen takk for rask hjelp!</div>
              </div>
            </div>

            {/* Celle 5 — Leietakerportal (bred) */}
            <div data-reveal data-reveal-delay="0.16" className="lg:col-span-2 bg-brand-deep border border-brand-deep rounded-[22px] p-7 transition-all hover:-translate-y-[3px] hover:shadow-lift text-white relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-[240px] h-[240px] rounded-full bg-white/[0.06]" aria-hidden="true" />
              <div className="absolute -bottom-24 right-24 w-[200px] h-[200px] rounded-full bg-white/[0.04]" aria-hidden="true" />
              <div className="grid gap-7 items-center sm:grid-cols-[1.2fr_0.8fr] relative">
                <div>
                  <div className="w-[46px] h-[46px] rounded-[14px] bg-white/15 text-white flex items-center justify-center mb-4"><Heart size={21} /></div>
                  <div className="text-[18px] font-extrabold tracking-[-0.01em] mb-1.5">Leietakere som trives, blir boende</div>
                  <p className="m-0 text-[14.5px] leading-[1.6] text-white/75 max-w-[42ch]">En egen portal der leietaker betaler, melder fra og finner dokumentene sine — uten å måtte mase på deg. God service, mindre utskifting.</p>
                </div>
                {/* Mini-telefon */}
                <div className="justify-self-center w-full max-w-[210px] bg-surface text-ink rounded-[22px] border-[5px] border-ink/90 p-3.5 shadow-lift">
                  <div className="text-[11px] font-extrabold text-muted-2 uppercase tracking-[0.05em] mb-2.5">Min bolig</div>
                  <div className="bg-mint-soft border border-mint-line rounded-[11px] px-3 py-2.5 mb-2 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-brand shrink-0" />
                    <div className="text-[11.5px] font-bold">Husleie betalt</div>
                  </div>
                  <div className="bg-surface-2 border border-line-soft rounded-[11px] px-3 py-2.5 mb-2 flex items-center gap-2">
                    <FileText size={14} className="text-muted shrink-0" />
                    <div className="text-[11.5px] font-bold">Kontrakt og protokoll</div>
                  </div>
                  <div className="bg-surface-2 border border-line-soft rounded-[11px] px-3 py-2.5 mb-3 flex items-center gap-2">
                    <Bell size={14} className="text-muted shrink-0" />
                    <div className="text-[11.5px] font-bold">Varsler fra utleier</div>
                  </div>
                  <div className="bg-brand text-white rounded-[11px] px-3 py-2.5 text-center text-[11.5px] font-extrabold flex items-center justify-center gap-1.5">
                    <Wrench size={13} /> Meld inn sak
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Slik fungerer det ────────────────────────────────────────────────── */}
      <section id="slik-fungerer-det" className="scroll-mt-[70px] max-w-[1180px] mx-auto px-[clamp(20px,4vw,40px)] py-[clamp(56px,8vw,104px)] grid gap-[clamp(40px,5vw,72px)] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-[130px] self-start">
          <Merke>Slik fungerer det</Merke>
          <h2 data-reveal className="m-0 mb-3.5 font-extrabold tracking-[-0.025em] text-balance" style={{ fontSize: 'clamp(28px, 3.6vw, 42px)' }}>
            Fra første bolig til rolig hverdag
          </h2>
          <p data-reveal className="m-0 mb-7 text-base leading-[1.6] text-muted max-w-[44ch]">
            Du trenger ikke flytte regneark, lære et nytt system eller ringe support. Tre steg, så er du i gang.
          </p>
          <div data-reveal>
            <button onClick={tilRegistrering} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[13px] text-[15px] font-bold text-white bg-brand hover:bg-brand-hover hover:-translate-y-px shadow-brand transition-all cursor-pointer">
              Start med din første bolig
              <ArrowRight size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div className="relative" data-stegliste>
          {/* Linje som fylles mens man skroller */}
          <div className="absolute left-[27px] top-[28px] bottom-[28px] w-[3px] bg-line rounded-full" aria-hidden="true" />
          <div data-steglinje className="absolute left-[27px] top-[28px] bottom-[28px] w-[3px] bg-brand rounded-full" aria-hidden="true" />
          <div className="grid gap-[clamp(28px,4vw,44px)]">
            {steg.map(({ nr, tittel, tekst }) => (
              <div key={nr} data-steg className="steg relative grid grid-cols-[58px_1fr] gap-5 items-start">
                <div className="steg-nr relative z-[1] w-[58px] h-[58px] rounded-[18px] bg-surface border-[2.5px] border-line flex items-center justify-center text-[15px] font-extrabold text-faint num transition-all duration-300">
                  {nr}
                </div>
                <div className="steg-tekst transition-opacity duration-300 pt-1">
                  <div className="text-[19px] font-extrabold tracking-[-0.01em] mb-1.5">{tittel}</div>
                  <p className="m-0 text-[15px] leading-[1.65] text-muted max-w-[52ch]">{tekst}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For leietakere ───────────────────────────────────────────────────── */}
      <section className="bg-sand border-y border-line-soft">
        <div className="max-w-[1180px] mx-auto px-[clamp(20px,4vw,40px)] py-[clamp(52px,7vw,92px)] grid gap-[clamp(36px,5vw,64px)] items-center lg:grid-cols-2">
          <div className="relative order-2 lg:order-1" data-reveal>
            <div className="rounded-[26px] overflow-hidden bg-[#E8E4DB] shadow-card-lg" style={{ aspectRatio: '4 / 3' }}>
              <img data-parallakse src={LEIETAKER_BILDE} alt="Lyst soverom i leid bolig" loading="lazy" className="w-full h-[116%] object-cover block will-change-transform" />
            </div>
            <div className="absolute -bottom-3.5 left-[18px] bg-surface rounded-[15px] px-[17px] py-[13px] shadow-card-lg flex items-center gap-[11px]">
              <span className="w-9 h-9 rounded-full bg-mint text-brand flex items-center justify-center"><Wrench size={16} /></span>
              <div>
                <div className="text-[13.5px] font-bold">Sak meldt inn</div>
                <div className="text-xs font-semibold text-faint">Utleier svarer vanligvis innen 2 timer</div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <Merke>For leietakere</Merke>
            <h2 data-reveal className="m-0 mb-3.5 font-extrabold tracking-[-0.025em] text-balance" style={{ fontSize: 'clamp(28px, 3.6vw, 42px)' }}>
              En portal som føles som god service
            </h2>
            <p data-reveal className="m-0 mb-[26px] text-base leading-[1.6] text-muted max-w-[50ch]">
              Å leie skal ikke føles som papirarbeid. Leietakerne dine får et ryddig hjem på nett — med alt de trenger gjennom hele leieforholdet.
            </p>
            <div className="grid gap-3.5 mb-7" data-reveal-gruppe>
              {[
                { icon: CreditCard, t: 'Husleie og betalingshistorikk, alltid oppdatert' },
                { icon: Wrench, t: 'Meld fra når noe er galt — følg saken til den er løst' },
                { icon: FileText, t: 'Kontrakt, protokoll og kvitteringer samlet på ett sted' },
                { icon: MessageSquare, t: 'Direktelinje til utleier, uten løse SMS-tråder' },
              ].map(({ icon: Icon, t }) => (
                <div key={t} className="flex items-center gap-3.5">
                  <span className="w-[38px] h-[38px] rounded-[12px] bg-mint text-brand flex items-center justify-center shrink-0"><Icon size={17} /></span>
                  <div className="text-[15px] font-semibold text-ink-2">{t}</div>
                </div>
              ))}
            </div>
            <button data-reveal onClick={tilLogin} className="inline-flex items-center gap-2 bg-transparent border-none p-0 text-[15px] font-bold text-brand-ink hover:underline cursor-pointer">
              Se leietakerportalen
              <ArrowRight size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Manifest: ordene våkner mens man skroller ────────────────────────── */}
      <section className="max-w-[920px] mx-auto px-[clamp(20px,4vw,40px)] py-[clamp(64px,9vw,128px)] text-center">
        <div className="w-12 h-12 rounded-[15px] bg-mint text-brand flex items-center justify-center mx-auto mb-8" data-reveal>
          <KeyRound size={20} />
        </div>
        <p data-manifest className="m-0 font-extrabold tracking-[-0.03em] leading-[1.25] text-balance" style={{ fontSize: 'clamp(26px, 4.2vw, 48px)' }}>
          {manifestOrd.map((ord, i) => (
            <span key={i} className="manifest-ord inline-block opacity-[0.16]" style={{ marginRight: '0.28em' }}>
              {ord}
            </span>
          ))}
        </p>
      </section>

      {/* ── Priser ───────────────────────────────────────────────────────────── */}
      <section id="priser" className="scroll-mt-[70px] bg-surface border-y border-line px-[clamp(20px,4vw,40px)] py-[clamp(52px,7vw,92px)]">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-center mb-[clamp(36px,5vw,52px)]">
            <Merke>Priser</Merke>
            <h2 data-reveal className="m-0 mx-auto mb-3.5 font-extrabold tracking-[-0.025em] max-w-[24ch] text-balance" style={{ fontSize: 'clamp(28px, 3.6vw, 42px)' }}>
              Enkelt å starte. Fast pris når du vokser.
            </h2>
            <p data-reveal className="m-0 mx-auto text-base leading-[1.6] text-muted max-w-[48ch]">
              Ingen binding og ingen kort for å starte — du oppgraderer når det gir mening for deg.
            </p>
          </div>

          <div className="grid gap-[18px] items-stretch lg:grid-cols-3 max-w-[1020px] mx-auto" data-reveal-gruppe>
            {/* Gratis */}
            <div className="bg-sand border border-line-soft rounded-[22px] p-7 flex flex-col transition-all hover:-translate-y-[3px] hover:shadow-card-lg">
              <div className="text-[15px] font-extrabold mb-1">Gratis</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-extrabold tracking-[-0.03em] num" style={{ fontSize: '38px' }}>0 kr</span>
                <span className="text-[13px] font-bold text-faint">/ mnd</span>
              </div>
              <p className="m-0 text-[13.5px] font-semibold text-muted mb-5">For deg som vil prøve med én bolig.</p>
              <div className="grid gap-2.5 mb-7">
                {['Én bolig med full lønnsomhetsanalyse', 'Yield, kontantstrøm og skatt', 'Leietakerportal inkludert'].map((t) => (
                  <div key={t} className="flex items-start gap-2.5 text-[13.5px] font-semibold text-ink-2">
                    <Check size={15} strokeWidth={2.6} className="text-brand mt-[2px] shrink-0" />{t}
                  </div>
                ))}
              </div>
              <button onClick={tilRegistrering} className="mt-auto px-5 py-3 rounded-[12px] text-[14.5px] font-bold text-ink-2 bg-surface border-[1.5px] border-line-input hover:border-brand hover:text-brand-ink transition-all cursor-pointer">
                Kom i gang gratis
              </button>
            </div>

            {/* Utleier — fremhevet */}
            <div className="relative bg-brand-deep text-white rounded-[22px] p-7 flex flex-col shadow-lift lg:-my-3 lg:py-10 transition-all hover:-translate-y-[3px] overflow-hidden">
              <div className="absolute -top-14 -right-14 w-[180px] h-[180px] rounded-full bg-white/[0.07]" aria-hidden="true" />
              <div className="inline-flex self-start items-center gap-1.5 bg-white/15 text-white text-[11.5px] font-extrabold px-3 py-1.5 rounded-full mb-4 relative">
                Mest valgt
              </div>
              <div className="text-[15px] font-extrabold mb-1 relative">Utleier</div>
              <div className="flex items-baseline gap-1 mb-1 relative">
                <span className="font-extrabold tracking-[-0.03em] num" style={{ fontSize: '38px' }}>149 kr</span>
                <span className="text-[13px] font-bold text-white/60">/ mnd</span>
              </div>
              <p className="m-0 text-[13.5px] font-semibold text-white/75 mb-5 relative">Fast pris — uansett antall boliger.</p>
              <div className="grid gap-2.5 mb-7 relative">
                {['Ubegrenset antall boliger', 'Ubegrensede leiekontrakter', 'Alle rapporter — også til banken', 'KPI-regulering på autopilot'].map((t) => (
                  <div key={t} className="flex items-start gap-2.5 text-[13.5px] font-semibold text-white/90">
                    <Check size={15} strokeWidth={2.6} className="text-white mt-[2px] shrink-0" />{t}
                  </div>
                ))}
              </div>
              <button onClick={tilRegistrering} className="mt-auto px-5 py-3 rounded-[12px] text-[14.5px] font-bold text-brand-ink bg-white hover:-translate-y-px shadow-card-lg transition-all cursor-pointer relative">
                Velg Utleier
              </button>
            </div>

            {/* Pro */}
            <div className="bg-sand border border-line-soft rounded-[22px] p-7 flex flex-col transition-all hover:-translate-y-[3px] hover:shadow-card-lg">
              <div className="text-[15px] font-extrabold mb-1">Pro</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-extrabold tracking-[-0.03em] num" style={{ fontSize: '38px' }}>299 kr</span>
                <span className="text-[13px] font-bold text-faint">/ mnd</span>
              </div>
              <p className="m-0 text-[13.5px] font-semibold text-muted mb-5">For deg som driver utleie som selskap.</p>
              <div className="grid gap-2.5 mb-7">
                {['Alt i Utleier', 'Skatt for AS og privatperson', 'Selskap som utleier på kontrakten', 'BankID-signering (kommer)'].map((t) => (
                  <div key={t} className="flex items-start gap-2.5 text-[13.5px] font-semibold text-ink-2">
                    <Check size={15} strokeWidth={2.6} className="text-brand mt-[2px] shrink-0" />{t}
                  </div>
                ))}
              </div>
              <button onClick={tilRegistrering} className="mt-auto px-5 py-3 rounded-[12px] text-[14.5px] font-bold text-ink-2 bg-surface border-[1.5px] border-line-input hover:border-brand hover:text-brand-ink transition-all cursor-pointer">
                Velg Pro
              </button>
            </div>
          </div>

          <p data-reveal className="m-0 mt-7 text-center text-[13px] font-semibold text-faint flex items-center justify-center gap-2">
            <Banknote size={15} className="text-brand" />
            Ingen binding. Ingen kort for å starte. Det trekkes aldri noe automatisk.
          </p>
        </div>
      </section>

      {/* ── Spørsmål og svar ─────────────────────────────────────────────────── */}
      <section id="sporsmal" className="scroll-mt-[70px] max-w-[820px] mx-auto px-[clamp(20px,4vw,40px)] py-[clamp(52px,7vw,92px)]">
        <div className="text-center mb-[clamp(32px,4vw,44px)]">
          <Merke>Spørsmål og svar</Merke>
          <h2 data-reveal className="m-0 mx-auto font-extrabold tracking-[-0.025em] max-w-[20ch] text-balance" style={{ fontSize: 'clamp(28px, 3.6vw, 40px)' }}>
            Lurer du på noe? Det gjør de fleste.
          </h2>
        </div>
        <div className="grid gap-3">
          {faq.map(({ sporsmal, svar }, i) => (
            <FaqPunkt
              key={sporsmal}
              sporsmal={sporsmal}
              svar={svar}
              apen={apenFaq === i}
              onToggle={() => setApenFaq(apenFaq === i ? -1 : i)}
            />
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="max-w-[1180px] mx-auto px-[clamp(20px,4vw,40px)] pb-[clamp(52px,7vw,88px)]">
        <div data-reveal className="bg-brand-deep rounded-[28px] px-[clamp(24px,5vw,64px)] py-[clamp(44px,6vw,80px)] text-center relative overflow-hidden">
          <div className="absolute -top-[60px] -right-[60px] w-[220px] h-[220px] rounded-full bg-white/[0.07]" aria-hidden="true" />
          <div className="absolute -bottom-20 -left-10 w-[260px] h-[260px] rounded-full bg-white/[0.05]" aria-hidden="true" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-white/[0.03]" aria-hidden="true" />
          <h2 className="relative m-0 mx-auto mb-3 font-extrabold tracking-[-0.025em] text-white max-w-[24ch] text-balance" style={{ fontSize: 'clamp(27px, 3.6vw, 42px)' }}>
            Klar for en roligere utleiehverdag?
          </h2>
          <p className="relative m-0 mx-auto mb-7 text-base text-white/80 max-w-[44ch]">
            Kom i gang på under fem minutter. Gratis å starte — ingen kort, ingen binding.
          </p>
          <div className="relative flex gap-3 justify-center flex-wrap">
            <button onClick={tilRegistrering} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[13px] text-[15.5px] font-bold text-brand-ink bg-white hover:-translate-y-px shadow-card-lg transition-all cursor-pointer">
              Kom i gang gratis
              <ArrowRight size={16} strokeWidth={2.2} />
            </button>
            <button onClick={() => navigate('/kalkulator')} className="px-7 py-3.5 rounded-[13px] text-[15.5px] font-bold text-white bg-white/10 border-[1.5px] border-white/25 hover:bg-white/15 transition-all cursor-pointer">
              Prøv kalkulatoren
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-line bg-surface">
        <div className="max-w-[1180px] mx-auto px-[clamp(20px,4vw,40px)] py-[clamp(36px,5vw,56px)] grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo variant="dark" height={30} />
            <p className="m-0 mt-4 text-[13.5px] leading-[1.6] text-muted max-w-[34ch]">
              Et hjem for gode leieforhold. Laget for langtidsutleie i Norge — med rolig oversikt for deg og trygghet for de som bor der.
            </p>
          </div>
          {[
            { tittel: 'Produkt', punkter: [
              { t: 'Funksjoner', k: () => skrollTil('funksjoner') },
              { t: 'Priser', k: () => skrollTil('priser') },
              { t: 'Leietakerportal', k: tilLogin },
            ] },
            { tittel: 'Ressurser', punkter: [
              { t: 'Boligkalkulator', k: () => navigate('/kalkulator') },
              { t: 'Guider for utleiere', k: () => navigate('/guider') },
              { t: 'Spørsmål og svar', k: () => skrollTil('sporsmal') },
            ] },
            { tittel: 'Eiendomspro', punkter: [
              { t: 'Logg inn', k: tilLogin },
              { t: 'Kom i gang', k: tilRegistrering },
              { t: 'Kontakt', href: 'mailto:hei@eiendomspro.no' },
            ] },
          ].map(({ tittel, punkter }) => (
            <div key={tittel}>
              <div className="text-[12px] font-extrabold text-muted-2 uppercase tracking-[0.08em] mb-4">{tittel}</div>
              <div className="grid gap-2.5 justify-items-start">
                {punkter.map(({ t, k, href }) => (
                  href ? (
                    <a key={t} href={href} className="text-[14px] font-semibold text-muted hover:text-brand-ink no-underline transition-colors">
                      {t}
                    </a>
                  ) : (
                    <button key={t} onClick={k} className="bg-transparent border-none p-0 text-[14px] font-semibold text-muted hover:text-brand-ink cursor-pointer transition-colors">
                      {t}
                    </button>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-line-soft">
          <div className="max-w-[1180px] mx-auto px-[clamp(20px,4vw,40px)] py-5 flex items-center gap-[18px] flex-wrap">
            <span className="text-[13px] font-medium text-faint">© 2026 Eiendomspro · Langtidsutleie, gjort enkelt</span>
            <div className="flex gap-5 ml-auto">
              {['Personvern', 'Vilkår'].map((t) => (
                <span key={t} className="text-[13px] font-semibold text-muted hover:text-ink cursor-pointer">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
