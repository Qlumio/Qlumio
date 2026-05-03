import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Om Qlumio",
};

export default function OmPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Hjem
          </Link>
          <div className="w-px h-5 bg-gray-200" />
          <h1 className="text-lg font-semibold">Om Qlumio</h1>
        </div>

        {/* Intro */}
        <div className="bg-white rounded-xl p-5 mb-4">
          <p className="text-gray-700 leading-relaxed">
            Qlumio er utviklet for å gi familier bedre oversikt, struktur og kontroll i hverdagen.
          </p>
          <p className="text-gray-500 text-sm leading-relaxed mt-3">
            I dag håndteres avtaler, eiendeler, vedlikehold og økonomi ofte i separate verktøy – eller ikke i det hele tatt. Dette skaper fragmentert informasjon, dårlig beslutningsgrunnlag og unødvendig stress. Qlumio er bygget for å samle dette i ett helhetlig system.
          </p>
        </div>

        {/* Tre kjerneområder */}
        <div className="bg-white rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Tre kjerneområder</h2>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0 text-base">📅</div>
              <div>
                <div className="font-medium text-sm">Hendelser</div>
                <div className="text-xs text-gray-500 mt-0.5">Hva som skjer – aktiviteter, avtaler og planer</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0 text-base">🏠</div>
              <div>
                <div className="font-medium text-sm">Ressurser</div>
                <div className="text-xs text-gray-500 mt-0.5">Hva dere eier og har ansvar for – bolig, bil, utstyr og eiendeler</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center flex-shrink-0 text-base">💰</div>
              <div>
                <div className="font-medium text-sm">Kostnader</div>
                <div className="text-xs text-gray-500 mt-0.5">Hva ting faktisk koster – både nå og over tid</div>
              </div>
            </div>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mt-4">
            Ved å koble disse sammen kan Qlumio gi bedre innsikt i fremtidige behov, spesielt knyttet til vedlikehold og økonomi. Målet er å gjøre det enklere å planlegge, prioritere og unngå uforutsette utgifter.
          </p>
        </div>

        {/* Inspirasjon */}
        <div className="bg-white rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Inspirasjon</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Qlumio er inspirert av hvordan virksomheter bruker systemer som ERP for å holde kontroll på eiendeler og økonomi – men tilpasset privatpersoner og familier. Ambisjonen er å gi samme struktur og forutsigbarhet i privatlivet, uten kompleksiteten.
          </p>
        </div>

        {/* MVP + AI */}
        <div className="bg-white rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tidlig versjon</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Dette er en tidlig versjon (MVP). Fokus er på å teste kjerneidéen i praksis og utvikle løsningen steg for steg basert på reelle behov og tilbakemeldinger. Det er allerede identifisert et bredt spekter av funksjoner og utvidelser som vil bli introdusert over tid.
          </p>
          <p className="text-gray-500 text-sm leading-relaxed mt-3">
            Kunstig intelligens vil spille en sentral rolle i denne utviklingen. Målet er at Qlumio ikke bare skal gi oversikt, men også bidra aktivt med anbefalinger, automatisering og innsikt – for eksempel ved å forutse vedlikeholdsbehov, estimere fremtidige kostnader og foreslå smartere prioriteringer.
          </p>
          <p className="text-gray-500 text-sm leading-relaxed mt-3">
            På sikt er målet å gjøre Qlumio til et komplett «familie-operativsystem», der planlegging, eiendelsstyring og økonomi henger sømløst sammen – støttet av intelligente verktøy som gjør hverdagen enklere.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8">
          <p className="text-sm text-gray-700 leading-relaxed">
            Har du innspill eller forbedringsforslag, er de svært verdifulle i denne fasen.
          </p>
          <Link
            href="/feedback"
            className="inline-flex items-center gap-1.5 mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Del tilbakemelding →
          </Link>
        </div>

        {/* Tagline */}
        <p className="text-center text-gray-400 text-sm italic">Less chaos, more family.</p>

      </div>
    </main>
  );
}
