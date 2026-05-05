"use client";

import Link from "next/link";
import { useUser } from "@/lib/userContext";
import ProfileSelector from "@/components/ProfileSelector";
import type { FamilyMember, Event, EventException, Task } from "@/lib/types";

// ─── Modul-konfigurasjon ───────────────────────────────────────────────────

const ALL_MODULES = [
  { href: "/aktiviteter", title: "Aktiviteter", icon: "📅", roles: ["admin", "member"], description: "Ukentlig oversikt over familiens avtaler" },
  { href: "/oppgaver", title: "Gjøremål", icon: "✅", roles: ["admin", "member"], description: "Gjøremål og praktiske ting som må gjøres" },
  { href: "/innkjop", title: "Innkjøp", icon: "🛒", roles: ["admin", "member"], description: "Handlelister og planlagte kjøp" },
  { href: "/eiendeler", title: "Eiendeler", icon: "🔧", roles: ["admin"], description: "Det vi eier og hva det krever å holde det i gang" },
  { href: "/okonomi", title: "Økonomi", icon: "💰", roles: ["admin"], description: "Oversikt over inntekter, utgifter og fremtidige kostnader" },
  { href: "/innstillinger", title: "Innstillinger", icon: "⚙️", roles: ["admin"], description: "" },
];

// ─── Hjelpefunksjoner ──────────────────────────────────────────────────────


function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 10) return `God morgen, ${name}! ☀️`;
  if (h < 12) return `God formiddag, ${name}!`;
  if (h < 17) return `God ettermiddag, ${name}! 👋`;
  if (h < 21) return `God kveld, ${name}! 🌙`;
  return `God natt, ${name}! 🌙`;
}

function getEventsForDate(
  events: Event[],
  exceptions: EventException[],
  dateStr: string,
  memberId: string | null // null = alle
): Event[] {
  const cellDate = new Date(dateStr + "T00:00:00");
  return events.filter((e) => {
    // Filtrer på deltaker eller ansvarlig
    if (memberId) {
      const isParticipant = e.participant_ids.includes(memberId);
      const isResponsible = e.responsible_member_id === memberId;
      if (!isParticipant && !isResponsible) return false;
    }
    if (!e.recurring) {
      const start = new Date(e.date + "T00:00:00");
      const end = e.end_date ? new Date(e.end_date + "T00:00:00") : start;
      return cellDate >= start && cellDate <= end;
    }
    const eventDay = new Date(e.date + "T00:00:00").getDay();
    if (cellDate.getDay() !== eventDay) return false;
    return !exceptions.some((ex) => ex.event_id === e.id && ex.date === dateStr);
  });
}

// ─── Props ─────────────────────────────────────────────────────────────────

type Props = {
  members: FamilyMember[];
  events: Event[];
  exceptions: EventException[];
  tasks: Task[];
  todayStr: string;
};

// ─── Komponent ─────────────────────────────────────────────────────────────

