export const dynamic = "force-dynamic";
import { createServerClient } from "@/lib/supabase/server";
import PlannedExpensesView from "@/components/PlannedExpensesView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planlagte kostnader – Qlumio",
};

export default async function PlannedExpensesPage() {
  const supabase = await createServerClient();
  const { data: expenses } = await supabase
    .from("planned_expenses")
    .select("*")
    .order("date");

  return <PlannedExpensesView initialExpenses={expenses ?? []} />;
}
