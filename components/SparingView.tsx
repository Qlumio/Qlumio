"use client";

import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SavingsAccount = {
  id: string;
  name: string;
  balance: number;
  monthly_amount: number;
  budget_item_id: string | null;
  notes: string | null;
  created_at: string;
};

type Props = {
  accounts: SavingsAccount[];
  embedded?: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("nb-NO") + " kr";

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(".", ",") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return n.toLocaleString("nb-NO");
};

const MONTH_NAMES = ["jan","feb","mar","apr","mai","jun","jul","aug","sep","okt","nov","des"];

// ─── Skjema ───────────────────────────────────────────────────────────────────

const emptyForm = { name: "", balance: "", monthly_amount: "", notes: "" };
type AccountForm = typeof emptyForm;

const accountToForm = (a: SavingsAccount): AccountForm => ({
  name: a.name,
  balance: a.balance ? String(a.balance) : "",
  monthly_amount: a.monthly_amount ? String(a.monthly_amount) : "",
  notes: a.notes ?? "",
});

function AccountFormFields({ form, setForm }: { form: AccountForm; setForm: (f: AccountForm) => void }) {
  return (
    <div className="space-y-3 mb-5">
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Navn *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder='F.eks. "BSU" eller "Bufferkonto"'
          autoFocus
          className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Saldo (kr)</label>
          <input
            type="number"
            value={form.balance}
            onChange={(e) => setForm({ ...form, balance: e.target.value })}
            placeholder="150 000"
            className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Månedlig sparing (kr)</label>
          <input
            type="number"
            value={form.monthly_amount}
            onChange={(e) => setForm({ ...form, monthly_amount: e.target.value })}
            placeholder="5 000"
            className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Notater (valgfritt)</label>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Valgfritt"
          className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>
    </div>
  );
}

// ─── Sparekort ────────────────────────────────────────────────────────────────