export default function HomeView({ members, events, exceptions, tasks, todayStr }: Props) {
  const { currentUser, setCurrentUser, isLoaded } = useUser();

  if (!isLoaded) return null;
  if (!currentUser) return <ProfileSelector members={members} />;

  const freshUser = members.find((m) => m.id === currentUser.id) ?? currentUser;
  const isAdmin = freshUser.permission_level === "admin";
  const hasAnyAdmin = members.some((m) => m.permission_level === "admin");
  const showSettings = isAdmin || !hasAnyAdmin;

  const visibleModules = ALL_MODULES.filter((mod) => {
    if (mod.href === "/innstillinger") return showSettings;
    return mod.roles.includes(freshUser.permission_level);
  });

  const todayDate = new Date(todayStr + "T00:00:00");
  const filterMemberId = freshUser.id;

  // Oppgaver for denne brukeren
  const myTasks = tasks.filter((t) => {
    if (isAdmin) return true;
    return t.assigned_to === freshUser.id || t.assigned_to === null;
  });
  const pendingTasks = myTasks.filter((t) => !t.completed);
  const overdueTasks = pendingTasks.filter(
    (t) => t.due_date && t.due_date < todayStr
  );

  // I dag/i morgen-events for kompakt snipp
  const todayEvents = getEventsForDate(events, exceptions, todayStr, filterMemberId);
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(todayDate.getDate() + 1);
  const tomorrowStr = formatDate(tomorrowDate);
  const tomorrowEvents = getEventsForDate(events, exceptions, tomorrowStr, filterMemberId);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-lg mx-auto px-4 pb-10">

        {/* ── Header ── */}
        <div className="flex items-center justify-between pt-8 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{getGreeting(freshUser.name)}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date(todayStr + "T00:00:00").toLocaleDateString("nb-NO", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </p>
          </div>
          <button
            onClick={() => setCurrentUser(null)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors"
            title="Bytt bruker"
          >
            <div className={`w-8 h-8 rounded-full ${freshUser.color} flex items-center justify-center text-white text-sm font-bold`}>
              {freshUser.name[0].toUpperCase()}
            </div>
          </button>
        </div>

        {/* ── Kompakt i dag / i morgen + forfalt ── */}
        {(todayEvents.length > 0 || tomorrowEvents.length > 0 || overdueTasks.length > 0) && (
          <div className="space-y-2 mb-5">
            {overdueTasks.length > 0 && (
              <Link href="/oppgaver" className="flex items-center gap-3 bg-red-50 px-4 py-3 rounded-xl hover:bg-red-100 transition-colors">
                <span className="text-base">⚠️</span>
                <span className="text-sm text-red-600 font-medium">
                  {overdueTasks.length} forfalt{overdueTasks.length === 1 ? " oppgave" : "e oppgaver"}
                </span>
                <span className="ml-auto text-xs text-red-300">→</span>
              </Link>
            )}
            {todayEvents.length > 0 && (
              <Link href="/aktiviteter" className="block bg-white px-4 py-4 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">I dag</span>
                  <span className="text-xs text-gray-300">→</span>
                </div>
                <div className="space-y-3">
                  {todayEvents.map((ev) => (
                    <div key={ev.id} className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-gray-800">{ev.title}</span>
                      {ev.start_time && <span className="text-sm text-gray-400 flex-shrink-0">{ev.start_time.slice(0, 5)}</span>}
                    </div>
                  ))}
                </div>
              </Link>
            )}
            {tomorrowEvents.length > 0 && (
              <Link href="/aktiviteter" className="block bg-white px-4 py-4 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">I morgen</span>
                  <span className="text-xs text-gray-300">→</span>
                </div>
                <div className="space-y-3">
                  {tomorrowEvents.map((ev) => (
                    <div key={ev.id} className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-gray-600">{ev.title}</span>
                      {ev.start_time && <span className="text-sm text-gray-400 flex-shrink-0">{ev.start_time.slice(0, 5)}</span>}
                    </div>
                  ))}
                </div>
              </Link>
            )}
          </div>
        )}

        {/* ── Moduler ── */}
        <div className="space-y-3">
          {visibleModules.filter((m) => m.href !== "/innstillinger").map((mod) => {
            // Badge for oppgaver
            const badge = mod.href === "/oppgaver" && pendingTasks.length > 0
              ? pendingTasks.length
              : null;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="flex items-center gap-4 p-5 bg-white hover:bg-gray-100 rounded-xl transition-colors group"
              >
                <div className="text-3xl flex-shrink-0">{mod.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 group-hover:text-gray-900">{mod.title}</div>
                  <div className="text-sm text-gray-400 mt-0.5">{mod.description}</div>
                </div>
                {badge !== null && (
                  <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                    {badge}
                  </span>
                )}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-300 group-hover:text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            );
          })}
          {showSettings && (
            <Link
              href="/innstillinger"
              className="flex items-center gap-4 p-4 bg-white hover:bg-gray-100 rounded-xl transition-colors group"
            >
              <div className="text-2xl flex-shrink-0">⚙️</div>
              <div className="flex-1 font-medium text-gray-600 group-hover:text-gray-900">Innstillinger</div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

      </div>
    </main>
  );
}

