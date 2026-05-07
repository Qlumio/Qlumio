"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useUser } from "@/lib/userContext";
import type { FamilyMember, Event, EventException, Task } from "@/lib/types";

// ─── Konstanter ───────────────────────────────────────────────────────────────

const feedSeenKey = (todayStr: string) => `qlumio_feed_seen_${todayStr}`;

const ALL_MODULES = [
  { href: "/aktiviteter", title: "Aktiviteter", icon: "📅", roles: ["admin", "member"], description: "Ukentlig oversikt over familiens avtaler" },
  { href: "/oppgaver",    title: "Gjøremål",    icon: "✅", roles: ["admin", "member"], description: "Gjøremål og praktiske ting som må gjøres" },
  { href: "/innkjop",     title: "Innkjøp",     icon: "🛒", roles: ["admin", "member"], description: "Handlelister og planlagte kjøp" },
  { href: "/eiendeler",   title: "Eiendeler",   icon: "🔧", roles: ["admin"],           description: "Det vi eier og hva det krever å holde det i gang" },
  { href: "/okonomi",     title: "Økonomi",     icon: "💰", roles: ["admin"],           description: "Oversikt over inntekter, utgifter og fremtidige kostnader" },
];

// ─── Mini-typer for feed ──────────────────────────────────────────────────────

type PlannedExpenseItem = {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
};

type MaintenanceItem = {
  id: string;
  title: string;
  due_date: string;
  asset_name: string;
};

type FeedUrgency = "overdue" | "today" | "upcoming";

type FeedItem = {
  id: string;
  type: "event" | "task" | "expense" | "maintenance";
  urgency: FeedUrgency;
  title: string;
  subtitle: string;
  href: string;
  date: string;
};

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  members: FamilyMember[];
  events: Event[];
  exceptions: EventException[];
  tasks: Task[];
  plannedExpenses: PlannedExpenseItem[];
  maintenanceTasks: MaintenanceItem[];
  todayStr: string;
};

// ─── Hjelpefunksjoner ─────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
  });
}

