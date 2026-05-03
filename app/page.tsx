import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Qlumio",
  description: "Family operating system",
};

const modules = [
  {
    href: "/aktiviteter",
    title: "Aktiviteter",
    description: "Ukentlig oversikt over familiens gjøremål og avtaler",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    available: true,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    href: "/eiendeler",
    title: "Eiendeler",
    description: "Oversikt over eiendeler og kommende vedlikeholdskostnader",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ),
    available: true,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
  },
  {
    href: "/okonomi",
    title: "Familie økonomi",
    description: "Cashflow og fremtidige kostnader samlet på ett sted",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    available: true,
    color: "text-violet-600",
    bg: "bg-violet-500/10",
  },
  {
    href: "/innkjop",
    title: "Innkjøp",
    description: "Dagligvareliste og planlagte innkjøp som ski, sykkel og sesongvarer",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    available: true,
    color: "text-green-600",
    bg: "bg-green-500/10",
  },
  {
    href: "/lan-forsikring-pensjon",
    title: "Lån, forsikringer og pensjon",
    description: "Oversikt over lån, forsikringsavtaler og pensjonssparing",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    available: true,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
  },
  {
    href: "/planlagte-kostnader",
    title: "Planlagte kostnader",
    description: "Semesteravgifter, cuper, ferier og andre forventede engangskostnader",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    available: true,
    color: "text-violet-600",
    bg: "bg-violet-500/10",
  },
  {
    href: "/feedback",
    title: "Tilbakemeldinger",
    description: "Send inn forslag og se hva andre ønsker seg",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    available: true,
    color: "text-pink-600",
    bg: "bg-pink-500/10",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 pt-4">
          <div>
            <h1 className="text-3xl font-bold">Qlumio</h1>
            <p className="text-gray-500 text-sm mt-0.5">Less Chaos, more family time</p>
          </div>
          <Link
            href="/innstillinger"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Innstillinger
          </Link>
        </div>

        {/* Moduler */}
        <div className="space-y-3">
          {modules.map((mod) =>
            mod.available ? (
              <Link
                key={mod.href}
                href={mod.href}
                className="flex items-center gap-4 p-5 bg-white hover:bg-gray-100 rounded-xl transition-colors group"
              >
                <div className={`${mod.bg} ${mod.color} p-3 rounded-xl flex-shrink-0`}>
                  {mod.icon}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold group-hover:text-gray-900 transition-colors">{mod.title}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{mod.description}</div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400 group-hover:text-gray-500 ml-auto flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <div
                key={mod.href}
                className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl opacity-50 cursor-not-allowed"
              >
                <div className={`${mod.bg} ${mod.color} p-3 rounded-xl flex-shrink-0`}>
                  {mod.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{mod.title}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wide">Kommer snart</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">{mod.description}</div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Om appen */}
        <Link
          href="/om"
          className="flex items-center gap-4 mt-4 p-4 bg-white hover:bg-gray-100 rounded-xl transition-colors group"
        >
          <div className="bg-gray-100 text-gray-500 p-2.5 rounded-xl flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm group-hover:text-gray-900 transition-colors">Om Qlumio</div>
            <div className="text-xs text-gray-400 mt-0.5">Hva er Qlumio og hva er visjonen?</div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300 group-hover:text-gray-400 ml-auto flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

      </div>
    </main>
  );
}
