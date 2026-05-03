import { supabase } from "@/lib/supabase";
import OppgaverView from "@/components/OppgaverView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oppgaver – Qlumio",
};

export default async function OppgaverPage() {
  const [{ data: tasks }, { data: members }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .order("completed")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("family_members").select("*").order("created_at"),
  ]);

  return <OppgaverView tasks={tasks ?? []} members={members ?? []} />;
}