function formatAmount(n: number): string {
  return n.toLocaleString("nb-NO") + " kr";
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
  memberId: string | null
): Event[] {
  const cellDate = new Date(dateStr + "T00:00:00");
  return events.filter((e) => {
    if (memberId) {
      if (!e.participant_ids.includes(memberId) && e.responsible_member_id !== memberId) return false;
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

function urgencyBadgeLabel(urgency: FeedUrgency, date: string, todayStr: string): string {
  if (urgency === "overdue") return "Forfalt";
  if (urgency === "today")   return "I dag";
  const diff = Math.round(
    (new Date(date + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) / 86_400_000
  );
  if (diff === 1) return "I morgen";
  if (diff <= 3)  return `Om ${diff} dager`;
  return "Nærmer seg";
}

const TYPE_ICON: Record<FeedItem["type"], string> = {
  event:       "📅",
  task:        "✅",
  expense:     "💸",
  maintenance: "🔧",
};

const BADGE_STYLE: Record<FeedUrgency, string> = {
  overdue:  "text-red-500 bg-red-50",
  today:    "text-blue-500 bg-blue-50",
  upcoming: "text-amber-600 bg-amber-50",
};

const BORDER_STYLE: Record<FeedUrgency, string> = {
  overdue:  "border-l-[3px] border-red-300",
  today:    "border-l-[3px] border-blue-400",
  upcoming: "border-l-[3px] border-amber-200",
};

// ─── Feed-bygging ─────────────────────────────────────────────────────────────

function buildFeedCandidates(
  events: Event[],
  exceptions: EventException[],
  tasks: Task[],
  plannedExpenses: PlannedExpenseItem[],
  maintenanceTasks: MaintenanceItem[],
  todayStr: string,
  userId: string,
  isAdmin: boolean
): FeedItem[] {
  const todayMs = new Date(todayStr + "T00:00:00").getTime();
  const addDays = (n: number) => formatDate(new Date(todayMs + n * 86_400_000));

  const tomorrowStr     = addDays(1);
  const twoDaysOutStr   = addDays(2);
  const threeDaysOutStr = addDays(3);
  const sevenDaysOutStr = addDays(7);

  const items: FeedItem[] = [];

  // ── Aktiviteter: i dag + i morgen ──────────────────────────────────────────
  ([todayStr, tomorrowStr] as const).forEach((dateStr, idx) => {
    getEventsForDate(events, exceptions, dateStr, userId).forEach((ev) => {
      items.push({
        id: ev.id,
        type: "event",
        urgency: idx === 0 ? "today" : "upcoming",
        title: ev.title,
        subtitle: ev.start_time
          ? `kl. ${ev.start_time.slice(0, 5)}`
          : idx === 0 ? "Aktivitet i dag" : "Aktivitet i morgen",
        href: "/aktiviteter",
        date: dateStr,
      });
    });
  });

  // ── Gjøremål: forsinket + innen 2 dager ───────────────────────────────────
  tasks
    .filter(
      (t) =>
        !t.completed &&
        t.due_date !== null &&
        (isAdmin || t.assigned_to === userId || t.assigned_to === null)
    )
    .forEach((t) => {
      const d = t.due_date!;
      if (d < todayStr) {
        items.push({
          id: t.id, type: "task", urgency: "overdue",
          title: t.title,
          subtitle: `Forfalt ${formatDisplayDate(d)}`,
          href: "/oppgaver", date: d,
        });
      } else if (d === todayStr) {
        items.push({
          id: t.id, type: "task", urgency: "today",
          title: t.title,
          subtitle: "Gjøremål for i dag",
          href: "/oppgaver", date: d,
        });
      } else if (d <= twoDaysOutStr) {
        items.push({
          id: t.id, type: "task", urgency: "upcoming",
          title: t.title,
          subtitle: `Kommer opp ${formatDisplayDate(d)}`,
          href: "/oppgaver", date: d,
        });
      }
    });

  // ── Planlagte kostnader (kun admin): innen 3 dager ────────────────────────
  if (isAdmin) {
    plannedExpenses
      .filter((e) => e.category !== "innkjop")
      .forEach((e) => {
        const d = e.date;
        const amt = formatAmount(e.amount);
        if (d < todayStr) {
          items.push({
            id: e.id, type: "expense", urgency: "overdue",
            title: e.title,
            subtitle: `${amt} – forfalt ${formatDisplayDate(d)}`,
            href: "/okonomi?tab=planlagte", date: d,
          });
        } else if (d === todayStr) {
          items.push({
            id: e.id, type: "expense", urgency: "today",
            title: e.title,
            subtitle: `${amt} – forfaller i dag`,
            href: "/okonomi?tab=planlagte", date: d,
          });
        } else if (d <= threeDaysOutStr) {
          items.push({
            id: e.id, type: "expense", urgency: "upcoming",
            title: e.title,
            subtitle: `${amt} – nærmer seg`,
            href: "/okonomi?tab=planlagte", date: d,
          });
        }
      });
  }

  // ── Vedlikehold på eiendeler (kun admin): innen 7 dager ───────────────────
  if (isAdmin) {
    maintenanceTasks.forEach((m) => {
      const d = m.due_date;
      if (d < todayStr) {
        items.push({
          id: m.id, type: "maintenance", urgency: "overdue",
          title: m.title,
          subtitle: `${m.asset_name} – forfalt ${formatDisplayDate(d)}`,
          href: "/eiendeler", date: d,
        });
      } else if (d === todayStr) {
        items.push({
          id: m.id, type: "maintenance", urgency: "today",
          title: m.title,
          subtitle: `${m.asset_name} – i dag`,
          href: "/eiendeler", date: d,
        });
      } else if (d <= sevenDaysOutStr) {
        items.push({
          id: m.id, type: "maintenance", urgency: "upcoming",
          title: m.title,
          subtitle: `${m.asset_name} – forfaller snart`,
          href: "/eiendeler", date: d,
        });
      }
    });
  }

  // Sorter: forsinket (eldst) → i dag → kommende (nærmest)
  const order: Record<FeedUrgency, number> = { overdue: 0, today: 1, upcoming: 2 };
  items.sort((a, b) => {
    const u = order[a.urgency] - order[b.urgency];
    return u !== 0 ? u : a.date.localeCompare(b.date);
  });

  return items;
}

// ─── Komponent ────────────────────────────────────────────────────────────────

export default function HomeView({
  members,
  events,
  exceptions,
  tasks,
  plannedExpenses,
  maintenanceTasks,
  todayStr,
}: Props) {
  const { currentUser, isLoaded } = useUser();
  const [feedItems, setFeedItems] = useState<FeedItem[] | null>(null);

  // Disse må stå før tidlige returer (Rules of Hooks)
  const freshUser = currentUser
    ? (members.find((m) => m.id === currentUser.id) ?? currentUser)
    : null;
  const isAdmin = freshUser?.permission_level === "admin";

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allCandidates = useMemo((): FeedItem[] => {
    if (!freshUser) return [];
    return buildFeedCandidates(
      events, exceptions, tasks, plannedExpenses, maintenanceTasks,
      todayStr, freshUser.id, isAdmin
    );
  // freshUser?.id og isAdmin fanger nødvendige endringer uten ustabile referanser
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshUser?.id, isAdmin, events, exceptions, tasks, plannedExpenses, maintenanceTasks, todayStr]);

  // Filtrer mot localStorage – vis hvert element kun én gang per urgency-nivå
  useEffect(() => {
    if (!freshUser) return;

    const SEEN_KEY = feedSeenKey(todayStr);
    let seenMap: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      seenMap = raw ? JSON.parse(raw) : {};
    } catch { /* ignore */ }

    const visible = allCandidates
      .filter((item) => seenMap[`${item.id}_${item.type}`] !== item.urgency)
      .slice(0, 5);

    // Marker viste elementer som sett med gjeldende urgency
    const updated = { ...seenMap };
    visible.forEach((item) => {
      updated[`${item.id}_${item.type}`] = item.urgency;
    });
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(updated)); } catch { /* ignore */ }

    setFeedItems(visible);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCandidates, freshUser?.id]);

  // ── Tidlige returer (etter hooks) ─────────────────────────────────────────
  if (!isLoaded || !currentUser || !freshUser) return null;

  const visibleModules = ALL_MODULES.filter((mod) =>
    mod.roles.includes(freshUser.permission_level)
  );

  const pendingTasks = tasks.filter(
    (t) =>
      !t.completed &&
      (isAdmin || t.assigned_to === freshUser.id || t.assigned_to === null)
  );

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
          <Link
            href="/innstillinger"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors"
            title="Innstillinger"
          >
            <div className={`w-8 h-8 rounded-full ${freshUser.color} flex items-center justify-center text-white text-sm font-bold`}>
              {freshUser.name[0].toUpperCase()}
            </div>
          </Link>
        </div>

        {/* ── I dag-feed ── */}
        {feedItems !== null && feedItems.length > 0 && (
          <div className="space-y-2 mb-5">
            {feedItems.map((item) => (
              <Link
                key={`${item.id}_${item.type}`}
                href={item.href}
                className={`flex items-center gap-3 bg-white px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors ${BORDER_STYLE[item.urgency]}`}
              >
                <span className="text-lg flex-shrink-0">{TYPE_ICON[item.type]}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-800 truncate">{item.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">{item.subtitle}</div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${BADGE_STYLE[item.urgency]}`}>
                  {urgencyBadgeLabel(item.urgency, item.date, todayStr)}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* ── Moduler ── */}
        <div className="space-y-3">
          {visibleModules.map((mod) => {
            const badge =
              mod.href === "/oppgaver" && pendingTasks.length > 0
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
                  <div className="font-semibold text-gray-900">{mod.title}</div>
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
        </div>

      </div>
    </main>
  );
}
