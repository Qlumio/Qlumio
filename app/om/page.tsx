import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Om Qlumio – Less chaos, more family",
};

// ── Hjelpere ─────────────────────────────────────────────────────────────────

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-7 ${className}`}>
      {children}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full bg-violet-50 text-violet-500 mb-4">
      {children}
    </span>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 mt-4">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed">
          <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "linear-gradient(135deg,#8B5CF6,#22D3EE)" }} />
          {item}
        </li>
      ))}
    </ul>
  );
}

// ── Side ─────────────────────────────────────────────────────────────────────

export default function OmPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(145deg,#7C3AED 0%,#6366F1 45%,#22D3EE 100%)" }}>
        {/* Bakgrunnssirkler */}
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-10 bg-white -top-32 -right-32 pointer-events-none" />
        <div className="absolute w-[300px] h-[300px] rounded-full opacity-10 bg-white -bottom-20 -left-20 pointer-events-none" />

        {/* Nav */}
        <div className="relative z-10 max-w-2xl mx-auto px-6 pt-8 flex items-center gap-3">
          <Link href="/login" className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Tilbake
          </Link>
        </div>

        {/* Hero-innhold */}
        <div className="relative z-10 max-w-2xl mx-auto px-6 py-16 flex flex-col items-center text-center gap-6">
          <Image src="/icon-512x512.png" alt="Qlumio" width={88} height={88} className="drop-shadow-2xl" />
          <div>
            <h1 className="text-5xl font-extrabold text-white tracking-tight mb-3">Qlumio</h1>
            <p className="text-xl font-medium text-white/80">Less chaos, more family</p>
          </div>
          <p className="text-white/70 text-base leading-relaxed max-w-md">
            Familielivet består av langt mer logistikk enn man tror. Kalendere. Aktiviteter. Kostnader. Beskjeder. Planlegging. Hvem gjør hva. Når. Hvor.
          </p>
          <p className="text-white/60 text-sm leading-relaxed max-w-md">
            De fleste familier håndterer dette gjennom en blanding av apper, meldinger, huskelapper og hukommelse. Ikke fordi det fungerer godt — men fordi det egentlig ikke finnes et system laget for familielivet.
          </p>
          <div className="mt-2 inline-block bg-white/15 backdrop-blur-sm rounded-2xl px-6 py-3">
            <p className="text-white font-semibold text-sm">Qlumio er vårt forsøk på å bygge nettopp det.</p>
          </div>
        </div>
      </div>

      {/* ── Innhold ── */}
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-6">

        {/* Hvorfor */}
        <Section>
          <Tag>Hvorfor vi bygger dette</Tag>
          <p className="text-gray-600 text-sm leading-relaxed">
            De fleste digitale verktøy er laget for jobb, produktivitet og enkeltpersoner. Familier fungerer annerledes.
          </p>
          <p className="text-gray-600 text-sm leading-relaxed mt-3">
            Familielivet handler om samarbeid, ansvar, rutiner, økonomi og kontinuerlig koordinering mellom mennesker som lever tett sammen. Likevel finnes det få systemer som faktisk er designet med familien i sentrum.
          </p>
          <p className="text-gray-700 text-sm font-medium mt-4 mb-1">Vi mener familier fortjener bedre verktøy:</p>
          <BulletList items={["Enklere", "Roligere", "Tydeligere", "Mer samlet"]} />
          <p className="text-gray-500 text-sm leading-relaxed mt-4 italic">
            Teknologi bør redusere stress i hverdagen — ikke skape mer av det.
          </p>
        </Section>

        {/* Filosofi */}
        <Section>
          <Tag>Filosofien vår</Tag>
          <p className="text-gray-600 text-sm leading-relaxed mb-1">Vi tror på:</p>
          <BulletList items={[
            "Enkelhet fremfor kompleksitet",
            "Oversikt fremfor kaos",
            "Automatisering fremfor manuelt arbeid",
            "Praktiske løsninger fremfor funksjons-overload",
          ]} />
          <p className="text-gray-500 text-sm leading-relaxed mt-4">
            Qlumio bygges steg for steg, med fokus på det som faktisk gjør hverdagen lettere. Ikke alt trenger å være «smart». Noen ganger handler det bare om å fjerne friksjon.
          </p>
        </Section>

        {/* Økonomi */}
        <Section className="border-violet-100">
          <Tag>Økonomi uten administrasjon</Tag>
          <p className="text-gray-600 text-sm leading-relaxed">
            Et viktig prinsipp i Qlumio er at familier ikke skal bruke tid på å administrere avtaler og tjenester som burde jobbe automatisk i bakgrunnen.
          </p>
          <p className="text-gray-600 text-sm leading-relaxed mt-3">
            Når Qlumio får oversikt over familiens økonomi og tjenesteavtaler, skal plattformen kunne bruke AI til å kontinuerlig undersøke markedet og hente inn bedre alternativer og betingelser.
          </p>
          <div className="mt-4 bg-violet-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider mb-2">Dette gjelder blant annet</p>
            <BulletList items={["Lån", "Forsikringer", "Mobilabonnement", "Strøm", "TV og internett", "Andre løpende avtaler"]} />
          </div>
          <p className="text-gray-600 text-sm leading-relaxed mt-4 font-medium">
            Målet er ikke bare oversikt. Målet er aktiv optimalisering i bakgrunnen.
          </p>
          <p className="text-gray-500 text-sm leading-relaxed mt-3">
            Vi vet at de fleste sjelden undersøker om de kan få bedre rente på lån, billigere forsikring eller bedre avtaler. Ikke fordi det ikke er viktig — men fordi det er tidkrevende, komplisert og lett å utsette. Derfor ønsker vi å gjøre dette automatisk.
          </p>
        </Section>

        {/* Forutse behov */}
        <div className="rounded-2xl border overflow-hidden border-cyan-100">
          <div className="px-7 pt-7 pb-5" style={{ background: "linear-gradient(135deg,#f5f3ff,#ecfeff)" }}>
            <Tag>Et system som forstår familien over tid</Tag>
            <p className="text-gray-600 text-sm leading-relaxed">
              Etter hvert som Qlumio lærer mer om familien, skal systemet kunne hjelpe mer proaktivt i hverdagen.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed mt-3">
              Ved å forstå alder, størrelser, aktiviteter, rutiner, bolig, bil, båt og andre eiendeler — kan Qlumio begynne å forutse behov før de oppstår.
            </p>
          </div>
          <div className="bg-white px-7 py-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Eksempler på fremtidige forslag</p>
            <div className="grid grid-cols-1 gap-2.5">
              {[
                { icon: "👟", text: "Forslag om nye sko eller klær når barn vokser" },
                { icon: "🚗", text: "Varsler om EU-kontroll" },
                { icon: "🔧", text: "Service på bil eller båtmotor" },
                { icon: "🏠", text: "Vedlikehold av bolig" },
                { icon: "📋", text: "Forsikringer som bør oppdateres" },
                { icon: "📦", text: "Abonnementer som ikke lenger brukes" },
                { icon: "🌿", text: "Sesongbaserte innkjøp og oppgaver" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm text-gray-700">{item.text}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mt-5 italic">
              Målet er ikke å skape mer varsling og støy. Målet er å redusere den mentale belastningen som følger med å huske, følge opp og koordinere alt som må gjøres i en familie.
            </p>
          </div>
        </div>

        {/* Cashflow og buffer */}
        <div className="rounded-2xl border overflow-hidden border-violet-100">
          <div className="px-7 pt-7 pb-5" style={{ background: "linear-gradient(135deg,#f5f3ff,#fdf4ff)" }}>
            <Tag>Økonomi tett koblet til hverdagen</Tag>
            <p className="text-gray-600 text-sm leading-relaxed">
              Fremtidige behov Qlumio fanger opp — eller planlagte innkjøp du legger inn selv — er tett integrert med økonomimodulen. Kostnader legges automatisk inn i budsjettet, slik at de aldri er en overraskelse.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed mt-3">
              Vi vet at uforutsette kostnader dukker opp når du minst venter det. Derfor er vårt mål å sørge for best mulige forutsetninger for familieøkonomien.
            </p>
          </div>
          <div className="bg-white px-7 py-5 space-y-4">
            <div className="flex items-start gap-4 bg-violet-50 rounded-xl p-4">
              <span className="text-2xl flex-shrink-0">📊</span>
              <div>
                <p className="text-sm font-semibold text-violet-800 mb-1">Automatisk cashflow-analyse</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Qlumio analyserer kontinuerlig familiens inntekter, faste utgifter og planlagte kostnader. Basert på dette foreslår systemet månedlige avsetninger — slik at dere alltid er forberedt på det som kommer.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-cyan-50 rounded-xl p-4">
              <span className="text-2xl flex-shrink-0">🛡️</span>
              <div>
                <p className="text-sm font-semibold text-cyan-800 mb-1">Buffer for det uventede</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Enten det er en uventet regning, en bil som trenger verkstedsbesøk, eller et barn som har vokst ut av vinterjakkene — Qlumio hjelper familien å bygge opp en buffer som faktisk holder tritt med virkeligheten.
                </p>
              </div>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed italic px-1">
              Planlagte innkjøp kobles automatisk til budsjettet. Ingen manuell dobbeltregistrering, ingen glemte poster.
            </p>
          </div>
        </div>

        {/* Hva Qlumio skal bli */}
        <Section>
          <Tag>Hva Qlumio skal bli</Tag>
          <p className="text-gray-600 text-sm leading-relaxed">
            Qlumio utvikles som et operativsystem for familielivet. Et sted hvor familien kan samle:
          </p>
          <BulletList items={[
            "Planer og aktiviteter",
            "Ansvar og koordinering i hverdagen",
            "Kostnader og økonomisk oversikt",
            "Kommunikasjon og avtaler",
            "Vedlikehold og oppfølging av eiendeler",
          ]} />
          <p className="text-gray-500 text-sm leading-relaxed mt-4 italic">
            I én rolig og sammenhengende opplevelse. Ikke for å optimalisere familielivet. Men for å gi mer plass til det.
          </p>
        </Section>

        {/* Bygget iterativt */}
        <Section>
          <Tag>Bygget iterativt</Tag>
          <p className="text-gray-600 text-sm leading-relaxed">
            Qlumio bygges med en enkel tankegang: starte smått, lære underveis og forbedre kontinuerlig.
          </p>
          <p className="text-gray-500 text-sm leading-relaxed mt-3">
            Vi er mer opptatt av å bygge noe nyttig enn å bygge noe perfekt.
          </p>
        </Section>

        {/* Visjon */}
        <div className="rounded-2xl p-8 text-center" style={{ background: "linear-gradient(145deg,#7C3AED,#6366F1,#22D3EE)" }}>
          <p className="text-white/70 text-sm uppercase tracking-widest font-semibold mb-4">Den langsiktige visjonen</p>
          <p className="text-white text-base leading-relaxed max-w-sm mx-auto">
            Vi ser for oss en fremtid hvor familier bruker mindre tid på administrasjon, koordinering og oppfølging — og mer tid på å leve livet sammen.
          </p>
          <p className="text-white font-extrabold text-2xl mt-6 tracking-tight">Less chaos. More family.</p>
        </div>

        {/* Feedback */}
        <div className="bg-white rounded-2xl border border-gray-100 p-7 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-600">Har du innspill eller forbedringsforslag? De er svært verdifulle i denne fasen.</p>
          <Link href="/feedback"
            className="flex-shrink-0 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#22D3EE)" }}>
            Del tilbakemelding
          </Link>
        </div>

        <p className="text-center text-gray-300 text-xs pb-8">© {new Date().getFullYear()} Qlumio</p>
      </div>
    </main>
  );
}
