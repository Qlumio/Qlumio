"use client";

import Link from "next/link";
import { useState } from "react";
import { useUser } from "@/lib/userContext";
import ProfileSelector from "@/components/ProfileSelector";
import type { FamilyMember, Event, EventException, Task } from "@/lib/types";

// ─── Modul-konfigurasjon ───────────────────────────────────────────────────

const ALL_MODULES = [
  { href: "/aktiviteter", title: "Aktiviteter", icon: "📅", roles: ["admin", "member"], description: "Kalender og familieaktiviteter" },
  { href: "/oppgaver", title: "Oppgaver", icon: "✅", roles: ["admin", "member"], description: "Gjøremål og praktiske oppgaver" },
  { href: "/innkjop", title: "Innkjøp", icon: "🛒", roles: ["admin", "member"], description: "Handlelister og innkjøp" },
  { href: "/eiendeler", title: "Eiendeler", icon: "🔧", roles: ["admin"], description: "Oversikt over eiendeler og utstyr" },
  { href: "/okonomi", title: "Økonomi", icon: "💰", roles: ["admin"], description: "Inntekter, utgifter og budsjett" },
  { href: "/planlagte-kostnader", title: "Planlagte kostnader", icon: "📋", roles: ["admin"], description: "Fremtidige og planlagte utgifter" },
  { href: "/lan-forsikring-pensjon", title: "Lån & forsikring", icon: "🛡️", roles: ["admin"], description: "Lån, forsikringer og pensjon" },
  { href: "/innstillinger", title: "Innstillinger", icon: "⚙️", roles: ["admin"], description: "" },
];

// ─── Hjelpefunksjoner ──────────────────────────────────────────────────────

const DAY_NAMES_SHORT = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
const DAY_NAMES_FULL = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
const MONTH_NAMES = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

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

function getDatesRange(fromStr: string, days: number): string[] {
  const result: string[] = [];
  const d = new Date(fromStr + "T00:00:00");
  for (let i = 0; i < days; i++) {
    result.push(formatDate(d));
    d.setDate(d.getDate() + 1);
  }
  return result;
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
  const [completingId, setCompletingId] = useState<string | null>(null);

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

  // Events denne uken (man–søn) og neste uke
  const todayDate = new Date(todayStr + "T00:00:00");
  const dayOfWeek = todayDate.getDay(); // 0=søn
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(todayDate);
  thisMonday.setDate(todayDate.getDate() - daysFromMonday);
  const thisMondayStr = formatDate(thisMonday);

  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(thisMonday.getDate() + 7);
  const nextMondayStr = formatDate(nextMonday);

  const thisWeekDates = getDatesRange(thisMondayStr, 7);
  const nextWeekDates = getDatesRange(nextMondayStr, 7);

  const filterMemberId = isAdmin ? null : freshUser.id;

  // Bygg dagsoversikt
  type DayEvents = { dateStr: string; events: Event[] };

  const thisWeekDays: DayEvents[] = thisWeekDates.map((d) => ({
    dateStr: d,
    events: getEventsForDate(events, exceptions, d, filterMemberId),
  }));

  const nextWeekDays: DayEvents[] = nextWeekDates.map((d) => ({
    dateStr: d,
    events: getEventsForDate(events, exceptions, d, filterMemberId),
  }));

  const hasNextWeekEvents = nextWeekDays.some((d) => d.events.length > 0);

  // Oppgaver for denne brukeren
  const myTasks = tasks.filter((t) => {
    if (isAdmin) return true;
    return t.assigned_to === freshUser.id || t.assigned_to === null;
  });
  const pendingTasks = myTasks.filter((t) => !t.completed);
  const overdueTasks = pendingTasks.filter(
    (t) => t.due_date && t.due_date < todayStr
  );
  const upcomingTasks = pendingTasks.filter(
    (t) => !t.due_date || t.due_date >= todayStr
  );

  const toggleTask = async (taskId: string, completed: boolean) => {
    setCompletingId(taskId);
    const { supabase: sb } = await import("@/lib/supabase");
    await sb.from("tasks").update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq("id", taskId);
    setCompletingId(null);
    window.location.reload();
  };

  const formatDueDate = (due: string | null): string | null => {
    if (!due) return null;
    const d = new Date(due + "T00:00:00");
    if (due === todayStr) return "i dag";
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(todayDate.getDate() + 1);
    if (due === formatDate(tomorrow)) return "i morgen";
    if (due < todayStr) {
      const diff = Math.round((todayDate.getTime() - d.getTime()) / 86400000);
      return `${diff} dag${diff === 1 ? "" : "er"} siden`;
    }
    return `${d.getDate()}. ${MONTH_NAMES[d.getMonth()]}`;
  };

  // I dag-events og forfalt-oppgaver for kompakt snipp
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

        {/* ── Hurtighandlinger ── */}
        <div className="flex gap-2 mb-5">
          <Link
            href="/oppgaver?ny=1"
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 transition-colors flex-1 justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ny oppgave
          </Link>
          <Link
            href="/aktiviteter?ny=1"
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 transition-colors flex-1 justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ny aktivitet
          </Link>
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
              <Link href="/aktiviteter" className="block bg-white px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider">I dag</span>
                  <span className="text-xs text-gray-300">→</span>
                </div>
                <div className="space-y-1.5">
                  {todayEvents.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-2">
                      <span className="text-sm text-gray-800">{ev.title}</span>
                      {ev.start_time && <span className="text-xs text-gray-400">{ev.start_time.slice(0, 5)}</span>}
                    </div>
                  ))}
                </div>
              </Link>
            )}
            {tomorrowEvents.length > 0 && (
              <Link href="/aktiviteter" className="block bg-white px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">I morgen</span>
                  <span className="text-xs text-gray-300">→</span>
                </div>
                <div className="space-y-1.5">
                  {tomorrowEvents.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{ev.title}</span>
                      {ev.start_time && <span className="text-xs text-gray-400">{ev.start_time.slice(0, 5)}</span>}
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

// ─── TaskRow ───────────────────────────────────────────────────────────────

function TaskRow({
  task,
  members,
  dueLabel,
  isOverdue,
  completing,
  onToggle,
}: {
  task: Task;
  members: FamilyMember[];
  dueLabel: string | null;
  isOverdue: boolean;
  completing: boolean;
  onToggle: () => void;
}) {
  const assignee = task.assigned_to ? members.find((m) => m.id === task.assigned_to) : null;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <button
        onClick={onToggle}
        disabled={completing}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          completing ? "border-green-400 bg-green-100" : "border-gray-300 hover:border-green-400"
        }`}
      >
        {completing && <span className="text-green-500 text-xs">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {dueLabel && (
            <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
              {isOverdue ? "⚠️ " : ""}{dueLabel}
            </span>
          )}
          {assignee && (
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${assignee.color}`} />
              <span className="text-xs text-gray-400">{assignee.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
