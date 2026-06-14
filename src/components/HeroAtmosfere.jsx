import { useEffect, useRef } from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
   HeroAtmosfere — rolig, varm bokeh-atmosfære bak hero (Three.js).
   Myke, ute-av-fokus lyssirkler i merkevarepaletten (mint, teal, amber, krem)
   som driver sakte og parallakserer mot musa — som sollys gjennom løv, slik
   det skimtes i forsidefotoene. Bevisst subtil: skal gi dybde og varme, ikke
   stjele fokus fra overskriften.

   Robusthet:
   - Three.js lastes dynamisk i en effekt → blokkerer ALDRI første paint (LCP).
   - `prefers-reduced-motion` / mangler WebGL → én stille ramme (ingen loop).
   - Pauser når hero er ute av viewporten (IntersectionObserver) og når fanen
     er skjult (visibilitychange). DPR kappes til 1.5. Alt ryddes ved unmount.
   ──────────────────────────────────────────────────────────────────────────── */

// Merkevaretoner (RGB 0–1). Vekt mot myk mint/krem, med teal og amber som krydder.
const TONER = [
  [0.89, 0.95, 0.94], // mint
  [0.96, 0.93, 0.84], // amber-bg
  [0.78, 0.91, 0.88], // mint-line
  [0.05, 0.58, 0.52], // teal (sjelden, lav opasitet)
  [0.93, 0.97, 0.96], // mint-soft
  [0.99, 0.98, 0.95], // krem
];

export function HeroAtmosfere({ className = '' }) {
  const vert = useRef(null);

  useEffect(() => {
    const node = vert.current;
    if (!node) return;

    // Bokeh-flaten er ren dekorasjon. Hopp helt over (last ikke engang Three) når
    // brukeren ber om redusert bevegelse eller datasparing — da gir en stille
    // ramme ingenting, og vi sparer dem for ~180 kB.
    const redusert = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const datasparing = navigator.connection?.saveData;
    if (redusert || datasparing) return;

    let avbrutt = false;
    let renderer, scene, camera, gruppe, tekstur, ro;
    let raf = 0;
    const ryddListe = [];

    // Musmål (normalisert) + glattet posisjon for parallakse.
    const mus = { x: 0, y: 0 };
    const glatt = { x: 0, y: 0 };

    (async () => {
      let THREE;
      try {
        THREE = await import('three');
      } catch {
        return; // klarer vi ikke å laste Three, lar vi hero stå ren
      }
      if (avbrutt || !vert.current) return;

      const b = () => node.clientWidth || 1;
      const h = () => node.clientHeight || 1;

      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      } catch {
        return; // ingen WebGL — la hero stå ren
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(b(), h());
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
      node.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(52, b() / h(), 0.1, 100);
      camera.position.z = 10;

      // Myk radial bokeh-tekstur (hvitt senter → gjennomsiktig kant).
      const lerret = document.createElement('canvas');
      lerret.width = lerret.height = 128;
      const ctx = lerret.getContext('2d');
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      tekstur = new THREE.CanvasTexture(lerret);

      gruppe = new THREE.Group();
      scene.add(gruppe);

      // Deterministisk «tilfeldighet» (ingen Math.random — gir stabil komposisjon).
      const frø = (i, k) => {
        const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
        return v - Math.floor(v); // 0–1
      };

      const ANTALL = 30;
      const bobler = [];
      for (let i = 0; i < ANTALL; i++) {
        const tone = TONER[Math.floor(frø(i, 1) * TONER.length) % TONER.length];
        const erTeal = tone[0] < 0.2;
        const mat = new THREE.SpriteMaterial({
          map: tekstur,
          color: new THREE.Color(tone[0], tone[1], tone[2]),
          transparent: true,
          opacity: erTeal ? 0.12 + frø(i, 2) * 0.08 : 0.22 + frø(i, 2) * 0.26,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(mat);
        const skala = 1.6 + frø(i, 3) * 4.2;
        sprite.scale.set(skala, skala, 1);
        const x = (frø(i, 4) - 0.5) * 18;
        const y = (frø(i, 5) - 0.5) * 11;
        const z = (frø(i, 6) - 0.5) * 5;
        sprite.position.set(x, y, z);
        gruppe.add(sprite);
        bobler.push({
          sprite, baseX: x, baseY: y,
          fart: 0.06 + frø(i, 7) * 0.12,
          fase: frø(i, 8) * Math.PI * 2,
          amp: 0.25 + frø(i, 9) * 0.5,
          dybde: (z + 2.5) / 5, // 0–1: nære bobler parallakserer mer
        });
      }

      const tegn = (t) => {
        glatt.x += (mus.x - glatt.x) * 0.05;
        glatt.y += (mus.y - glatt.y) * 0.05;
        for (const o of bobler) {
          o.sprite.position.x = o.baseX + Math.sin(t * o.fart + o.fase) * o.amp + glatt.x * o.dybde * 1.6;
          o.sprite.position.y = o.baseY + Math.cos(t * o.fart * 0.8 + o.fase) * o.amp + glatt.y * o.dybde * 1.2;
        }
        gruppe.rotation.z = glatt.x * 0.02;
        renderer.render(scene, camera);
      };

      let kjorer = false;
      const start = () => {
        if (kjorer || redusert || avbrutt) return;
        kjorer = true;
        let forrige = 0;
        const loop = (ms) => {
          if (!kjorer) return;
          raf = requestAnimationFrame(loop);
          // ~45 fps tak — rolig nok, sparer batteri
          if (ms - forrige < 22) return;
          forrige = ms;
          tegn(ms / 1000);
        };
        raf = requestAnimationFrame(loop);
      };
      const stopp = () => { kjorer = false; if (raf) cancelAnimationFrame(raf); raf = 0; };

      // Pause når hero er ute av syne.
      let synlig = true;
      const io = new IntersectionObserver(([e]) => {
        synlig = e.isIntersecting;
        if (synlig && !document.hidden) start(); else stopp();
      }, { threshold: 0 });
      io.observe(node);
      ryddListe.push(() => io.disconnect());

      const vedSynlighet = () => { if (document.hidden) stopp(); else if (synlig) start(); };
      document.addEventListener('visibilitychange', vedSynlighet);
      ryddListe.push(() => document.removeEventListener('visibilitychange', vedSynlighet));

      const vedMus = (e) => {
        mus.x = (e.clientX / window.innerWidth - 0.5) * 2;
        mus.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener('pointermove', vedMus, { passive: true });
      ryddListe.push(() => window.removeEventListener('pointermove', vedMus));

      ro = new ResizeObserver(() => {
        if (!renderer) return;
        camera.aspect = b() / h();
        camera.updateProjectionMatrix();
        renderer.setSize(b(), h());
        tegn(performance.now() / 1000);
      });
      ro.observe(node);
      ryddListe.push(() => ro.disconnect());

      // Tegn alltid én ramme (også ved redusert bevegelse), så start loopen.
      tegn(0);
      start();

      // Eksponer opprydding av Three-objekter.
      ryddListe.push(() => {
        stopp();
        bobler.forEach((o) => o.sprite.material.dispose());
        tekstur?.dispose();
        renderer?.dispose();
        if (renderer?.domElement?.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      });
    })();

    return () => {
      avbrutt = true;
      ryddListe.forEach((f) => { try { f(); } catch { /* ignorer */ } });
    };
  }, []);

  return <div ref={vert} aria-hidden="true" className={`pointer-events-none ${className}`} />;
}
