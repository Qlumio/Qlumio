import { supabase } from "@/lib/supabase";
import ArshjulView from "@/components/ArshjulView";
import type { Metadata } from "next";
import type { Event } from "@/lib/types";

export const metadata: Metadata = {
  title: "Årshjul – Qlumio",
};

export default async function ArshjulPage() {
  const year = new Date().getFullYear();
  const fromStr = `${year}-01-01`;
  const toStr = `${year}-12-31`;

  const [{ data: eventsRaw }, { data: members }] = await Promise.all([
    supabase
      .from("events")
      .select("*, event_participants(family_member_id)")
      .not("category", "is", null)
      .eq("recurring", false)
      .gte("date", fromStr)
      .lte("date", toStr)
      .order("date", { ascending: true }),
    supabase.from("family_members").select("*").order("created_at"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: Event[] = (eventsRaw ?? []).map((e: any) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    end_date: e.end_date ?? null,
    start_time: e.start_time ?? null,
    end_time: e.end_time ?? null,
    recurring: e.recurring,
    responsible_member_id: e.responsible_member_id ?? null,
    category: e.category ?? null,
    created_at: e.created_at,
    participant_ids: (e.event_participants ?? []).map(
      (p: { family_member_id: string }) => p.family_member_id
    ),
  }));

  return <ArshjulView events={events} members={members ?? []} year={year} />;
}
