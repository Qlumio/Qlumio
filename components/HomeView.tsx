"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useUser } from "@/lib/userContext";
import { supabase, clearAuthCookies } from "@/lib/supabase/client";
import type { FamilyMember, Event, EventException, Task } from "@/lib/types";
import OnboardingCard from "@/components/OnboardingCard";
import QuickAddBox from "@/components/quick-add/QuickAddBox";
import ThemeToggle from "@/components/ThemeToggle";
import { QLogo } from "@/components/QlumioBrand";
import {
  AktiviteterIkon,
  GjoremalIkon,
  InnkjopIkon,
  EiendelerIkon,
  OkonomIkon,
} from "@/components/ModuleIcons";

// ─── Konstanter ───────────────────────────────────────────────────────────────

const feedSeenKey = (todayStr: string) => `qlumio_feed_seen_${todayStr}`;

// ─── Mini-typer ───────────────────────────────────────────────────────────────

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
  participantIds?: string[];
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
  onboardingCounts: { memberCount: number; eventCount: number; expenseCount: number };
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
  if (h < 10) return `God morgen, ${name}`;
  if (h < 12) return `God formiddag, ${name}`;
  if (h < 17) return `God ettermiddag, ${name}`;
  if (h < 21) return `God kveld, ${name}`;
  return `God natt, ${name}`;
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
  if (urgency === "today") return "I dag";
  const diff = Math.round(
    (new Date(date + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) / 86_400_000
  );
  if (diff === 1) return "I morgen";
  if (diff <= 3) return `Om ${diff} dager`;
  return "Nærmer seg";
}

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

  // Aktiviteter: i dag + i morgen
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
        participantIds: ev.participant_ids ?? [],
      });
    });
  });

  // Gjøremål: forsinket + innen 2 dager
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
        items.push({ id: t.id, type: "task", urgency: "overdue", title: t.title, subtitle: `Forfalt ${formatDisplayDate(d)}`, href: "/oppgaver", date: d });
      } else if (d === todayStr) {
        items.push({ id: t.id, type: "task", urgency: "today", title: t.title, subtitle: "Gjøremål for i dag", href: "/oppgaver", date: d });
      } else if (d <= twoDaysOutStr) {
        items.push({ id: t.id, type: "task", urgency: "upcoming", title: t.title, subtitle: `Kommer opp ${formatDisplayDate(d)}`, href: "/oppgaver", date: d });
      }
    });

  // Planlagte kostnader (kun admin)
  if (isAdmin) {
    plannedExpenses
      .filter((e) => e.category !== "innkjop")
      .forEach((e) => {
        const d = e.date;
        const amt = formatAmount(e.amount);
        if (d < todayStr) {
          items.push({ id: e.id, type: "expense", urgency: "overdue", title: e.title, subtitle: `${amt} – forfalt ${formatDisplayDate(d)}`, href: "/okonomi?tab=planlagte", date: d });
        } else if (d === todayStr) {
          items.push({ id: e.id, type: "expense", urgency: "today", title: e.title, subtitle: `${amt} – forfaller i dag`, href: "/okonomi?tab=planlagte", date: d });
        } else if (d <= threeDaysOutStr) {
          items.push({ id: e.id, type: "expense", urgency: "upcoming", title: e.title, subtitle: `${amt} – nærmer seg`, href: "/okonomi?tab=planlagte", date: d });
        }
      });
  }

  // Vedlikehold (kun admin)
  if (isAdmin) {
    maintenanceTasks.forEach((m) => {
      const d = m.due_date;
      if (d < todayStr) {
        items.push({ id: m.id, type: "maintenance", urgency: "overdue", title: m.title, subtitle: `${m.asset_name} – forfalt ${formatDisplayDate(d)}`, href: "/eiendeler", date: d });
      } else if (d === todayStr) {
        items.push({ id: m.id, type: "maintenance", urgency: "today", title: m.title, subtitle: `${m.asset_name} – i dag`, href: "/eiendeler", date: d });
      } else if (d <= sevenDaysOutStr) {
        items.push({ id: m.id, type: "maintenance", urgency: "upcoming", title: m.title, subtitle: `${m.asset_name} – forfaller snart`, href: "/eiendeler", date: d });
      }
    });
  }

  const order: Record<FeedUrgency, number> = { overdue: 0, today: 1, upcoming: 2 };
  items.sort((a, b) => {
    const u = order[a.urgency] - order[b.urgency];
    return u !== 0 ? u : a.date.localeCompare(b.date);
  });

  return items;
}

