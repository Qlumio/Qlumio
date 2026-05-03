import { supabase } from "@/lib/supabase";
import BudgetView from "@/components/BudgetView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Familie økonomi – Qlumio",
};

export default async function OkonomiPage() {
  const currentYear = new Date().getFullYear();

  const { data: categoriesRaw } = await supabase
    .from("budget_categories")
    .select("*, budget_items(*)")
    .order("sort_order");

  const { data: overrides } = await supabase
    .from("budget_overrides")
    .select("*")
    .in("year", [currentYear, currentYear + 1]);

  const categories = (categoriesRaw ?? []).map((cat) => ({
    ...cat,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: ((cat.budget_items ?? []) as any[]).sort(
      (a, b) => a.sort_order - b.sort_order
    ),
  }));

  return <BudgetView categories={categories} overrides={overrides ?? []} />;
}
