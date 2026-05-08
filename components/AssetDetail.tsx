"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Asset, AssetTask, FamilyMember } from "@/lib/types";
import { getAssetEmoji, getAssetLabel, ASSET_TYPES } from "@/components/AssetList";
import type { Loan } from "@/components/LanView";

type Props = {
  asset: Asset;
  tasks: AssetTask[];
  members: FamilyMember[];
  loans: Loan[];
  unlinkedLoans: Loan[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES_SHORT = ["jan","feb","mar","apr","mai","jun","jul","aug","sep","okt","nov","des"];
const MONTH_NAMES_FULL  = ["Januar","Februar","Mars","April","Mai","Juni","Juli","August","September","Oktober","November","Desember"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  // Vis kun måned hvis datoen er den 1. (angitt som måned)
  if (d.getDate() === 1) return `${MONTH_NAMES_FULL[d.getMonth()]} ${d.getFullYear()}`;
  return `${d.getDate()}. ${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
function formatCost(cost: number) {
  return cost.toLocaleString("nb-NO") + " kr";
}
const fmt = (n: number | null | undefined) =>
  n == null ? "–" : n.toLocaleString("nb-NO") + " kr";

const LOAN_TYPES = ["Boliglån", "Billån", "Studielån", "Forbrukslån", "Annet"];
const DEFAULT_INSTALLMENTS = 12;

function beregnTermin(loanAmount: number, rente: number, aar: number, terminerPerAar: number, gebyr: number): number {
  const r = rente / 100 / terminerPerAar;
  const n = aar * terminerPerAar;
  if (r === 0) return loanAmount / n + gebyr;
  return Math.round(loanAmount * (r / (1 - Math.pow(1 + r, -n))) + gebyr);
}

// ─── Låneskjema ───────────────────────────────────────────────────────────────

const emptyLoanForm = {
  name: "", type: "Boliglån", provider: "",
  loan_amount: "", remaining_debt: "", interest_rate: "",
  repayment_years: "", installments_per_year: String(DEFAULT_INSTALLMENTS),
  installment_fee: "0", end_date: "", notes: "",
};
type LoanForm = typeof emptyLoanForm;

const loanToForm = (l: Loan): LoanForm => ({
  name: l.name, type: l.type, provider: l.provider,
  loan_amount: l.loan_amount != null ? String(l.loan_amount) : "",
  remaining_debt: l.remaining_debt != null ? String(l.remaining_debt) : "",
  interest_rate: l.interest_rate != null ? String(l.interest_rate) : "",
  repayment_years: l.repayment_years != null ? String(l.repayment_years) : "",
  installments_per_year: l.installments_per_year != null ? String(l.installments_per_year) : String(DEFAULT_INSTALLMENTS),
  installment_fee: l.installment_fee != null ? String(l.installment_fee) : "0",
  end_date: l.end_date ?? "", notes: l.notes ?? "",
});

const calcTermin = (f: LoanForm): number => {
  const la = parseFloat(f.loan_amount) || 0;
  const r = parseFloat(f.interest_rate) || 0;
  const y = parseFloat(f.repayment_years) || 0;
  const t = parseInt(f.installments_per_year) || DEFAULT_INSTALLMENTS;
  const g = parseFloat(f.installment_fee) || 0;
  if (la > 0 && r > 0 && y > 0) return beregnTermin(la, r, y, t, g);
  return 0;
};

// ─── UI helpers ───────────────────────────────────────────────────────────────

const FLabel = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="text-xs text-gray-400 mb-1 block">{label}</label>{children}</div>
);
const FInput = ({ value, onChange, placeholder, type = "text", step }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; step?: string;
}) => (
  <input type={type} step={step} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
);
const FSelect = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm">
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

// ─── Låneskjema-innhold ───────────────────────────────────────────────────────

function LoanFormFields({ form, setForm }: { form: LoanForm; setForm: (f: LoanForm) => void }) {
  const terminbelop = calcTermin(form);
  return (
    <div className="space-y-3">
      <FLabel label="Navn *"><FInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder='F.eks. "Huslån DNB"' /></FLabel>
      <FLabel label="Type"><FSelect value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={LOAN_TYPES} /></FLabel>
      <FLabel label="Leverandør *"><FInput value={form.provider} onChange={(v) => setForm({ ...form, provider: v })} placeholder='F.eks. "DNB"' /></FLabel>
      <div className="border-t border-gray-100 pt-3">
        <div className="text-xs font-semibold text-gray-500 mb-2">Lånedetaljer</div>
        <div className="grid grid-cols-2 gap-3">
          <FLabel label="Lånebeløp (kr)"><FInput type="number" value={form.loan_amount} onChange={(v) => setForm({ ...form, loan_amount: v })} placeholder="3 500 000" /></FLabel>
          <FLabel label="Restgjeld (kr)"><FInput type="number" value={form.remaining_debt} onChange={(v) => setForm({ ...form, remaining_debt: v })} placeholder="3 200 000" /></FLabel>
          <FLabel label="Nominell rente (%)"><FInput type="number" step="0.01" value={form.interest_rate} onChange={(v) => setForm({ ...form, interest_rate: v })} placeholder="5.29" /></FLabel>
          <FLabel label="Nedbetalingstid (år)"><FInput type="number" value={form.repayment_years} onChange={(v) => setForm({ ...form, repayment_years: v })} placeholder="25" /></FLabel>
          <FLabel label="Terminer pr år"><FInput type="number" value={form.installments_per_year} onChange={(v) => setForm({ ...form, installments_per_year: v })} placeholder="12" /></FLabel>
          <FLabel label="Termingebyr (kr)"><FInput type="number" value={form.installment_fee} onChange={(v) => setForm({ ...form, installment_fee: v })} placeholder="0" /></FLabel>
        </div>
      </div>
      {terminbelop > 0 && (
        <div className="bg-blue-50 rounded-lg p-3 text-sm">
          <span className="text-blue-700 font-medium">Beregnet terminbeløp: </span>
          <span className="text-blue-900 font-bold">{fmt(terminbelop)}</span>
          <span className="text-blue-600 text-xs ml-1">/{parseInt(form.installments_per_year) === 12 ? "mnd" : "termin"}</span>
        </div>
      )}
      <FLabel label="Notater"><FInput value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Valgfritt" /></FLabel>
    </div>
  );
}

// ─── Hovedkomponent ───────────────────────────────────────────────────────────

export default function AssetDetail({ asset, tasks, members, loans: initLoans, unlinkedLoans: initUnlinked }: Props) {
  const router = useRouter();

  // ── Oppgave-state ─────────────────────────────────────────────────────────────
  const [localTasks, setLocalTasks] = useState<AssetTask[]>(tasks);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dateMode, setDateMode] = useState<"month" | "date">("month");
  const [cost, setCost] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [recurringMonths, setRecurringMonths] = useState("12");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Rediger oppgave ───────────────────────────────────────────────────────────
  const [editingTask, setEditingTask] = useState<AssetTask | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editDateMode, setEditDateMode] = useState<"month" | "date">("month");
  const [editCost, setEditCost] = useState("");
  const [editResponsibleId, setEditResponsibleId] = useState("");
  const [editRecurring, setEditRecurring] = useState(false);
  const [editRecurringMonths, setEditRecurringMonths] = useState("12");
  const [editNotes, setEditNotes] = useState("");
  const [editTaskSaving, setEditTaskSaving] = useState(false);

  // ── Rediger eiendel ───────────────────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(asset.name);
  const [editType, setEditType] = useState(asset.type);
  const [editYear, setEditYear] = useState(asset.purchase_year?.toString() ?? "");
  const [editDesc, setEditDesc] = useState(asset.description ?? "");
  const [editValue, setEditValue] = useState(asset.estimated_value?.toString() ?? "");
  const [editSaving, setEditSaving] = useState(false);

  // ── Lån-state ──────────────────────────────────────────────────────────────────
  const [loans, setLoans] = useState<Loan[]>(initLoans);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loanForm, setLoanForm] = useState<LoanForm>({ ...emptyLoanForm });
  const [editLoanForm, setEditLoanForm] = useState<LoanForm>({ ...emptyLoanForm });
  const [loanSaving, setLoanSaving] = useState(false);

  // ── Koble eksisterende lån ────────────────────────────────────────────────────
  const [availableLoans, setAvailableLoans] = useState<Loan[]>(initUnlinked);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [linking, setLinking] = useState(false);

  // ── Oppgave-handlers ──────────────────────────────────────────────────────────

  const resetTaskForm = () => {
    setTitle(""); setDueDate(""); setCost(""); setResponsibleId("");
    setRecurring(false); setRecurringMonths("12"); setNotes(""); setDateMode("month");
  };

  // Konverter måned-input (YYYY-MM) til dato (YYYY-MM-01)
  const resolveDueDate = (raw: string, mode: "month" | "date") =>
    mode === "month" && raw.length === 7 ? raw + "-01" : raw;

  const handleSaveTask = async () => {
    const resolvedDate = resolveDueDate(dueDate, dateMode);
    if (!title.trim() || !resolvedDate) return;
    setSaving(true);

    let eventId: string | null = null;
    if (responsibleId) {
      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert({ title: title.trim(), date: resolvedDate, start_time: null, end_time: null, recurring: false })
        .select().single();
      if (eventError || !event) { alert("Feil ved oppretting av kalenderaktivitet: " + eventError?.message); setSaving(false); return; }
      await supabase.from("event_participants").insert({ event_id: event.id, family_member_id: responsibleId });
      eventId = event.id;
    }

    const { data: newTask, error } = await supabase.from("asset_tasks").insert({
      asset_id: asset.id, title: title.trim(), due_date: resolvedDate,
      estimated_cost: cost ? parseInt(cost) : null,
      responsible_member_id: responsibleId || null,
      recurring, recurring_months: recurring ? parseInt(recurringMonths) : null,
      notes: notes.trim() || null, event_id: eventId,
    }).select().single();

    setSaving(false);
    if (error) { alert("Feil: " + error.message); return; }
    if (newTask) setLocalTasks((prev) => [...prev, newTask as AssetTask]);
    setShowTaskModal(false);
    resetTaskForm();
  };

  const openEditTask = (task: AssetTask) => {
    const isMonthOnly = task.due_date.endsWith("-01");
    setEditTitle(task.title);
    setEditDueDate(isMonthOnly ? task.due_date.slice(0, 7) : task.due_date);
    setEditDateMode(isMonthOnly ? "month" : "date");
    setEditCost(task.estimated_cost?.toString() ?? "");
    setEditResponsibleId(task.responsible_member_id ?? "");
    setEditRecurring(task.recurring ?? false);
    setEditRecurringMonths(task.recurring_months?.toString() ?? "12");
    setEditNotes(task.notes ?? "");
    setEditingTask(task);
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !editTitle.trim()) return;
    const resolvedDate = resolveDueDate(editDueDate, editDateMode);
    if (!resolvedDate) return;
    setEditTaskSaving(true);

    const { data: updated, error } = await supabase.from("asset_tasks").update({
      title: editTitle.trim(),
      due_date: resolvedDate,
      estimated_cost: editCost ? parseInt(editCost) : null,
      responsible_member_id: editResponsibleId || null,
      recurring: editRecurring,
      recurring_months: editRecurring ? parseInt(editRecurringMonths) : null,
      notes: editNotes.trim() || null,
    }).eq("id", editingTask.id).select().single();

    if (!error && updated) {
      setLocalTasks((prev) => prev.map((t) => t.id === editingTask.id ? updated as AssetTask : t));
      // Synk kalenderoppgave hvis den finnes
      if (editingTask.event_id) {
        await supabase.from("events").update({ title: editTitle.trim(), date: resolvedDate }).eq("id", editingTask.event_id);
      }
    }
    if (error) alert("Feil: " + error.message);
    setEditTaskSaving(false);
    setEditingTask(null);
  };

  const handleDeleteTask = async (task: AssetTask) => {
    if (!confirm(`Slett "${task.title}"?`)) return;
    if (task.event_id) await supabase.from("events").delete().eq("id", task.event_id);
    await supabase.from("asset_tasks").delete().eq("id", task.id);
    setLocalTasks((prev) => prev.filter((t) => t.id !== task.id));
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setEditSaving(true);
    const { error } = await supabase.from("assets").update({
      name: editName.trim(), type: editType,
      purchase_year: editYear ? parseInt(editYear) : null,
      description: editDesc.trim() || null,
      estimated_value: editValue ? parseInt(editValue) : null,
    }).eq("id", asset.id);
    setEditSaving(false);
    if (error) { alert("Feil: " + error.message); return; }
    setShowEditModal(false);
    router.refresh();
  };

  const handleDeleteAsset = async () => {
    if (!confirm(`Er du sikker på at du vil slette "${asset.name}"? Dette sletter også alle vedlikeholdsoppgaver for denne eiendelen.`)) return;
    for (const task of tasks) {
      if (task.event_id) await supabase.from("events").delete().eq("id", task.event_id);
    }
    await supabase.from("asset_tasks").delete().eq("asset_id", asset.id);
    await supabase.from("assets").delete().eq("id", asset.id);
    router.push("/eiendeler");
  };

  // ── Lån-handlers ─────────────────────────────────────────────────────────────

  const createLinkedBudgetItem = async (loanId: string, name: string, terminbelop: number, loanAmount: number | null) => {
    const { data: loanCat } = await supabase.from("budget_categories").select("id").eq("type", "loan").maybeSingle();
    if (!loanCat) return;
    const { data: newItem } = await supabase.from("budget_items")
      .insert({ category_id: loanCat.id, name, sort_order: 999, monthly_default: terminbelop, starting_balance: loanAmount ?? 0, source: "loan" })
      .select().single();
    if (newItem) {
      await supabase.from("loans").update({ budget_item_id: newItem.id }).eq("id", loanId);
      return newItem.id as string;
    }
  };

  const syncBudgetItem = async (budgetItemId: string, name: string, terminbelop: number, loanAmount: number | null) => {
    await supabase.from("budget_items").update({ name, monthly_default: terminbelop, starting_balance: loanAmount ?? 0 }).eq("id", budgetItemId);
  };

  const saveLoan = async () => {
    if (!loanForm.name.trim() || !loanForm.provider.trim()) return;
    setLoanSaving(true);
    const terminbelop = calcTermin(loanForm);
    const loanAmount = loanForm.loan_amount ? parseInt(loanForm.loan_amount) : null;

    const { data } = await supabase.from("loans").insert({
      name: loanForm.name.trim(), type: loanForm.type, provider: loanForm.provider.trim(),
      loan_amount: loanAmount,
      remaining_debt: loanForm.remaining_debt ? parseInt(loanForm.remaining_debt) : loanAmount,
      interest_rate: loanForm.interest_rate ? parseFloat(loanForm.interest_rate) : null,
      repayment_years: loanForm.repayment_years ? parseInt(loanForm.repayment_years) : null,
      installments_per_year: parseInt(loanForm.installments_per_year) || DEFAULT_INSTALLMENTS,
      installment_fee: loanForm.installment_fee ? parseFloat(loanForm.installment_fee) : 0,
      monthly_payment: terminbelop || null,
      notes: loanForm.notes.trim() || null,
      asset_id: asset.id,
    }).select().single();

    if (data) {
      const budgetItemId = terminbelop
        ? await createLinkedBudgetItem(data.id, loanForm.name.trim(), terminbelop, loanAmount)
        : undefined;
      setLoans((p) => [...p, { ...data as Loan, budget_item_id: budgetItemId ?? null }]);
      setLoanForm({ ...emptyLoanForm });
      setShowLoanModal(false);
    }
    setLoanSaving(false);
  };

  const updateLoan = async () => {
    if (!editingLoan || !editLoanForm.name.trim() || !editLoanForm.provider.trim()) return;
    setLoanSaving(true);
    const terminbelop = calcTermin(editLoanForm);
    const loanAmount = editLoanForm.loan_amount ? parseInt(editLoanForm.loan_amount) : null;

    const { data } = await supabase.from("loans").update({
      name: editLoanForm.name.trim(), type: editLoanForm.type, provider: editLoanForm.provider.trim(),
      loan_amount: loanAmount,
      remaining_debt: editLoanForm.remaining_debt ? parseInt(editLoanForm.remaining_debt) : loanAmount,
      interest_rate: editLoanForm.interest_rate ? parseFloat(editLoanForm.interest_rate) : null,
      repayment_years: editLoanForm.repayment_years ? parseInt(editLoanForm.repayment_years) : null,
      installments_per_year: parseInt(editLoanForm.installments_per_year) || DEFAULT_INSTALLMENTS,
      installment_fee: editLoanForm.installment_fee ? parseFloat(editLoanForm.installment_fee) : 0,
      monthly_payment: terminbelop || null,
      notes: editLoanForm.notes.trim() || null,
    }).eq("id", editingLoan.id).select().single();

    if (data) {
      if (editingLoan.budget_item_id && terminbelop) {
        await syncBudgetItem(editingLoan.budget_item_id, editLoanForm.name.trim(), terminbelop, loanAmount);
      } else if (!editingLoan.budget_item_id && terminbelop) {
        const budgetItemId = await createLinkedBudgetItem(editingLoan.id, editLoanForm.name.trim(), terminbelop, loanAmount);
        (data as Loan).budget_item_id = budgetItemId ?? null;
      }
      setLoans((p) => p.map((l) => l.id === editingLoan.id ? data as Loan : l));
      setEditingLoan(null);
    }
    setLoanSaving(false);
  };

  const deleteLoan = async (l: Loan) => {
    if (!confirm("Slett dette lånet? Tilknyttet budsjettpost slettes også.")) return;
    if (l.budget_item_id) await supabase.from("budget_items").delete().eq("id", l.budget_item_id);
    await supabase.from("loans").delete().eq("id", l.id);
    setLoans((p) => p.filter((x) => x.id !== l.id));
  };

  const linkLoan = async () => {
    if (!selectedLoanId) return;
    setLinking(true);
    const { data } = await supabase
      .from("loans")
      .update({ asset_id: asset.id })
      .eq("id", selectedLoanId)
      .select()
      .single();
    if (data) {
      setLoans((p) => [...p, data as Loan]);
      setAvailableLoans((p) => p.filter((l) => l.id !== selectedLoanId));
      setSelectedLoanId("");
      setShowLinkModal(false);
    }
    setLinking(false);
  };

  const unlinkLoan = async (l: Loan) => {
    if (!confirm(`Fjern koblingen mellom "${l.name}" og denne eiendelen? Lånet beholdes i økonomimodulen.`)) return;
    const { data } = await supabase
      .from("loans")
      .update({ asset_id: null })
      .eq("id", l.id)
      .select()
      .single();
    if (data) {
      setLoans((p) => p.filter((x) => x.id !== l.id));
      setAvailableLoans((p) => [...p, { ...data as Loan, asset_id: null }]);
    }
  };

  const getMemberName = (id: string | null) => members.find((m) => m.id === id)?.name ?? null;
  const getMemberColor = (id: string | null) => members.find((m) => m.id === id)?.color ?? null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Eiendeler
            </button>
            <div className="w-px h-5 bg-gray-100" />
            <h1 className="text-lg font-semibold">{asset.name}</h1>
          </div>
          <button onClick={() => setShowTaskModal(true)} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ny oppgave
          </button>
        </div>

        {/* Eiendel-info */}
        <div className="flex items-center gap-4 p-4 bg-white rounded-xl mb-4">
          <div className="text-4xl">{getAssetEmoji(asset.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-lg">{asset.name}</div>
            <div className="text-sm text-gray-500">
              {getAssetLabel(asset.type)}
              {asset.purchase_year && <span className="ml-2">· {asset.purchase_year}</span>}
            </div>
            {asset.description && <div className="text-xs text-gray-400 mt-0.5">{asset.description}</div>}
            {asset.estimated_value != null && (
              <div className="text-xs text-emerald-600 mt-1 font-medium">
                💰 Estimert verdi: {asset.estimated_value.toLocaleString("nb-NO")} kr
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button onClick={() => { setEditName(asset.name); setEditType(asset.type); setEditYear(asset.purchase_year?.toString() ?? ""); setEditDesc(asset.description ?? ""); setEditValue(asset.estimated_value?.toString() ?? ""); setShowEditModal(true); }}
              className="text-xs text-gray-400 hover:text-blue-500 transition-colors px-2 py-1 rounded hover:bg-gray-100">
              ✏️ Rediger
            </button>
            <button onClick={handleDeleteAsset} className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-gray-100">
              🗑 Slett
            </button>
          </div>
        </div>

        {/* ── Lån ──────────────────────────────────────────────────────────────── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Lån</h2>
            <div className="flex items-center gap-3">
              {availableLoans.length > 0 && (
                <button onClick={() => setShowLinkModal(true)} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                  Koble eksisterende
                </button>
              )}
              <button onClick={() => setShowLoanModal(true)} className="text-xs text-blue-500 hover:text-blue-600 transition-colors">
                + Nytt lån
              </button>
            </div>
          </div>

          {loans.length === 0 ? (
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-gray-400 text-sm">Ingen lån knyttet til denne eiendelen.</p>
              <div className="flex items-center justify-center gap-3 mt-2">
                {availableLoans.length > 0 && (
                  <button onClick={() => setShowLinkModal(true)} className="text-gray-500 hover:text-gray-700 text-xs transition-colors">
                    Koble eksisterende lån
                  </button>
                )}
                <button onClick={() => setShowLoanModal(true)} className="text-blue-500 hover:text-blue-600 text-xs transition-colors">
                  + Opprett nytt lån
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {loans.map((l) => {
                const terminbelop = l.loan_amount && l.interest_rate && l.repayment_years
                  ? beregnTermin(l.loan_amount, l.interest_rate, l.repayment_years, l.installments_per_year ?? DEFAULT_INSTALLMENTS, l.installment_fee ?? 0)
                  : l.monthly_payment;
                return (
                  <div key={l.id} className="bg-white rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="font-medium">{l.name}</div>
                          {l.budget_item_id && <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">✓ budsjett</span>}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <div className="text-gray-400">Restgjeld</div>
                            <div className="font-medium">{fmt(l.remaining_debt)}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Rente</div>
                            <div className="font-medium">{l.interest_rate != null ? l.interest_rate + " %" : "–"}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Terminbeløp</div>
                            <div className="font-medium">{fmt(terminbelop)}</div>
                          </div>
                        </div>
                        {l.repayment_years && (
                          <div className="text-xs text-gray-400 mt-1">{l.repayment_years} år · {l.installments_per_year ?? DEFAULT_INSTALLMENTS} terminer/år</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingLoan(l); setEditLoanForm(loanToForm(l)); }} className="text-gray-400 hover:text-blue-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => unlinkLoan(l)} title="Fjern kobling" className="text-gray-400 hover:text-orange-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </button>
                        <button onClick={() => deleteLoan(l)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Vedlikeholdsoppgaver ──────────────────────────────────────────────── */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Vedlikeholdsoppgaver</h2>
          <span className="text-xs text-gray-400">{localTasks.length} oppgaver</span>
        </div>

        {localTasks.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm mb-3">Ingen oppgaver lagt til ennå.</p>
            <button onClick={() => setShowTaskModal(true)} className="text-blue-500 hover:text-blue-600 text-sm transition-colors">
              + Legg til første oppgave
            </button>
          </div>
        )}

        <div className="space-y-2">
          {localTasks.map((task) => {
            const due = new Date(task.due_date + "T00:00:00");
            const isOverdue = due < today;
            const isSoon = !isOverdue && (due.getTime() - today.getTime()) < 1000 * 60 * 60 * 24 * 30;
            const memberName = getMemberName(task.responsible_member_id);
            const memberColor = getMemberColor(task.responsible_member_id);

            return (
              <div key={task.id} className="p-4 bg-white rounded-xl">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{task.title}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${isOverdue ? "bg-red-100 text-red-600" : isSoon ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}`}>
                        📅 {formatDate(task.due_date)}
                      </span>
                      {task.estimated_cost != null && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">💰 {formatCost(task.estimated_cost)}</span>}
                      {memberName && (
                        <span className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          <span className={`w-2 h-2 rounded-full ${memberColor}`} />
                          {memberName}
                        </span>
                      )}
                      {task.recurring && task.recurring_months && <span className="bg-gray-100 text-blue-500 px-2 py-0.5 rounded-full">↻ hver {task.recurring_months} mnd</span>}
                      {task.event_id && <span className="bg-gray-100 text-green-600 px-2 py-0.5 rounded-full">✓ i kalender</span>}
                    </div>
                    {task.notes && <div className="text-xs text-gray-400 mt-1.5">{task.notes}</div>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                    <button onClick={() => openEditTask(task)} className="text-gray-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-gray-100" title="Rediger">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDeleteTask(task)} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-gray-100" title="Slett">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modal: Nytt lån ── */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowLoanModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Nytt lån – {asset.name}</h2>
            <LoanFormFields form={loanForm} setForm={setLoanForm} />
            <p className="text-xs text-gray-400 mt-3 mb-4">Lånet kobles automatisk til budsjettet.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowLoanModal(false)} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Avbryt</button>
              <button onClick={saveLoan} disabled={loanSaving || !loanForm.name.trim() || !loanForm.provider.trim()}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white">
                {loanSaving ? "Lagrer…" : "Lagre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Rediger lån ── */}
      {editingLoan && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingLoan(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Rediger lån</h2>
            <LoanFormFields form={editLoanForm} setForm={setEditLoanForm} />
            {editingLoan.budget_item_id && (
              <p className="text-xs text-green-600 bg-green-50 p-2 rounded-lg mt-3 mb-4">Endringer synkroniseres til budsjettet.</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setEditingLoan(null)} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Avbryt</button>
              <button onClick={updateLoan} disabled={loanSaving}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white">
                {loanSaving ? "Lagrer…" : "Lagre endringer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Rediger eiendel ── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Rediger eiendel</h2>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Navn</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus
                  className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Type</label>
                <select value={editType} onChange={(e) => setEditType(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  {ASSET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Kjøpsår (valgfritt)</label>
                <input type="number" placeholder="F.eks. 2019" value={editYear} onChange={(e) => setEditYear(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Beskrivelse (valgfritt)</label>
                <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Estimert verdi (kr, valgfritt)</label>
                <input type="number" placeholder="F.eks. 4 500 000" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Avbryt</button>
              <button onClick={handleSaveEdit} disabled={!editName.trim() || editSaving}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white">
                {editSaving ? "Lagrer…" : "Lagre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Koble eksisterende lån ── */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowLinkModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-1">Koble eksisterende lån</h2>
            <p className="text-xs text-gray-400 mb-4">Velg et lån som ikke er koblet til en eiendel ennå.</p>
            <div className="mb-5">
              <label className="text-xs text-gray-400 mb-1 block">Lån</label>
              <select
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Velg lån…</option>
                {availableLoans.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} – {l.provider} {l.remaining_debt != null ? `(${l.remaining_debt.toLocaleString("nb-NO")} kr)` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowLinkModal(false); setSelectedLoanId(""); }} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Avbryt</button>
              <button onClick={linkLoan} disabled={!selectedLoanId || linking}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white">
                {linking ? "Kobler…" : "Koble til eiendel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Ny oppgave ── */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { setShowTaskModal(false); resetTaskForm(); }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Ny oppgave – {asset.name}</h2>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Hva må gjøres?</label>
                <input type="text" placeholder="F.eks. «Skifte vinterdekk»" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
                  className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Når?</label>
                  {/* Måned / Dato toggle */}
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-1.5">
                    <button type="button" onClick={() => setDateMode("month")}
                      className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${dateMode === "month" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}>
                      Måned
                    </button>
                    <button type="button" onClick={() => setDateMode("date")}
                      className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${dateMode === "date" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}>
                      Dato
                    </button>
                  </div>
                  {dateMode === "month"
                    ? <input type="month" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    : <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  }
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Kostnad (kr)</label>
                  <input type="number" placeholder="F.eks. 3000" value={cost} onChange={(e) => setCost(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Hvem er ansvarlig? (valgfritt)</label>
                <select value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">Ingen valgt</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {responsibleId && <p className="text-xs text-green-600 mt-1">✓ Legges automatisk til i aktivitetskalenderen</p>}
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="w-4 h-4 accent-blue-500" />
                <span className="text-sm">Gjentas</span>
              </label>
              {recurring && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Intervall (måneder)</label>
                  <input type="number" value={recurringMonths} onChange={(e) => setRecurringMonths(e.target.value)} min="1"
                    className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notater (valgfritt)</label>
                <input type="text" placeholder="F.eks. «Ring Dekk1 på forhånd»" value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowTaskModal(false); resetTaskForm(); }} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Avbryt</button>
              <button onClick={handleSaveTask} disabled={!title.trim() || !dueDate || saving}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white">
                {saving ? "Lagrer…" : "Lagre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Rediger oppgave ── */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingTask(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Rediger oppgave</h2>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Hva må gjøres?</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus
                  className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Når?</label>
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-1.5">
                    <button type="button" onClick={() => setEditDateMode("month")}
                      className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${editDateMode === "month" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}>
                      Måned
                    </button>
                    <button type="button" onClick={() => setEditDateMode("date")}
                      className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${editDateMode === "date" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}>
                      Dato
                    </button>
                  </div>
                  {editDateMode === "month"
                    ? <input type="month" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    : <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  }
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Kostnad (kr)</label>
                  <input type="number" placeholder="F.eks. 3000" value={editCost} onChange={(e) => setEditCost(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Hvem er ansvarlig? (valgfritt)</label>
                <select value={editResponsibleId} onChange={(e) => setEditResponsibleId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">Ingen valgt</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={editRecurring} onChange={(e) => setEditRecurring(e.target.checked)} className="w-4 h-4 accent-blue-500" />
                <span className="text-sm">Gjentas</span>
              </label>
              {editRecurring && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Intervall (måneder)</label>
                  <input type="number" value={editRecurringMonths} onChange={(e) => setEditRecurringMonths(e.target.value)} min="1"
                    className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notater (valgfritt)</label>
                <input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingTask(null)} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Avbryt</button>
              <button onClick={handleUpdateTask} disabled={!editTitle.trim() || !editDueDate || editTaskSaving}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white">
                {editTaskSaving ? "Lagrer…" : "Lagre endringer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