// ─── SVG-ikoner (feed) ────────────────────────────────────────────────────────

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconCheckSquare({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3 3L22 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function IconCoin({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v1m0 8v1m-3-5h6m-6 0a3 3 0 016 0" />
    </svg>
  );
}

function IconWrench({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function IconShoppingCart({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6" />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-4 4 4 4-6" />
    </svg>
  );
}

type FeedItemType = FeedItem["type"];

function FeedIcon({ type, className }: { type: FeedItemType; className?: string }) {
  if (type === "event")       return <IconCalendar className={className} />;
  if (type === "task")        return <IconCheckSquare className={className} />;
  if (type === "expense")     return <IconCoin className={className} />;
  if (type === "maintenance") return <IconWrench className={className} />;
  return null;
}

// ─── Module-definisjon ────────────────────────────────────────────────────────

const ALL_MODULES = [
  { href: "/aktiviteter", title: "Aktiviteter", roles: ["owner", "admin", "member"], Icon: AktiviteterIkon },
  { href: "/oppgaver",    title: "Gjøremål",    roles: ["owner", "admin", "member"], Icon: GjoremalIkon },
  { href: "/innkjop",     title: "Innkjøp",     roles: ["owner", "admin", "member"], Icon: InnkjopIkon },
  { href: "/eiendeler",   title: "Eiendeler",   roles: ["owner", "admin"],           Icon: EiendelerIkon },
  { href: "/okonomi",     title: "Økonomi",     roles: ["owner", "admin"],           Icon: OkonomIkon },
];

// ─── Rotating hints ───────────────────────────────────────────────────────────

const HINTS = [
  '«Tannlegetime Magnus fredag kl 14»',
  '«Kjøp ny støvsuger til 2 000 kr i januar»',
  '«Hent tøy fra renseri i morgen»',
  '«Rydd garasje i helgen»',
  '«Melk, egg og brød»',
];

function RotatingHint() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % HINTS.length);
        setVisible(true);
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <p
      className="text-xs text-gray-400 text-center mt-2 transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      Prøv: {HINTS[idx]}
    </p>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function MemberAvatar({ member }: { member: FamilyMember }) {
  return (
    <div
      className={`w-5 h-5 rounded-full ${member.color ?? "bg-blue-400"} flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ fontSize: "10px" }}
    >
      {member.name[0].toUpperCase()}
    </div>
  );
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
  onboardingCounts,
}: Props) {
  const { currentUser, isLoaded } = useUser();
  const [feedItems, setFeedItems] = useState<FeedItem[] | null>(null);

  function handleLogout() {
    // Rydd cookies umiddelbart og naviger – vent ikke på signOut (kan henge)
    clearAuthCookies();
    window.location.href = "/login";
    supabase.auth.signOut().catch(() => {}); // best-effort i bakgrunnen
  }

  const freshUser = currentUser
    ? (members.find((m) => m.id === currentUser.id) ?? currentUser)
    : null;
  const isAdmin = ["owner", "admin"].includes(freshUser?.permission_level ?? "");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allCandidates = useMemo((): FeedItem[] => {
    if (!freshUser) return [];
    return buildFeedCandidates(
      events, exceptions, tasks, plannedExpenses, maintenanceTasks,
      todayStr, freshUser.id, isAdmin
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshUser?.id, isAdmin, events, exceptions, tasks, plannedExpenses, maintenanceTasks, todayStr]);

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
      .slice(0, 8);

    const updated = { ...seenMap };
    visible.forEach((item) => { updated[`${item.id}_${item.type}`] = item.urgency; });
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(updated)); } catch { /* ignore */ }

    setFeedItems(visible);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCandidates, freshUser?.id]);

  if (!isLoaded || !currentUser || !freshUser) return null;

  const visibleModules = ALL_MODULES.filter((mod) =>
    mod.roles.includes(freshUser.permission_level)
  );

  // ── Module stats ───────────────────────────────────────────────────────────

  const todayMs = new Date(todayStr + "T00:00:00").getTime();
  const addDays = (n: number) => formatDate(new Date(todayMs + n * 86_400_000));
  const thirtyDaysOut = addDays(30);

  const thisWeekEventIds = new Set<string>();
  for (let i = 0; i <= 7; i++) {
    getEventsForDate(events, exceptions, addDays(i), freshUser.id).forEach((e) =>
      thisWeekEventIds.add(e.id)
    );
  }
  const thisWeekCount = thisWeekEventIds.size;

  const pendingTasks = tasks.filter(
    (t) => !t.completed && (isAdmin || t.assigned_to === freshUser.id || t.assigned_to === null)
  );
  const overdueTasks = pendingTasks.filter((t) => t.due_date && t.due_date < todayStr);

  const upcomingPurchases = plannedExpenses.filter(
    (e) => e.category === "innkjop" && e.date >= todayStr && e.date <= thirtyDaysOut
  );
  const upcomingMaintenance = maintenanceTasks.filter(
    (m) => m.due_date >= todayStr && m.due_date <= thirtyDaysOut
  );
  const upcomingExpenses = plannedExpenses.filter(
    (e) => e.category !== "innkjop" && e.date >= todayStr && e.date <= thirtyDaysOut
  );

  function getModuleStat(href: string): { text: string; accent: boolean } {
    switch (href) {
      case "/aktiviteter":
        return thisWeekCount > 0
          ? { text: `${thisWeekCount} aktivitet${thisWeekCount !== 1 ? "er" : ""} denne uken`, accent: true }
          : { text: "Ingen aktiviteter planlagt", accent: false };
      case "/oppgaver":
        if (overdueTasks.length > 0)
          return { text: `${overdueTasks.length} forfalt${overdueTasks.length !== 1 ? "e" : ""} gjøremål`, accent: true };
        return pendingTasks.length > 0
          ? { text: `${pendingTasks.length} gjøremål venter`, accent: true }
          : { text: "Ingen gjøremål", accent: false };
      case "/innkjop":
        return upcomingPurchases.length > 0
          ? { text: `${upcomingPurchases.length} planlagte kjøp`, accent: true }
          : { text: "Handelister og planlagte kjøp", accent: false };
      case "/eiendeler":
        return upcomingMaintenance.length > 0
          ? { text: `${upcomingMaintenance.length} vedlikeholdsoppgave${upcomingMaintenance.length !== 1 ? "r" : ""}`, accent: true }
          : { text: "Alt ser bra ut", accent: false };
      case "/okonomi":
        return upcomingExpenses.length > 0
          ? { text: `${upcomingExpenses.length} kommende utgift${upcomingExpenses.length !== 1 ? "er" : ""}`, accent: true }
          : { text: "Oversikt over familiens økonomi", accent: false };
      default:
        return { text: "", accent: false };
    }
  }

  // ── Split feed ──────────────────────────────────────────────────────────────
  const overdueItems  = (feedItems ?? []).filter((i) => i.urgency === "overdue");
  const todayFeed     = (feedItems ?? []).filter((i) => i.urgency === "today");
  const upcomingFeed  = (feedItems ?? []).filter((i) => i.urgency === "upcoming");

  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-lg mx-auto px-4 pb-12">

        {/* ── Header ── */}
        <div className="pt-8 pb-5">
          {/* Topp-rad: logo + kontroller */}
          <div className="flex items-center justify-between mb-3">
            {/* Brand logo */}
            <div className="flex items-center gap-2.5">
              <QLogo className="w-9 h-9 flex-shrink-0" />
              <span
                className="text-xl font-extrabold tracking-tight"
                style={{ color: "var(--brand-dark)" }}
              >
                Qlumio
              </span>
            </div>
            {/* Kontroller */}
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"
                title="Logg ut"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
              <Link
                href="/innstillinger"
                className="ml-1 flex items-center justify-center rounded-full hover:ring-2 hover:ring-gray-200 transition"
                title="Innstillinger"
              >
                <div className={`w-9 h-9 rounded-full ${freshUser.color} flex items-center justify-center text-white text-sm font-bold`}>
                  {freshUser.name[0].toUpperCase()}
                </div>
              </Link>
            </div>
          </div>
          {/* Hilsen */}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--brand-dark)" }}>
              {getGreeting(freshUser.name)}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5 capitalize">
              {new Date(todayStr + "T00:00:00").toLocaleDateString("nb-NO", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </p>
          </div>
        </div>

        {/* ── 1. Trenger oppmerksomhet (kun ved forfalt) ── */}
        {overdueItems.length > 0 && (
          <div className="mb-5 bg-red-50 border border-red-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span className="text-sm font-semibold text-red-600">Trenger oppmerksomhet</span>
            </div>
            <div className="space-y-2">
              {overdueItems.map((item) => (
                <Link
                  key={`${item.id}_${item.type}`}
                  href={item.href}
                  className="flex items-center gap-3 bg-white rounded-xl px-3 py-3 hover:bg-red-50 transition-colors border border-red-100"
                >
                  <span className="text-red-400 flex-shrink-0">
                    <FeedIcon type={item.type} className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-800 truncate">{item.title}</div>
                    <div className="text-xs text-red-400 mt-0.5 truncate">{item.subtitle}</div>
                  </div>
                  <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 border border-red-100">
                    Forfalt
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── 2. Quick-add hero ── */}
        <div className="mb-6">
          <QuickAddBox members={members.map((m) => ({ id: m.id, name: m.name }))} />
          <RotatingHint />
        </div>

        {/* ── 3. I dag + kommende ── */}
        {(todayFeed.length > 0 || upcomingFeed.length > 0) && (
          <div className="mb-6">

            {todayFeed.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--brand-purple)" }}>I dag</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: "rgba(139,92,246,0.18)" }} />
                </div>
                <div className="space-y-2 mb-4">
                  {todayFeed.map((item) => {
                    const participants = (item.participantIds ?? [])
                      .map((id) => memberById[id])
                      .filter(Boolean);
                    return (
                      <Link
                        key={`${item.id}_${item.type}`}
                        href={item.href}
                        className="flex items-center gap-3 bg-white px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors border-l-[3px]"
                        style={{ borderLeftColor: "var(--brand-purple)" }}
                      >
                        <span className="flex-shrink-0" style={{ color: "var(--brand-purple)" }}>
                          <FeedIcon type={item.type} className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-800 truncate">{item.title}</div>
                          <div className="text-xs text-gray-400 mt-0.5 truncate">{item.subtitle}</div>
                        </div>
                        {participants.length > 0 && (
                          <div className="flex -space-x-1.5 flex-shrink-0">
                            {participants.slice(0, 3).map((m) => (
                              <MemberAvatar key={m.id} member={m} />
                            ))}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}

            {upcomingFeed.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Kommende</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="space-y-2">
                  {upcomingFeed.map((item) => (
                    <Link
                      key={`${item.id}_${item.type}`}
                      href={item.href}
                      className="flex items-center gap-3 bg-white px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors border-l-[3px] border-amber-300"
                    >
                      <span className="text-amber-400 flex-shrink-0">
                        <FeedIcon type={item.type} className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-800 truncate">{item.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5 truncate">{item.subtitle}</div>
                      </div>
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                        {urgencyBadgeLabel(item.urgency, item.date, todayStr)}
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}

          </div>
        )}

        {/* ── 4. Onboarding (admin) ── */}
        {isAdmin && (
          <div className="mb-6">
            <OnboardingCard
              memberCount={onboardingCounts.memberCount}
              eventCount={onboardingCounts.eventCount}
              expenseCount={onboardingCounts.expenseCount}
            />
          </div>
        )}

        {/* ── 5. Moduler med live stats ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Moduler</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="space-y-2">
            {visibleModules.map((mod) => {
              const stat = getModuleStat(mod.href);
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="flex items-center gap-3.5 p-4 bg-white hover:bg-gray-50 rounded-xl transition-colors group"
                >
                  <div className="flex-shrink-0">
                    <mod.Icon size={52} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-900">{mod.title}</div>
                    <div
                    className="text-xs mt-0.5 truncate"
                    style={stat.accent ? { color: "var(--brand-purple)", fontWeight: 600 } : { color: "#9ca3af" }}
                  >
                      {stat.text}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </main>
  );
}
