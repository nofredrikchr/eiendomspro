export const seedBygg = [
  {
    "id": "mpylvpckriqviyt7tjl",
    "opprettet": "2026-06-03T21:56:09.620Z",
    "gatenavn": "Bjørneveien ",
    "gatenummer": "8",
    "postnummer": "1712",
    "poststed": "Grålum",
    "gardsnummer": "",
    "bruksnummer": "",
    "byggeaar": "",
    "bygningstype": "tomannsbolig",
    "antallEtasjer": "3",
    "beskrivelse": "",
    "bilde": "",
    "leieinntekter": [
      { "id": 1, "navn": "", "belop": "11800" },
      { "id": 1780523620188, "navn": "", "belop": "15200" },
      { "id": 1780523627621, "navn": "", "belop": "6900" },
      { "id": 1780523633821, "navn": "", "belop": "6700" },
      { "id": 1780523638171, "navn": "", "belop": "6500" }
    ],
    "laanModus": "kalkulert",
    "terminbelop": "",
    "laanebelop": "3500000",
    "rentesats": "5",
    "nedbetalingstid": "30",
    "kommunaleAvgifter": "2400",
    "internett": "999",
    "husforsikring": "1420",
    "alarm": "-4",
    "strom": "",
    "leieInkludererStrom": true,
    "forventetStromMnd": "",
    "tilleggskostnader": [],
    "vedlikeholdProsent": "3",
    "kjoepesum": "3000000",
    "oppussing": "1500000",
    "oppussingVedlikehold": "1100000",
    "nyTakst": "5650000",
    "pristigningLeie": "1.5",
    "pristigningKostnader": "1.5",
    "verdistigning": "4",
    "utleiegrad": "95",
    "skattemodus": "privat",
    "regnskapsforer": "",
    "styrehonorar": ""
  }
];

export const seedUtleiere = [
  {
    id: "utleier_pthd_001",
    type: "foretak",
    navn: "PTHD EIENDOM AS",
    orgnummer: "835518442",
    fodselsdato: "",
    epost: "pt@ptfjell.no",
    tlf: "+4791222226",
    adresse: "",
    postnummer: "",
    poststed: "",
    kontonummer: "15202096481",
  }
];

export const seedLeieobjekter = [
  {
    "id": "mpz648964sqruh2c71",
    "opprettet": "2026-06-04T07:22:39.690Z",
    "byggId": "mpylvpckriqviyt7tjl",
    "type": "leilighet",
    "betegnelse": "1.etg",
    "status": "ledig",
    "areal": "70",
    "antallRom": "3",
    "antallSoverom": "2",
    "forventetLeie": "15300",
    "beskrivelse": "",
    "bilde": "",
    "malernummer": "",
    "malepunktId": "",
    "flereRomEnkeltvis": false
  }
];

export const seedKontrakter = [];
