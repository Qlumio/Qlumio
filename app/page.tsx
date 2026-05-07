import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import HomeView from "@/components/HomeView";

export const dynamic = "force-dynamic";
import { formatDate } from "@/lib/dates";
import type { Event, EventException, Task } from "@/lib/types";

export const metadata: Metadata = {
  title: "Qlumio",
  description: "Family operating system",
};

export default async function Home() {
  const supabase = await createServerClient();
  const today = new Date();
  const todayStr = formatDate(today);

  const addDays = (n: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() + n);
    return formatDate(d);
  };

  const twoWeeksOutStr   = addDays(14);
  const sevenDaysBackStr = addDays(-7);
  const thirtyDaysBackStr = addDays(-30);
  const threeDaysOutStr  = addDays(3);
  const sevenDaysOutStr  = addDays(7);

  const [
    { data: members },
    { data: weekEventsRaw },
    { data: recurringEventsRaw },
    { data: exceptions },
    { data: tasks },
    { data: expensesRaw },
    { data: maintenanceRaw },
  ] = await Promise.all([
    supabase.from("family_members").select("*").order("created_at"),
    supabase
      .from("events")
      .select("*, event_participants(family_member_id)")
      .eq("recurring", false)
      .gte("date", sevenDaysBackStr)
      .lte("date", twoWeeksOutStr),
    supabase
      .from("events")
      .select("*, event_participants(family_member_id)")
      .eq("recurring", true),
    supabase.from("event_exceptions").select("*"),
    supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("planned_expenses")
      .select("id, title, amount, date, category")
      .gte("date", thirtyDaysBackStr)
      .lte("date", threeDaysOutStr)
      .order("date"),
    supabase
      .from("asset_tasks")
      .select("id, title, due_date, assets(name)")
      .gte("due_date", thirtyDaysBackStr)
      .lte("due_date", sevenDaysOutStr)
      .order("due_date"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizeEvent = (e: any): Event => ({
    id: e.id,
    title: e.title,
    date: e.date,
    end_date: e.end_date ?? null,
    start_time: e.start_time,
    end_time: e.end_time,
    recurring: e.recurring,
    responsible_member_id: e.responsible_member_id ?? null,
    category: e.category ?? null,
    created_at: e.created_at,
    participant_ids: (e.event_participants ?? []).map(
      (p: { family_member_id: string }) => p.family_member_id
    ),
  });

  const allNonRecurring = (weekEventsRaw ?? []).map(normalizeEvent).filter((e) => {
    const endDate = e.end_date ?? e.date;
    return endDate >= todayStr;
  });

  const events: Event[] = [
    ...allNonRecurring,
    ...(recurringEventsRaw ?? []).map(normalizeEvent),
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maintenanceTasks = (maintenanceRaw ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    asset_name: (t.assets as { name: string } | null)?.name ?? "Ukjent eiendel",
  }));

  return (
    <HomeView
      members={members ?? []}
      events={events}
      exceptions={(exceptions ?? []) as EventException[]}
      tasks={(tasks ?? []) as Task[]}
      plannedExpenses={expensesRaw ?? []}
      maintenanceTasks={maintenanceTasks}
      todayStr={todayStr}
    />
  );
}
