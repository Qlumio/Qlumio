"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

type Insurance = {
  id: string; name: string; type: string; provider: string;
  annual_premium: number | null; coverage: string | null;
  renewal_date: string | null; policy_number: string | null;
  notes: string | null; created_at: string;
};

type Loan = {
  id: string; name: string; type: string; provider: string;
  remaining_debt: number | null; interest_rate: number | null;
  monthly_payment: number | null; end_date: string | null;
  notes: string | null; budget_item_id: string | null; created_at: string;
};

type Pension = {
  id: string; name: string; type: string; provider: string;
  current_balance: number | null; monthly_contribution: number | null;
  notes: string | null; created_at: string;
};

type Tab = "forsikring" | "lan" | "pensjon";

type Props = {
  insurances: Insurance[];
  loans: Loan[];
  pensions: Pension[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

const INSURANCE_TYPES = ["Bil", "Hus / innbo", "Liv", "Reise", "Ulykke / person", "Båt", "Motorsykkel", "Annet"];
const LOAN_TYPES = ["Boliglån", "Billån", "Studielån", "Forbrukslån", "Annet"];
const PENSION_TYPES = ["OTP", "IPS", "AFP", "Privat pensjonssparing", "Annet"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number | null) => n == null ? "–" : n.toLocaleString("nb-NO") + " kr";
const fmtDate = (d: string | null) => {
  if (!d) return "–";
  const dt = new Date(d + "T00:00:00");
  return `${dt.getDate()}.${dt.getMonth() + 1}.${dt.getFullYear()}`;
};

// ─── Empty form defaults ──────────────────────────────────────────────────────

const emptyInsurance = { name: "", type: "Bil", provider: "", annual_premium: "", coverage: "", renewal_date: "", policy_number: "", notes: "" };
const emptyLoan = { name: "", type: "Boliglån", provider: "", remaining_debt: "", interest_rate: "", monthly_payment: "", end_date: "", notes: "" };
const emptyPension = { name: "", type: "OTP", provider: "", current_balance: "", monthly_contribution: "", notes: "" };

const loanToForm = (l: Loan) => ({
  name: l.name,
  type: l.type,
  provider: l.provider,
  remaining_debt: l.remaining_debt != null ? String(l.remaining_debt) : "",
  interest_rate: l.interest_rate != null ? String(l.interest_rate) : "",
  monthly_payment: l.monthly_payment != null ? String(l.monthly_payment) : "",
  end_date: l.end_date ?? "",
  notes: l.notes ?? "",
});

// ─── Shared UI helpers (outside component to avoid re-creation) ──────────────

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs text-gray-400 mb-1 block">{label}</label>
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
  <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
);

const Select = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm">
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

const DeleteBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  </button>
);

const EditBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  </button>
);

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{children}</span>
);

// ─── Component ───────────────────────────────────────────────────────────────

