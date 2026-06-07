# Oppussingsbudsjett — Implementasjonsspesifikasjon

## Kontekst

Legg til en ny fane **"Oppussing"** i `src/pages/Bygg/ByggSkjema.jsx`, rett etter "Budsjett"-fanen. Fanen skal kun vises når `existing === true` (dvs. bygget er lagret).

Formålet er at utleier kan sette et totalbudsjett for oppussing/vedlikehold på et bygg, registrere kostnadslinjer med type (vedlikehold vs. påkostning), og følge med på hva som er brukt vs. budsjettert.

---

## 1. Datamodell

Legg til feltet `oppussingsprosjekt` på bygg-objektet i `defaultByggData`:

```js
oppussingsprosjekt: {
  totalBudsjett: '',       // string (kroner), settes av bruker
  poster: [],              // se under
}
```

Hver kostnadspost (`poster`-array):

```js
{
  id: string,              // genId()
  beskrivelse: string,     // f.eks. "Nytt bad", "Maling stue"
  type: 'vedlikehold' | 'paakostning',
  budsjettert: '',         // string (kroner)
  faktisk: '',             // string (kroner) — hva det faktisk kostet
  dato: '',                // ISO-dato (YYYY-MM-DD) for når utgiften ble pådratt
  leverandor: '',          // optional — navn på håndverker/leverandør
  status: 'planlagt' | 'pagaende' | 'fullfort',
}
```

Sørg for at `oppussingsprosjekt` er med i `defaultByggData` og at eksisterende bygg-objekter som mangler feltet gracefully håndteres (default til `{ totalBudsjett: '', poster: [] }`).

---

## 2. Ny fane i ByggSkjema

### 2a. Legg til TabBtn

I fane-raden (der de andre fanene er), legg til:

```jsx
{existing && (
  <TabBtn active={tab === 'oppussing'} onClick={() => setTab('oppussing')}>
    Oppussing
  </TabBtn>
)}
```

Plasser den etter "Budsjett" og før "Oversikt".

### 2b. Innhold for fanen

Legg til `{tab === 'oppussing' && <OppussingTab ... />}` i render-treet.

---

## 3. OppussingTab-komponent

Lag komponenten inline i ByggSkjema.jsx (ikke separat fil). Den mottar:

```jsx
function OppussingTab({ form, setForm }) { ... }
```

Den henter og oppdaterer `form.oppussingsprosjekt`.

### 3a. Hjelpefunksjoner

```js
const prosjekt = form.oppussingsprosjekt || { totalBudsjett: '', poster: [] };
const poster = prosjekt.poster || [];

const totalBudsjett = Number(prosjekt.totalBudsjett) || 0;
const totalBudsjettert = poster.reduce((s, p) => s + (Number(p.budsjettert) || 0), 0);
const totalFaktisk = poster.reduce((s, p) => s + (Number(p.faktisk) || 0), 0);

const faktiskVedlikehold = poster
  .filter(p => p.type === 'vedlikehold')
  .reduce((s, p) => s + (Number(p.faktisk) || 0), 0);

const faktiskPaakostning = poster
  .filter(p => p.type === 'paakostning')
  .reduce((s, p) => s + (Number(p.faktisk) || 0), 0);

const igjenAvBudsjett = totalBudsjett - totalFaktisk;
const progresjonPct = totalBudsjett > 0 ? Math.min(100, (totalFaktisk / totalBudsjett) * 100) : 0;
```

---

## 4. UI-layout

### 4a. Header — Totalbudsjett-input

Øverst: én enkelt input for å sette totalbudsjettet.

```
[ Sett totalbudsjett for oppussing ]
[ 250 000 kr                       ]  ← Input-felt
```

Lagres som `form.oppussingsprosjekt.totalBudsjett`.

### 4b. Oppsummerings-kort (3 kort i grid)

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Totalt budsjett│  │  Faktisk brukt  │  │  Gjenstår       │
│  250 000 kr     │  │  87 500 kr      │  │  162 500 kr     │
│                 │  │  av 250 000     │  │  [grønn/rød]    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

Under kortene: en progress bar (grønn → gul → rød avhengig av hvor mye som er brukt).
- 0–75 %: grønn (`#4ade80`)
- 75–90 %: gul (`#f59e0b`)
- 90–100 %+: rød (`#f87171`)

### 4c. Skattefordeling-boks

En liten informasjonsboks under progress bar:

```
┌──────────────────────────────────────────────────────────────┐
│  ⚖️  Skattemessig fordeling av faktiske kostnader             │
│                                                              │
│  Vedlikehold (fradragsberettiget):    65 000 kr  ✓          │
│  Påkostning (ikke fradragsberettiget): 22 500 kr  ○         │
│                                                              │
│  ℹ️  Vedlikeholdskostnader kan føres som fradrag i           │
│      skattemeldingen (RF-1159). Påkostning aktiveres         │
│      og avskrives over tid (kun for AS).                     │
└──────────────────────────────────────────────────────────────┘
```

Styling: subtil boks med border, lys tekst. Bruk samme stil som andre info-bokser i appen.

### 4d. Kostnadslinjer — tabell

Tabell med disse kolonnene:
```
Beskrivelse | Type | Budsjettert | Faktisk | Dato | Leverandør | Status | [slett]
```

Tomme verdier vises som "—".

