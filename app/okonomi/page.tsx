export const dynamic = "force-dynamic";
import { supabase } from "@/lib/supabase";
import BudgetView from "@/components/BudgetView";
import PlannedExpensesView from "@/components/PlannedExpensesView";
import LFPView from "@/components/LFPView";
import LanView from "@/components/LanView";
import InnsiktView, { type InnsiktLoan } from "@/components/InnsiktView";
import SparingView, { type UpcomingCost } from "@/components/SparingView";
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

  let content: React.ReactNode;

  // ── Sparing ───────────────────────────────────────────────────────────────────
  if (tab === "sparing") {
    const [{ data: accounts }, { data: tasksRaw }, { data: expensesRaw }] = await Promise.all([
      supabase.from("savings_accounts").select("*").order("created_at"),
      supabase
        .from("asset_tasks")
        .select("id, title, due_date, estimated_cost, assets(name)")
        .not("estimated_cost", "is", null)
        .gt("estimated_cost", 0)
        .order("due_date"),
      supabase.from("planned_expenses").select("*").order("date"),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upcomingCosts: UpcomingCost[] = [
      ...(tasksRaw ?? []).map((t: any) => ({
        id: t.id,
        title: t.title,
        amount: t.estimated_cost as number,
        date: t.due_date,
        source: "vedlikehold" as const,
        detail: (t.assets as { name: string } | null)?.name,
      })),
      ...(expensesRaw ?? []).map((e: any) => ({
        id: e.id,
        title: e.title,
        amount: e.amount as number,
        date: e.date,
        source: "planlagt" as const,
      })),
    ];

    content = <SparingView accounts={accounts ?? []} upcomingCosts={upcomingCosts} embedded />;

  // ── Forsikringer ─────────────────────────────────────────────────────────────
  } else if (tab === "forsikringer") {
    const { data: insurances } = await supabase
      .from("insurances")
      .select("*")
      .order("created_at");

    content = (
      <LFPView
        insurances={insurances ?? []}
        loans={[]}
        pensions={[]}
        defaultSection="forsikring"
        embedded
      />
    );

  // ── Lån ──────────────────────────────────────────────────────────────────────
  } else if (tab === "lan") {
    const [{ data: loans }, { data: assets }] = await Promise.all([
      supabase.from("loans").select("*").order("created_at"),
      supabase.from("assets").select("*").order("name"),
    ]);

    content = <LanView loans={loans ?? []} assets={assets ?? []} embedded />;

  // ── Pensjon ───────────────────────────────────────────────────────────────────
  } else if (tab === "pensjon") {
    const { data: pensions } = await supabase
      .from("pensions")
      .select("*")
      .order("created_at");

    content = (
      <LFPView
        insurances={[]}
        loans={[]}
        pensions={pensions ?? []}
        defaultSection="pensjon"
        embedded
      />
    );

  // ── Planlagte kostnader ───────────────────────────────────────────────────────
  } else if (tab === "planlagte") {
    const [{ data: expenses }, { data: maintenanceRaw }] = await Promise.all([
      supabase.from("planned_expenses").select("*").order("date"),
      supabase
        .from("asset_tasks")
        .select("id, title, due_date, estimated_cost, assets(name)")
        .not("estimated_cost", "is", null)
        .gt("estimated_cost", 0)
        .order("due_date"),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maintenanceTasks = (maintenanceRaw ?? []).map((t: any) => ({
      id: t.id,
      title: t.title,
      due_date: t.due_date,
      estimated_cost: t.estimated_cost as number,
      asset_name: (t.assets as { name: string } | null)?.name ?? "Ukjent eiendel",
    }));

    content = <PlannedExpensesView initialExpenses={expenses ?? []} maintenanceTasks={maintenanceTasks} embedded />;

  // ── Innsikt ───────────────────────────────────────────────────────────────────
  } else if (tab === "innsikt") {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const d12 = new Date(now.getFullYear(), now.getMonth() + 13, 1);
    const twelveMonthsOutStr = `${d12.getFullYear()}-${String(d12.getMonth() + 1).padStart(2, "0")}-01`;

    const [
      { data: loansRaw },
      { data: savingsRaw },
      { data: assetsRaw },
      { data: categoriesRaw },
      { data: bufferRaw },
      { data: plannedRaw },
    ] = await Promise.all([
      supabase.from("loans").select("*").order("created_at"),
      supabase.from("savings_accounts").select("*").order("created_at"),
      supabase.from("assets").select("id, name, type, estimated_value").order("name"),
      supabase.from("budget_categories").select("*, budget_items(*)").order("sort_order"),
      supabase.from("savings_accounts").select("balance, monthly_amount").eq("is_buffer", true),
      supabase.from("planned_expenses").select("date, amount").gte("date", todayStr).lte("date", twelveMonthsOutStr).order("date"),
    ]);

    // ── Beregn cashflow-måneder ──────────────────────────────────────────────
    const CF_MONTHS = ["jan","feb","mar","apr","mai","jun","jul","aug","sep","okt","nov","des"];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const incomeCatRaw = (categoriesRaw ?? []).find((c: any) => c.type === "income");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monthlyIncome = incomeCatRaw ? (incomeCatRaw.budget_items ?? []).reduce((s: number, i: any) => s + (Number(i.monthly_default) || 0), 0) : 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monthlyExpenses = (categoriesRaw ?? []).filter((c: any) => c.type !== "income").flatMap((c: any) => c.budget_items ?? []).reduce((s: number, i: any) => s + (Number(i.monthly_default) || 0), 0);

    const bufferStartBalance = (bufferRaw ?? []).reduce((s: number, a: { balance: number }) => s + (a.balance ?? 0), 0);
    const bufferMonthly = (bufferRaw ?? []).reduce((s: number, a: { monthly_amount: number }) => s + (a.monthly_amount ?? 0), 0);

    let runningBuffer = bufferStartBalance;
    const cashflowMonths = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthStr = `${year}-${String(month).padStart(2, "0")}`;
      const oneOff = (plannedRaw ?? []).filter((e: { date: string; amount: number }) => e.date.startsWith(monthStr)).reduce((s: number, e: { date: string; amount: number }) => s + (e.amount ?? 0), 0);
      runningBuffer = runningBuffer + bufferMonthly - oneOff;
      return {
        year, month,
        label: CF_MONTHS[d.getMonth()] + (year !== now.getFullYear() ? ` ${String(year).slice(2)}` : ""),
        income: monthlyIncome,
        expenses: monthlyExpenses,
        net: monthlyIncome - monthlyExpenses,
        bufferBalance: Math.round(runningBuffer),
        isCurrent: i === 0,
      };
    });

    content = (
      <InnsiktView
        loans={(loansRaw ?? []) as InnsiktLoan[]}
        savingsItems={(savingsRaw ?? []) as { id: string; name: string; balance: number; monthly_amount: number }[]}
        assets={(assetsRaw ?? []) as { id: string; name: string; type: string; estimated_value: number | null }[]}
        cashflowMonths={cashflowMonths}
        embedded
      />
    );

  // ── Budsjett (default) ────────────────────────────────────────────────────────
  } else {
    const currentYear = new Date().getFullYear();

    const [categoriesResult, overridesResult, tasksResult, plannedResult, bufferResult] = await Promise.all([
      supabase.from("budget_categories").select("*, budget_items(*)").order("sort_order"),
      supabase.from("budget_overrides").select("*").in("year", [currentYear, currentYear + 1]),
      supabase
        .from("asset_tasks")
        .select("id, title, due_date, estimated_cost, asset_id, assets(name)")
        .not("estimated_cost", "is", null)
        .gt("estimated_cost", 0),
      supabase.from("planned_expenses").select("*").order("date"),
      supabase.from("savings_accounts").select("name, balance, monthly_amount, budget_item_id").eq("is_buffer", true),
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
        bufferAccounts={bufferResult.data ?? []}
        embedded
      />
    );
  }

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
