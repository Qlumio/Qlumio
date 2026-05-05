export const dynamic = "force-dynamic";
import { supabase } from "@/lib/supabase";
import BudgetView from "@/components/BudgetView";
import PlannedExpensesView from "@/components/PlannedExpensesView";
import LFPView from "@/components/LFPView";
import OkonomiTabBar from "@/components/OkonomiTabBar";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Økonomi – Qlumio",
};

export default async function OkonomiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "budsjett" } = await searchParams;

  // ── Hent data basert på aktiv fane ──────────────────────────────────────────
  let content: React.ReactNode;

  if (tab === "planlagte") {
    const { data: expenses } = await supabase
      .from("planned_expenses")
      .select("*")
      .order("date");

    content = <PlannedExpensesView initialExpenses={expenses ?? []} embedded />;

  } else if (tab === "lfp") {
    const [{ data: insurances }, { data: loans }, { data: pensions }] = await Promise.all([
      supabase.from("insurances").select("*").order("created_at"),
      supabase.from("loans").select("*").order("created_at"),
      supabase.from("pensions").select("*").order("created_at"),
    ]);

    content = (
      <LFPView
        insurances={insurances ?? []}
        loans={loans ?? []}
        pensions={pensions ?? []}
        embedded
      />
    );

  } else {
    // budsjett (default)
    const currentYear = new Date().getFullYear();

    const [categoriesResult, overridesResult, tasksResult, plannedResult] = await Promise.all([
      supabase.from("budget_categories").select("*, budget_items(*)").order("sort_order"),
      supabase.from("budget_overrides").select("*").in("year", [currentYear, currentYear + 1]),
      supabase
        .from("asset_tasks")
        .select("id, title, due_date, estimated_cost, asset_id, assets(name)")
        .not("estimated_cost", "is", null)
        .gt("estimated_cost", 0),
      supabase.from("planned_expenses").select("*").order("date"),
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

    content = (
      <BudgetView
        categories={categories}
        overrides={overridesResult.data ?? []}
        maintenanceTasks={maintenanceTasks}
        plannedExpenses={plannedResult.data ?? []}
        embedded
      />
    );
  }

  // ── Delt shell med header + tabbar ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Tilbake
          </Link>
          <div className="w-px h-5 bg-gray-100" />
          <h1 className="text-lg font-semibold">Økonomi</h1>
        </div>
        <OkonomiTabBar active={tab} />
      </div>

      {content}
    </div>
  );
}