export default function LFPView({ insurances: init_i, loans: init_l, pensions: init_p, embedded = false }: Props & { embedded?: boolean }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("forsikring");
  const [insurances, setInsurances] = useState<Insurance[]>(init_i);
  const [loans, setLoans] = useState<Loan[]>(init_l);
  const [pensions, setPensions] = useState<Pension[]>(init_p);

  const [showAdd, setShowAdd] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [saving, setSaving] = useState(false);

  const [iForm, setIForm] = useState({ ...emptyInsurance });
  const [lForm, setLForm] = useState({ ...emptyLoan });
  const [pForm, setPForm] = useState({ ...emptyPension });

  // Edit state for loans
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [lEditForm, setLEditForm] = useState({ ...emptyLoan });

  // ─── Budget sync helpers ────────────────────────────────────────────────────

  const createLinkedBudgetItem = async (loanId: string, name: string, monthly_payment: number | null, remaining_debt: number | null) => {
    const { data: loanCat } = await supabase
      .from("budget_categories")
      .select("id")
      .eq("type", "loan")
      .maybeSingle();

    if (!loanCat) return;

    const { data: newItem } = await supabase
      .from("budget_items")
      .insert({
        category_id: loanCat.id,
        name: name,
        sort_order: 999,
        monthly_default: monthly_payment ?? 0,
        starting_balance: remaining_debt ?? 0,
        source: "loan",
      })
      .select()
      .single();

    if (newItem) {
      await supabase.from("loans").update({ budget_item_id: newItem.id }).eq("id", loanId);
      return newItem.id as string;
    }
  };

  const syncBudgetItem = async (budgetItemId: string, name: string, monthly_payment: number | null, remaining_debt: number | null) => {
    await supabase
      .from("budget_items")
      .update({
        name: name,
        monthly_default: monthly_payment ?? 0,
        starting_balance: remaining_debt ?? 0,
      })
      .eq("id", budgetItemId);
  };

  const deleteLinkedBudgetItem = async (budgetItemId: string) => {
    await supabase.from("budget_items").delete().eq("id", budgetItemId);
  };

  // ─── Save handlers ──────────────────────────────────────────────────────────

  const saveInsurance = async () => {
    if (!iForm.name.trim() || !iForm.provider.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("insurances").insert({
      name: iForm.name.trim(), type: iForm.type, provider: iForm.provider.trim(),
      annual_premium: iForm.annual_premium ? parseInt(iForm.annual_premium) : null,
      coverage: iForm.coverage.trim() || null,
      renewal_date: iForm.renewal_date || null,
      policy_number: iForm.policy_number.trim() || null,
      notes: iForm.notes.trim() || null,
    }).select().single();
    setSaving(false);
    if (data) { setInsurances((p) => [...p, data as Insurance]); setIForm({ ...emptyInsurance }); setShowAdd(false); }
  };

  const saveLoan = async () => {
    if (!lForm.name.trim() || !lForm.provider.trim()) return;
    setSaving(true);

    const monthly_payment = lForm.monthly_payment ? parseInt(lForm.monthly_payment) : null;
    const remaining_debt = lForm.remaining_debt ? parseInt(lForm.remaining_debt) : null;

    const { data } = await supabase.from("loans").insert({
      name: lForm.name.trim(), type: lForm.type, provider: lForm.provider.trim(),
      remaining_debt,
      interest_rate: lForm.interest_rate ? parseFloat(lForm.interest_rate) : null,
      monthly_payment,
      end_date: lForm.end_date || null,
      notes: lForm.notes.trim() || null,
    }).select().single();

    if (data) {
      // Link to budget
      const budgetItemId = await createLinkedBudgetItem(data.id, lForm.name.trim(), monthly_payment, remaining_debt);
      const savedLoan: Loan = { ...data as Loan, budget_item_id: budgetItemId ?? null };
      setLoans((p) => [...p, savedLoan]);
      setLForm({ ...emptyLoan });
      setShowAdd(false);
    }
    setSaving(false);
  };

  const updateLoan = async () => {
    if (!editingLoan || !lEditForm.name.trim() || !lEditForm.provider.trim()) return;
    setSaving(true);

    const monthly_payment = lEditForm.monthly_payment ? parseInt(lEditForm.monthly_payment) : null;
    const remaining_debt = lEditForm.remaining_debt ? parseInt(lEditForm.remaining_debt) : null;

    const { data } = await supabase
      .from("loans")
      .update({
        name: lEditForm.name.trim(), type: lEditForm.type, provider: lEditForm.provider.trim(),
        remaining_debt,
        interest_rate: lEditForm.interest_rate ? parseFloat(lEditForm.interest_rate) : null,
        monthly_payment,
        end_date: lEditForm.end_date || null,
        notes: lEditForm.notes.trim() || null,
      })
      .eq("id", editingLoan.id)
      .select()
      .single();

    if (data) {
      const updatedLoan = data as Loan;
      // Sync budget item
      if (editingLoan.budget_item_id) {
        await syncBudgetItem(editingLoan.budget_item_id, lEditForm.name.trim(), monthly_payment, remaining_debt);
      } else {
        // Create budget item if it doesn't exist yet
        const budgetItemId = await createLinkedBudgetItem(editingLoan.id, lEditForm.name.trim(), monthly_payment, remaining_debt);
        updatedLoan.budget_item_id = budgetItemId ?? null;
      }
      setLoans((p) => p.map((l) => l.id === editingLoan.id ? updatedLoan : l));
      setEditingLoan(null);
    }
    setSaving(false);
  };

  const savePension = async () => {
    if (!pForm.name.trim() || !pForm.provider.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("pensions").insert({
      name: pForm.name.trim(), type: pForm.type, provider: pForm.provider.trim(),
      current_balance: pForm.current_balance ? parseInt(pForm.current_balance) : null,
      monthly_contribution: pForm.monthly_contribution ? parseInt(pForm.monthly_contribution) : null,
      notes: pForm.notes.trim() || null,
    }).select().single();
    setSaving(false);
    if (data) { setPensions((p) => [...p, data as Pension]); setPForm({ ...emptyPension }); setShowAdd(false); }
  };

  const deleteInsurance = async (id: string) => {
    if (!confirm("Slett denne forsikringen?")) return;
    await supabase.from("insurances").delete().eq("id", id);
    setInsurances((p) => p.filter((i) => i.id !== id));
  };

  const deleteLoan = async (l: Loan) => {
    if (!confirm("Slett dette lånet? Tilknyttet budsjettpost slettes også.")) return;
    if (l.budget_item_id) {
      await deleteLinkedBudgetItem(l.budget_item_id);
    }
    await supabase.from("loans").delete().eq("id", l.id);
    setLoans((p) => p.filter((x) => x.id !== l.id));
  };

  const deletePension = async (id: string) => {
    if (!confirm("Slett denne pensjonsavtalen?")) return;
    await supabase.from("pensions").delete().eq("id", id);
    setPensions((p) => p.filter((p2) => p2.id !== id));
  };

  // ─── Export content ──────────────────────────────────────────────────────────

  const renderExportContent = () => {
    const today = new Date().toLocaleDateString("nb-NO");
    if (activeTab === "forsikring") return (
      <div className="text-slate-900">
        <h2 className="text-xl font-bold mb-1">Forsikringsoversikt</h2>
        <p className="text-sm text-gray-400 mb-6">Eksportert fra Qlumio · {today}</p>
        <table className="w-full text-sm border-collapse">
          <thead><tr className="border-b-2 border-slate-300">
            <th className="text-left py-2 pr-3">Navn</th>
            <th className="text-left py-2 pr-3">Type</th>
            <th className="text-left py-2 pr-3">Leverandør</th>
            <th className="text-left py-2 pr-3">Dekning</th>
            <th className="text-right py-2 pr-3">Premie/år</th>
            <th className="text-left py-2">Fornyelse</th>
          </tr></thead>
          <tbody>{insurances.map((i) => (
            <tr key={i.id} className="border-b border-slate-200">
              <td className="py-2 pr-3 font-medium">{i.name}</td>
              <td className="py-2 pr-3">{i.type}</td>
              <td className="py-2 pr-3">{i.provider}</td>
              <td className="py-2 pr-3">{i.coverage ?? "–"}</td>
              <td className="py-2 pr-3 text-right">{fmt(i.annual_premium)}</td>
              <td className="py-2">{fmtDate(i.renewal_date)}</td>
            </tr>
          ))}</tbody>
        </table>
        <p className="text-xs text-gray-500 mt-6">Totalt: {fmt(insurances.reduce((s, i) => s + (i.annual_premium ?? 0), 0))} per år</p>
      </div>
    );
    if (activeTab === "lan") return (
      <div className="text-slate-900">
        <h2 className="text-xl font-bold mb-1">Lånoversikt</h2>
        <p className="text-sm text-gray-400 mb-6">Eksportert fra Qlumio · {today}</p>
        <table className="w-full text-sm border-collapse">
          <thead><tr className="border-b-2 border-slate-300">
            <th className="text-left py-2 pr-3">Navn</th>
            <th className="text-left py-2 pr-3">Type</th>
            <th className="text-left py-2 pr-3">Leverandør</th>
            <th className="text-right py-2 pr-3">Restgjeld</th>
            <th className="text-right py-2 pr-3">Rente</th>
            <th className="text-right py-2">Mnd.bet.</th>
          </tr></thead>
          <tbody>{loans.map((l) => (
            <tr key={l.id} className="border-b border-slate-200">
              <td className="py-2 pr-3 font-medium">{l.name}</td>
              <td className="py-2 pr-3">{l.type}</td>
              <td className="py-2 pr-3">{l.provider}</td>
              <td className="py-2 pr-3 text-right">{fmt(l.remaining_debt)}</td>
              <td className="py-2 pr-3 text-right">{l.interest_rate != null ? l.interest_rate + " %" : "–"}</td>
              <td className="py-2 text-right">{fmt(l.monthly_payment)}</td>
            </tr>
          ))}</tbody>
        </table>
        <p className="text-xs text-gray-500 mt-6">Total restgjeld: {fmt(loans.reduce((s, l) => s + (l.remaining_debt ?? 0), 0))}</p>
      </div>
    );
    return (
      <div className="text-slate-900">
        <h2 className="text-xl font-bold mb-1">Pensjonsoversikt</h2>
        <p className="text-sm text-gray-400 mb-6">Eksportert fra Qlumio · {today}</p>
        <table className="w-full text-sm border-collapse">
          <thead><tr className="border-b-2 border-slate-300">
            <th className="text-left py-2 pr-3">Navn</th>
            <th className="text-left py-2 pr-3">Type</th>
            <th className="text-left py-2 pr-3">Leverandør</th>
            <th className="text-right py-2 pr-3">Saldo</th>
            <th className="text-right py-2">Mnd. innskudd</th>
          </tr></thead>
          <tbody>{pensions.map((p) => (
            <tr key={p.id} className="border-b border-slate-200">
              <td className="py-2 pr-3 font-medium">{p.name}</td>
              <td className="py-2 pr-3">{p.type}</td>
              <td className="py-2 pr-3">{p.provider}</td>
              <td className="py-2 pr-3 text-right">{fmt(p.current_balance)}</td>
              <td className="py-2 text-right">{fmt(p.monthly_contribution)}</td>
            </tr>
          ))}</tbody>
        </table>
        <p className="text-xs text-gray-500 mt-6">Total saldo: {fmt(pensions.reduce((s, p) => s + (p.current_balance ?? 0), 0))}</p>
      </div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className={embedded ? "text-gray-900 p-6" : "min-h-screen bg-gray-50 text-gray-900 p-6"}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {!embedded ? (
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Tilbake
              </button>
              <div className="w-px h-5 bg-gray-100" />
              <h1 className="text-lg font-semibold">Lån, forsikringer og pensjon</h1>
            </div>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Eksporter
            </button>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Legg til
            </button>
          </div>
        </div>

        {/* Faner */}
        <div className="flex gap-1 mb-6 bg-white p-1 rounded-xl">
          {(["forsikring", "lan", "pensjon"] as Tab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"}`}>
              {tab === "forsikring" ? `Forsikringer (${insurances.length})` : tab === "lan" ? `Lån (${loans.length})` : `Pensjon (${pensions.length})`}
            </button>
          ))}
        </div>

        {/* ── Forsikringer ── */}
        {activeTab === "forsikring" && (
          <div className="space-y-3">
            {insurances.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">Ingen forsikringer lagt til ennå.</p>}
            {insurances.map((i) => (
              <div key={i.id} className="bg-white rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold mb-1.5">{i.name}</div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <Tag>{i.type}</Tag>
                      <Tag>📍 {i.provider}</Tag>
                      {i.annual_premium != null && <Tag>💰 {fmt(i.annual_premium)}/år</Tag>}
                      {i.renewal_date && <Tag>🗓 {fmtDate(i.renewal_date)}</Tag>}
                    </div>
                    {i.coverage && <p className="text-xs text-gray-500">Dekning: {i.coverage}</p>}
                    {i.policy_number && <p className="text-xs text-gray-400 mt-0.5">Polisenr: {i.policy_number}</p>}
                    {i.notes && <p className="text-xs text-gray-400 mt-0.5">{i.notes}</p>}
                  </div>
                  <DeleteBtn onClick={() => deleteInsurance(i.id)} />
                </div>
              </div>
            ))}
            {insurances.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-right text-gray-500">
                Total premie: <span className="text-gray-900 font-semibold">{fmt(insurances.reduce((s, i) => s + (i.annual_premium ?? 0), 0))}</span> per år
              </div>
            )}
          </div>
        )}

        {/* ── Lån ── */}
        {activeTab === "lan" && (
          <div className="space-y-3">
            {loans.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">Ingen lån lagt til ennå.</p>}
            {loans.map((l) => (
              <div key={l.id} className="bg-white rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="font-semibold">{l.name}</div>
                      {l.budget_item_id && (
                        <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">✓ budsjett</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <Tag>{l.type}</Tag>
                      <Tag>📍 {l.provider}</Tag>
                      {l.remaining_debt != null && <Tag>💳 {fmt(l.remaining_debt)}</Tag>}
                      {l.interest_rate != null && <Tag>📈 {l.interest_rate} %</Tag>}
                      {l.monthly_payment != null && <Tag>🗓 {fmt(l.monthly_payment)}/mnd</Tag>}
                    </div>
                    {l.end_date && <p className="text-xs text-gray-500">Sluttdato: {fmtDate(l.end_date)}</p>}
                    {l.notes && <p className="text-xs text-gray-400 mt-0.5">{l.notes}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <EditBtn onClick={() => { setEditingLoan(l); setLEditForm(loanToForm(l)); }} />
                    <DeleteBtn onClick={() => deleteLoan(l)} />
                  </div>
                </div>
              </div>
            ))}
            {loans.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-right text-gray-500">
                Total restgjeld: <span className="text-gray-900 font-semibold">{fmt(loans.reduce((s, l) => s + (l.remaining_debt ?? 0), 0))}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Pensjon ── */}
        {activeTab === "pensjon" && (
          <div className="space-y-3">
            {pensions.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">Ingen pensjonsavtaler lagt til ennå.</p>}
            {pensions.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold mb-1.5">{p.name}</div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <Tag>{p.type}</Tag>
                      <Tag>📍 {p.provider}</Tag>
                      {p.current_balance != null && <Tag>💰 {fmt(p.current_balance)}</Tag>}
                      {p.monthly_contribution != null && <Tag>📥 {fmt(p.monthly_contribution)}/mnd</Tag>}
                    </div>
                    {p.notes && <p className="text-xs text-gray-400">{p.notes}</p>}
                  </div>
                  <DeleteBtn onClick={() => deletePension(p.id)} />
                </div>
              </div>
            ))}
            {pensions.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-right text-gray-500">
                Total saldo: <span className="text-gray-900 font-semibold">{fmt(pensions.reduce((s, p) => s + (p.current_balance ?? 0), 0))}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Legg til ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">
              {activeTab === "forsikring" ? "Ny forsikring" : activeTab === "lan" ? "Nytt lån" : "Ny pensjonsavtale"}
            </h2>

            {/* Forsikring-form */}
            {activeTab === "forsikring" && (
              <div className="space-y-3 mb-5">
                <Field label="Navn *"><Input value={iForm.name} onChange={(v) => setIForm({ ...iForm, name: v })} placeholder='F.eks. "Bilforsikring Tesla"' /></Field>
                <Field label="Type"><Select value={iForm.type} onChange={(v) => setIForm({ ...iForm, type: v })} options={INSURANCE_TYPES} /></Field>
                <Field label="Leverandør *"><Input value={iForm.provider} onChange={(v) => setIForm({ ...iForm, provider: v })} placeholder='F.eks. "If"' /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Årlig premie (kr)"><Input type="number" value={iForm.annual_premium} onChange={(v) => setIForm({ ...iForm, annual_premium: v })} placeholder="12 000" /></Field>
                  <Field label="Fornyelsesdato"><Input type="date" value={iForm.renewal_date} onChange={(v) => setIForm({ ...iForm, renewal_date: v })} /></Field>
                </div>
                <Field label="Dekning"><Input value={iForm.coverage} onChange={(v) => setIForm({ ...iForm, coverage: v })} placeholder='F.eks. "Kasko, 2 mnok"' /></Field>
                <Field label="Polisenummer"><Input value={iForm.policy_number} onChange={(v) => setIForm({ ...iForm, policy_number: v })} placeholder="Valgfritt" /></Field>
                <Field label="Notater"><Input value={iForm.notes} onChange={(v) => setIForm({ ...iForm, notes: v })} placeholder="Valgfritt" /></Field>
              </div>
            )}

            {/* Lån-form */}
            {activeTab === "lan" && (
              <div className="space-y-3 mb-5">
                <Field label="Navn *"><Input value={lForm.name} onChange={(v) => setLForm({ ...lForm, name: v })} placeholder='F.eks. "Huslån DNB"' /></Field>
                <Field label="Type"><Select value={lForm.type} onChange={(v) => setLForm({ ...lForm, type: v })} options={LOAN_TYPES} /></Field>
                <Field label="Leverandør *"><Input value={lForm.provider} onChange={(v) => setLForm({ ...lForm, provider: v })} placeholder='F.eks. "DNB"' /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Restgjeld (kr)"><Input type="number" value={lForm.remaining_debt} onChange={(v) => setLForm({ ...lForm, remaining_debt: v })} placeholder="3 500 000" /></Field>
                  <Field label="Rente (%)"><Input type="number" value={lForm.interest_rate} onChange={(v) => setLForm({ ...lForm, interest_rate: v })} placeholder="5.29" /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Mnd. betaling (kr)"><Input type="number" value={lForm.monthly_payment} onChange={(v) => setLForm({ ...lForm, monthly_payment: v })} placeholder="18 000" /></Field>
                  <Field label="Sluttdato"><Input type="date" value={lForm.end_date} onChange={(v) => setLForm({ ...lForm, end_date: v })} /></Field>
                </div>
                <Field label="Notater"><Input value={lForm.notes} onChange={(v) => setLForm({ ...lForm, notes: v })} placeholder="Valgfritt" /></Field>
                <p className="text-xs text-gray-400">Lånet kobles automatisk til budsjettet som en lånekostnad.</p>
              </div>
            )}

            {/* Pensjon-form */}
            {activeTab === "pensjon" && (
              <div className="space-y-3 mb-5">
                <Field label="Navn *"><Input value={pForm.name} onChange={(v) => setPForm({ ...pForm, name: v })} placeholder='F.eks. "OTP Storebrand"' /></Field>
                <Field label="Type"><Select value={pForm.type} onChange={(v) => setPForm({ ...pForm, type: v })} options={PENSION_TYPES} /></Field>
                <Field label="Leverandør *"><Input value={pForm.provider} onChange={(v) => setPForm({ ...pForm, provider: v })} placeholder='F.eks. "Storebrand"' /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nåværende saldo (kr)"><Input type="number" value={pForm.current_balance} onChange={(v) => setPForm({ ...pForm, current_balance: v })} placeholder="250 000" /></Field>
                  <Field label="Mnd. innskudd (kr)"><Input type="number" value={pForm.monthly_contribution} onChange={(v) => setPForm({ ...pForm, monthly_contribution: v })} placeholder="2 000" /></Field>
                </div>
                <Field label="Notater"><Input value={pForm.notes} onChange={(v) => setPForm({ ...pForm, notes: v })} placeholder="Valgfritt" /></Field>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Avbryt</button>
              <button
                onClick={activeTab === "forsikring" ? saveInsurance : activeTab === "lan" ? saveLoan : savePension}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white"
              >
                {saving ? "Lagrer…" : "Lagre"}
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
            <div className="space-y-3 mb-5">
              <Field label="Navn *"><Input value={lEditForm.name} onChange={(v) => setLEditForm({ ...lEditForm, name: v })} placeholder='F.eks. "Huslån DNB"' /></Field>
              <Field label="Type"><Select value={lEditForm.type} onChange={(v) => setLEditForm({ ...lEditForm, type: v })} options={LOAN_TYPES} /></Field>
              <Field label="Leverandør *"><Input value={lEditForm.provider} onChange={(v) => setLEditForm({ ...lEditForm, provider: v })} placeholder='F.eks. "DNB"' /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Restgjeld (kr)"><Input type="number" value={lEditForm.remaining_debt} onChange={(v) => setLEditForm({ ...lEditForm, remaining_debt: v })} placeholder="3 500 000" /></Field>
                <Field label="Rente (%)"><Input type="number" value={lEditForm.interest_rate} onChange={(v) => setLEditForm({ ...lEditForm, interest_rate: v })} placeholder="5.29" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mnd. betaling (kr)"><Input type="number" value={lEditForm.monthly_payment} onChange={(v) => setLEditForm({ ...lEditForm, monthly_payment: v })} placeholder="18 000" /></Field>
                <Field label="Sluttdato"><Input type="date" value={lEditForm.end_date} onChange={(v) => setLEditForm({ ...lEditForm, end_date: v })} /></Field>
              </div>
              <Field label="Notater"><Input value={lEditForm.notes} onChange={(v) => setLEditForm({ ...lEditForm, notes: v })} placeholder="Valgfritt" /></Field>
              {editingLoan.budget_item_id && (
                <p className="text-xs text-green-600 bg-green-50 p-2 rounded-lg">Endringer synkroniseres automatisk til budsjettet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingLoan(null)} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Avbryt</button>
              <button
                onClick={updateLoan}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white"
              >
                {saving ? "Lagrer…" : "Lagre endringer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Eksport ── */}
      {showExport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowExport(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {renderExportContent()}
            <div className="flex gap-2 mt-6 border-t pt-4">
              <button onClick={() => setShowExport(false)} className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-sm text-slate-700">Lukk</button>
              <button onClick={() => window.print()} className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors text-sm font-medium">
                🖨 Skriv ut / Lagre som PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