**Type**-kolonnen vises som et farget merke:
- `vedlikehold` → grønn chip: "Vedlikehold"
- `paakostning` → gul chip: "Påkostning"

**Status**-kolonnen:
- `planlagt` → grå chip: "Planlagt"
- `pagaende` → blå chip: "Pågående"
- `fullfort` → grønn chip: "Fullført"

Hvert rad er klikkbart og åpner redigeringsmodal (se 4e).

Slett-knapp (søppelkasse-ikon) med bekreftelsesdialog: "Er du sikker på at du vil slette denne posten?"

### 4e. Legg til / rediger post — inline-skjema eller modal

Bruk samme stil som `BekreftModal` eller legg det til som et inline-skjema under tabellen. 

Feltene:
- **Beskrivelse** — tekstfelt (required)
- **Type** — radio/toggle: "Vedlikehold" | "Påkostning"
  - Vis kort forklaring under valget: "Vedlikehold = fradragsberettiget. Påkostning = aktiveres på bygget."
- **Budsjettert beløp** — tallfeld (kr)
- **Faktisk beløp** — tallfelt (kr)
- **Dato** — datofelt
- **Leverandør** — tekstfelt (valgfri)
- **Status** — select: Planlagt / Pågående / Fullført

Knapper: "Lagre" og "Avbryt".

### 4f. Tom-tilstand

Når `poster.length === 0`:

```
        📋
  Ingen kostnadslinjer ennå

  Legg til poster for å spore hva
  du bruker på oppussing og vedlikehold.

  [ + Legg til første post ]
```

---

## 5. Lagring

All data lagres via den eksisterende `setForm`-mekanismen. ByggSkjema lagrer hele `form`-objektet ved submit/autosave som allerede er implementert. Ingen nye storage-nøkler er nødvendig.

Oppdater `oppussingsprosjekt` slik:

```js
const oppdaterProsjekt = (endringer) => {
  setForm(f => ({
    ...f,
    oppussingsprosjekt: {
      ...(f.oppussingsprosjekt || { totalBudsjett: '', poster: [] }),
      ...endringer,
    }
  }));
};

const oppdaterPoster = (nyePoster) => {
  oppdaterProsjekt({ poster: nyePoster });
};
```

---

## 6. Integrasjon med skatterapport

I `src/utils/skatt.js`, i funksjonen `beregnSkattForBygg`, legg til støtte for faktiske vedlikeholdskostnader:

```js
// Hvis bygg har oppussingsprosjekt med faktiske vedlikeholdskostnader,
// bruk summen som vedlikeholdskostnad i stedet for prosentberegning.
const faktiskeVedlikeholdskostnader = (bygg.oppussingsprosjekt?.poster || [])
  .filter(p => p.type === 'vedlikehold' && p.faktisk)
  .reduce((s, p) => s + Number(p.faktisk), 0);

// Bruk faktiske kostnader hvis de er registrert, ellers fall tilbake til prosentberegning
const vedlikeholdAarlig = faktiskeVedlikeholdskostnader > 0
  ? faktiskeVedlikeholdskostnader
  : bruttoLeie * (n(bygg.vedlikeholdProsent || 3) / 100);
```

Legg til en liten merknad i skatterapport-visningen om at faktiske vedlikeholdskostnader brukes (hvis registrert).

---

## 7. Visuell stil

Følg eksisterende designsystem:
- Bakgrunn: `#111113` / `#0d0d0f`
- Border: `#1c1c1f`
- Hover: `hover:bg-white/2`
- Tekst primær: `text-white`
- Tekst sekundær: `text-[#71717a]` / `text-[#52525b]`
- Grønn aksent: `#4ade80`
- Gul aksent: `#C9A84C` / `#f59e0b`
- Rød: `#f87171`
- Fontstil for tall: `fontFamily: 'DM Mono, monospace'` (klasse `num`)
- Avrundede hjørner: `rounded-xl` / `rounded-2xl`
- Bruk eksisterende `Button`, `Input`, `Card`-komponenter

---

## 8. Eksempel på ferdig oppussingsprosjekt-data

```json
{
  "totalBudsjett": "300000",
  "poster": [
    {
      "id": "p_001",
      "beskrivelse": "Baderomsrenovering",
      "type": "paakostning",
      "budsjettert": "150000",
      "faktisk": "162000",
      "dato": "2024-03-15",
      "leverandor": "Hansen VVS AS",
      "status": "fullfort"
    },
    {
      "id": "p_002",
      "beskrivelse": "Maling av alle rom",
      "type": "vedlikehold",
      "budsjettert": "25000",
      "faktisk": "23500",
      "dato": "2024-04-02",
      "leverandor": "Malermester Olsen",
      "status": "fullfort"
    },
    {
      "id": "p_003",
      "beskrivelse": "Nytt kjøkken",
      "type": "paakostning",
      "budsjettert": "80000",
      "faktisk": "",
      "dato": "",
      "leverandor": "",
      "status": "planlagt"
    }
  ]
}
```

---

## 9. Rekkefølge av endringer

1. Legg `oppussingsprosjekt` til i `defaultByggData`
2. Lag `OppussingTab`-komponenten
3. Legg til "Oppussing"-TabBtn
4. Legg til `{tab === 'oppussing' && ...}` i render-treet
5. Oppdater `beregnSkattForBygg` i `skatt.js`

Ingen nye routes, ingen nye filer, ingen nye storage-nøkler. Alt skjer innenfor eksisterende mønster.