function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: SavingsAccount;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showProj, setShowProj] = useState(false);
  const now = new Date();

  const projection = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const bal = account.balance + (i + 1) * account.monthly_amount;
        const d = new Date(now.getFullYear(), now.getMonth() + i);
        return { idx: i, monthLabel: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), balance: bal };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account.balance, account.monthly_amount]
  );

  const yearEnd = account.balance + 12 * account.monthly_amount;
  const yearGrowth = 12 * account.monthly_amount;

  return (
    <div className="bg-white rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-semibold text-gray-900">{account.name}</span>
              {account.budget_item_id && (
                <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  ✓ budsjett
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <div className="text-xs text-gray-400 mb-0.5">Saldo nå</div>
                <div className="text-sm font-bold text-gray-900">{fmtShort(account.balance)}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <div className="text-xs text-gray-400 mb-0.5">Per måned</div>
                <div className="text-sm font-bold text-emerald-600">
                  {account.monthly_amount > 0 ? "+" + fmtShort(account.monthly_amount) : "–"}
                </div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
                <div className="text-xs text-gray-400 mb-0.5">Om 12 mnd</div>
                <div className="text-sm font-bold text-emerald-700">{fmtShort(yearEnd)}</div>
              </div>
            </div>
            {account.notes && <p className="text-xs text-gray-400 mt-2">{account.notes}</p>}
            {yearGrowth > 0 && (
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-300 rounded-full" style={{ width: "55%" }} />
                </div>
                <span className="text-xs text-emerald-600 font-medium">+{fmt(yearGrowth)} / år</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onEdit} className="text-gray-400 hover:text-blue-500 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={onDelete} className="text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div>
        <button
          onClick={() => setShowProj((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-400 hover:bg-gray-50 transition-colors border-t border-gray-100"
        >
          <span>Vis månedlig prognose</span>
          <span className={`transition-transform ${showProj ? "rotate-180" : ""}`}>▾</span>
        </button>
        {showProj && (
          <div className="border-t border-gray-100 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-400">
                  <th className="text-left px-4 py-2 font-medium">Måned</th>
                  <th className="text-right px-3 py-2 font-medium">Innskudd</th>
                  <th className="text-right px-4 py-2 font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {projection.map((row) => (
                  <tr key={row.idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-1.5 text-gray-600">
                      {row.monthLabel}{" "}
                      {row.year !== now.getFullYear() ? row.year : ""}
                    </td>
                    <td className="text-right px-3 py-1.5 text-emerald-600">
                      {account.monthly_amount > 0
                        ? "+" + account.monthly_amount.toLocaleString("nb-NO")
                        : "–"}
                    </td>
                    <td className="text-right px-4 py-1.5 font-medium text-gray-700">
                      {row.balance.toLocaleString("nb-NO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Hovedkomponent ───────────────────────────────────────────────────────────

export default function SparingView({ accounts: initAccounts, embedded = false }: Props) {
  const [accounts, setAccounts] = useState<SavingsAccount[]>(initAccounts);
  const [showAdd, setShowAdd] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SavingsAccount | null>(null);
  const [form, setForm] = useState<AccountForm>({ ...emptyForm });
  const [editForm, setEditForm] = useState<AccountForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalMonthly = accounts.reduce((s, a) => s + a.monthly_amount, 0);

  // ── Budget sync helpers ────────────────────────────────────────────────────

  const createLinkedBudgetItem = async (
    accountId: string,
    name: string,
    monthlyAmount: number,
    balance: number
  ) => {
    const { data: savingsCat } = await supabase
      .from("budget_categories")
      .select("id")
      .eq("type", "savings")
      .maybeSingle();
    if (!savingsCat) return;
    const { data: newItem } = await supabase
      .from("budget_items")
      .insert({
        category_id: savingsCat.id,
        name,
        sort_order: 999,
        monthly_default: monthlyAmount,
        starting_balance: balance,
        source: "savings",
      })
      .select()
      .single();
    if (newItem) {
      await supabase
        .from("savings_accounts")
        .update({ budget_item_id: newItem.id })
        .eq("id", accountId);
      return newItem.id as string;
    }
  };

  const syncBudgetItem = async (
    budgetItemId: string,
    name: string,
    monthlyAmount: number,
    balance: number
  ) => {
    await supabase
      .from("budget_items")
      .update({ name, monthly_default: monthlyAmount, starting_balance: balance })
      .eq("id", budgetItemId);
  };

  // ── Save handlers ──────────────────────────────────────────────────────────

  const saveAccount = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const balance = parseFloat(form.balance) || 0;
    const monthly = parseFloat(form.monthly_amount) || 0;

    const { data } = await supabase
      .from("savings_accounts")
      .insert({ name: form.name.trim(), balance, monthly_amount: monthly, notes: form.notes.trim() || null })
      .select()
      .single();

    if (data) {
      const budgetItemId = await createLinkedBudgetItem(data.id, form.name.trim(), monthly, balance);
      setAccounts((p) => [...p, { ...data as SavingsAccount, budget_item_id: budgetItemId ?? null }]);
      setForm({ ...emptyForm });
      setShowAdd(false);
    }
    setSaving(false);
  };

  const updateAccount = async () => {
    if (!editingAccount || !editForm.name.trim()) return;
    setSaving(true);
    const balance = parseFloat(editForm.balance) || 0;
    const monthly = parseFloat(editForm.monthly_amount) || 0;

    const { data } = await supabase
      .from("savings_accounts")
      .update({ name: editForm.name.trim(), balance, monthly_amount: monthly, notes: editForm.notes.trim() || null })
      .eq("id", editingAccount.id)
      .select()
      .single();

    if (data) {
      if (editingAccount.budget_item_id) {
        await syncBudgetItem(editingAccount.budget_item_id, editForm.name.trim(), monthly, balance);
      } else {
        const budgetItemId = await createLinkedBudgetItem(editingAccount.id, editForm.name.trim(), monthly, balance);
        (data as SavingsAccount).budget_item_id = budgetItemId ?? null;
      }
      setAccounts((p) => p.map((a) => (a.id === editingAccount.id ? (data as SavingsAccount) : a)));
      setEditingAccount(null);
    }
    setSaving(false);
  };

  const deleteAccount = async (a: SavingsAccount) => {
    if (!confirm(`Slett "${a.name}"? Tilknyttet budsjettpost slettes også.`)) return;
    if (a.budget_item_id)
      await supabase.from("budget_items").delete().eq("id", a.budget_item_id);
    await supabase.from("savings_accounts").delete().eq("id", a.id);
    setAccounts((p) => p.filter((x) => x.id !== a.id));
  };

  return (
    <main className={embedded ? "text-gray-900 p-6" : "min-h-screen bg-gray-50 text-gray-900 p-6"}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          {!embedded && <h1 className="text-lg font-semibold">Sparing</h1>}
          {embedded && <div />}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ny konto
          </button>
        </div>

        {/* Sammendrag */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-xs text-gray-400 mb-1">Total saldo</div>
              <div className="text-lg font-bold text-gray-900">{fmt(totalBalance)}</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <div className="text-xs text-gray-400 mb-1">Sparer per måned</div>
              <div className="text-lg font-bold text-emerald-700">+{fmt(totalMonthly)}</div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {accounts.length === 0 && (
            <p className="text-center text-gray-400 py-10 text-sm">Ingen sparekontoer lagt til ennå.</p>
          )}
          {accounts.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              onEdit={() => { setEditingAccount(a); setEditForm(accountToForm(a)); }}
              onDelete={() => deleteAccount(a)}
            />
          ))}
        </div>
      </div>

      {/* Modal: Ny konto */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Ny sparekonto</h2>
            <AccountFormFields form={form} setForm={setForm} />
            <p className="text-xs text-gray-400 mb-4">
              Månedlig sparebeløp kobles automatisk til budsjettet.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">
                Avbryt
              </button>
              <button
                onClick={saveAccount}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white"
              >
                {saving ? "Lagrer…" : "Lagre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rediger konto */}
      {editingAccount && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingAccount(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Rediger sparekonto</h2>
            <AccountFormFields form={editForm} setForm={setEditForm} />
            {editingAccount.budget_item_id && (
              <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg mb-4">
                Endringer synkroniseres automatisk til budsjettet.
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setEditingAccount(null)} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">
                Avbryt
              </button>
              <button
                onClick={updateAccount}
                disabled={saving || !editForm.name.trim()}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white"
              >
                {saving ? "Lagrer…" : "Lagre endringer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
