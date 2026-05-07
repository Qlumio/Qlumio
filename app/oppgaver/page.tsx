export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase/server";
import OppgaverView from "@/components/OppgaverView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oppgaver – Qlumio",
};

export default async function OppgaverPage() {
  const supabase = await createServerClient();
  const [{ data: tasks }, { data: members }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .order("completed")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("family_members").select("*").order("created_at"),
  ]);

  return (
    <Suspense fallback={null}>
      <OppgaverView tasks={tasks ?? []} members={members ?? []} />
    </Suspense>
  );
}
