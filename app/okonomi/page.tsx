import { supabase } from "@/lib/supabase";
import BudgetView from "@/components/BudgetView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Familie økonomi – Qlumio",
};

export default async function OkonomiPage() {
  const currentYear = new Date().getFullYear();

  const [categoriesResult, overridesResult, tasksResult, plannedResult] = await Promise.all([
    supabase
      .from("budget_categories")
      .select("*, budget_items(*)")
      .order("sort_order"),
    supabase
      .from("budget_overrides")
      .select("*")
      .in("year", [currentYear, currentYear + 1]),
    supabase
      .from("asset_tasks")
      .select("id, title, due_date, estimated_cost, asset_id, assets(name)")
      .not("estimated_cost", "is", null)
      .gt("estimated_cost", 0),
    supabase
      .from("planned_expenses")
      .select("*")
      .order("date"),
  ]);

  const categories = (categoriesResult.data ?? []).map((cat) => ({
    ...cat,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: ((cat.budget_items ?? []) as any[]).sort(
      (a, b) => a.sort_order - b.sort_order
    ),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maintenanceTasks = (tasksResult.data ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    estimated_cost: t.estimated_cost as number,
    asset_id: t.asset_id,
    asset_name: (t.assets as { name: string } | null)?.name ?? "Ukjent eiendel",
  }));

  return (
    <BudgetView
      categories={categories}
      overrides={overridesResult.data ?? []}
      maintenanceTasks={maintenanceTasks}
      plannedExpenses={plannedResult.data ?? []}
    />
  );
}
