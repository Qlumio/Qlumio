"use client";

import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Asset } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Loan = {
  id: string;
  name: string;
  type: string;
  provider: string;
  // Detaljerte lånefelter
  loan_amount: number | null;
  remaining_debt: number | null;
  interest_rate: number | null;        // Nominell rente %
  repayment_years: number | null;      // Nedbetalingstid (år)
  installments_per_year: number | null; // Terminer pr år
  installment_fee: number | null;      // Termingebyr kr
  monthly_payment: number | null;      // Beregnet/overstyrt mnd.bet.
  end_date: string | null;
  notes: string | null;
  budget_item_id: string | null;
  asset_id: string | null;
  created_at: string;
};

type Props = {
  loans: Loan[];
  assets?: Asset[];
  embedded?: boolean;
};

// ─── Konstanter ───────────────────────────────────────────────────────────────

const LOAN_TYPES = ["Boliglån", "Billån", "Studielån", "Forbrukslån", "Annet"];
const DEFAULT_INSTALLMENTS = 12;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) =>
  n == null ? "–" : n.toLocaleString("nb-NO") + " kr";

const fmtDate = (d: string | null) => {
  if (!d) return "–";
  const dt = new Date(d + "T00:00:00");
  return `${dt.getDate()}.${dt.getMonth() + 1}.${dt.getFullYear()}`;
};

/**
 * Beregner terminbeløp (annuitetslån).
 * terminbeløp = lånebeløp × (r / (1 − (1+r)^−n)) + termingebyr
 * der r = nominell_rente / 100 / terminer_per_år, n = år × terminer_per_år
 */
function beregnTermin(
  loanAmount: number,
  rente: number,
  aar: number,
  terminerPerAar: number,
  termingebyr: number,
): number {
  const r = rente / 100 / terminerPerAar;
  const n = aar * terminerPerAar;
  if (r === 0) return loanAmount / n + termingebyr;
  const terminbelop = loanAmount * (r / (1 - Math.pow(1 + r, -n))) + termingebyr;
  return Math.round(terminbelop);
}

/**
 * Beregner antall terminer igjen basert på restgjeld, rente og terminbeløp.
 * Formel: n = -ln(1 - r*balance/payment) / ln(1+r)
 * Returnerer Infinity hvis terminbeløpet ikke dekker rentene.
 */
function beregnGjenværendeTerminer(
  restgjeld: number,
  rente: number,
  terminbelop: number,
  terminerPerAar: number,
): number {
  const r = rente / 100 / terminerPerAar;
  if (terminbelop <= 0 || restgjeld <= 0) return 0;
  if (r === 0) return Math.ceil(restgjeld / terminbelop);
  if (terminbelop <= restgjeld * r) return Infinity; // betaler ikke ned
  return Math.ceil(-Math.log(1 - (r * restgjeld) / terminbelop) / Math.log(1 + r));
}

function formaterGjenværende(terminer: number, terminerPerAar: number): string {
  if (!isFinite(terminer)) return "Betaler ikke ned";
  const maaneder = Math.round((terminer / terminerPerAar) * 12);
  if (maaneder < 1) return "< 1 mnd";
  if (maaneder < 12) return `${maaneder} mnd`;
  const aar = Math.floor(maaneder / 12);
  const rest = maaneder % 12;
  return rest > 0 ? `${aar} år ${rest} mnd` : `${aar} år`;
}

const emptyForm = {
  name: "",
  type: "Boliglån",
  provider: "",
  loan_amount: "",
  remaining_debt: "",
  interest_rate: "",
  repayment_years: "",
  installments_per_year: String(DEFAULT_INSTALLMENTS),
  installment_fee: "0",
  end_date: "",
  notes: "",
  asset_id: "",
};

type LoanForm = typeof emptyForm;

const loanToForm = (l: Loan): LoanForm => ({
  name: l.name,
  type: l.type,
  provider: l.provider,
  loan_amount: l.loan_amount != null ? String(l.loan_amount) : "",
  remaining_debt: l.remaining_debt != null ? String(l.remaining_debt) : "",
  interest_rate: l.interest_rate != null ? String(l.interest_rate) : "",
  repayment_years: l.repayment_years != null ? String(l.repayment_years) : "",
  installments_per_year: l.installments_per_year != null ? String(l.installments_per_year) : String(DEFAULT_INSTALLMENTS),
  installment_fee: l.installment_fee != null ? String(l.installment_fee) : "0",
  end_date: l.end_date ?? "",
  notes: l.notes ?? "",
  asset_id: l.asset_id ?? "",
});

// ─── Sub-komponent: Kalkulering ───────────────────────────────────────────────

function LoanCalc({ form }: { form: LoanForm }) {
  const loanAmount = parseFloat(form.loan_amount) || 0;
  const rente = parseFloat(form.interest_rate) || 0;
  const aar = parseFloat(form.repayment_years) || 0;
  const terminer = parseInt(form.installments_per_year) || DEFAULT_INSTALLMENTS;
  const gebyr = parseFloat(form.installment_fee) || 0;

  const kanBeregne = loanAmount > 0 && rente > 0 && aar > 0;

  if (!kanBeregne) return (
    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-400 text-center">
      Fyll inn lånebeløp, rente og nedbetalingstid for å se beregning
    </div>
  );

  const terminbelop = beregnTermin(loanAmount, rente, aar, terminer, gebyr);
  const totalBetalt = terminbelop * aar * terminer;
  const totalRenter = totalBetalt - loanAmount;
  const renteAndel = (totalRenter / totalBetalt) * 100;

  return (
    <div className="bg-blue-50 rounded-lg p-3 space-y-2">
      <div className="text-xs font-semibold text-blue-700 mb-2">Beregning (annuitetslån)</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-lg p-2.5">
          <div className="text-xs text-gray-400">Terminbeløp</div>
          <div className="text-sm font-semibold text-gray-900">{fmt(terminbelop)}</div>
          <div className="text-xs text-gray-400">{terminer}× per år</div>
        </div>
        <div className="bg-white rounded-lg p-2.5">
          <div className="text-xs text-gray-400">Totalt betalt</div>
          <div className="text-sm font-semibold text-gray-900">{fmt(totalBetalt)}</div>
          <div className="text-xs text-gray-400">over {aar} år</div>
        </div>
        <div className="bg-white rounded-lg p-2.5">
          <div className="text-xs text-gray-400">Totale renter</div>
          <div className="text-sm font-semibold text-red-600">{fmt(totalRenter)}</div>
        </div>
        <div className="bg-white rounded-lg p-2.5">
          <div className="text-xs text-gray-400">Renteandel</div>
          <div className="text-sm font-semibold text-orange-600">{renteAndel.toFixed(1)} %</div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs text-gray-400 mb-1 block">{label}</label>
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, type = "text", step }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; step?: string;
}) => (
  <input type={type} step={step} value={value} onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
);

const Select = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm">
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{children}</span>
);

// ─── Lånekort ─────────────────────────────────────────────────────────────────

function LoanCard({ loan, assetName, onEdit, onDelete }: { loan: Loan; assetName?: string; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const terminerPerAar = loan.installments_per_year ?? DEFAULT_INSTALLMENTS;

  const terminbelop = useMemo(() => {
    if (loan.loan_amount && loan.interest_rate && loan.repayment_years) {
      return beregnTermin(
        loan.loan_amount,
        loan.interest_rate,
        loan.repayment_years,
        terminerPerAar,
        loan.installment_fee ?? 0,
      );
    }
    return loan.monthly_payment;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loan]);

  // Gjenværende terminer beregnes alltid fra restgjeld — ikke opprinnelig løpetid
  const restgjeld = loan.remaining_debt ?? loan.loan_amount ?? 0;
  const gjenTerminer = useMemo(() => {
    if (!terminbelop || !loan.interest_rate || restgjeld <= 0) return null;
    return beregnGjenværendeTerminer(restgjeld, loan.interest_rate, terminbelop, terminerPerAar);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restgjeld, terminbelop, loan.interest_rate, terminerPerAar]);

  // Totalkostnader basert på restgjeld (ikke opprinnelig lån)
  const totalBetalt = gjenTerminer && isFinite(gjenTerminer) && terminbelop
    ? Math.round(terminbelop * gjenTerminer)
    : null;
  const totalRenter = totalBetalt != null ? totalBetalt - restgjeld : null;

  const opprinneligLøpetidTerminer = loan.repayment_years
    ? loan.repayment_years * terminerPerAar
    : null;
  const erRedusert = gjenTerminer != null && opprinneligLøpetidTerminer != null
    && gjenTerminer < opprinneligLøpetidTerminer - 1;

  return (
    <div className="bg-white rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="font-semibold">{loan.name}</div>
              {loan.budget_item_id && (
                <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">✓ budsjett</span>
              )}
              {assetName && (
                <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">🏠 {assetName}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <Tag>{loan.type}</Tag>
              <Tag>📍 {loan.provider}</Tag>
              {loan.remaining_debt != null && <Tag>💳 {fmt(loan.remaining_debt)}</Tag>}
              {loan.interest_rate != null && <Tag>📈 {loan.interest_rate} %</Tag>}
              {terminbelop != null && <Tag>🗓 {fmt(terminbelop)}/termin</Tag>}
            </div>
            {loan.end_date && <p className="text-xs text-gray-500">Sluttdato: {fmtDate(loan.end_date)}</p>}
            {loan.notes && <p className="text-xs text-gray-400 mt-0.5">{loan.notes}</p>}
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

        {/* Beregningssammendrag */}
        {loan.interest_rate && terminbelop != null && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              {loan.loan_amount && (
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-400">Lånebeløp</div>
                  <div className="text-xs font-semibold">{fmt(loan.loan_amount)}</div>
                </div>
              )}
              {loan.repayment_years && (
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-400">Opprinnelig løpetid</div>
                  <div className="text-xs font-semibold text-gray-500">{loan.repayment_years} år</div>
                </div>
              )}
              {gjenTerminer != null && (
                <div className={`rounded-lg p-2 ${erRedusert ? "bg-blue-50" : "bg-gray-50"}`}>
                  <div className="text-xs text-gray-400">Gjenværende løpetid</div>
                  <div className={`text-xs font-semibold ${erRedusert ? "text-blue-700" : "text-gray-700"} ${!isFinite(gjenTerminer) ? "text-red-500" : ""}`}>
                    {formaterGjenværende(gjenTerminer, terminerPerAar)}
                  </div>
                </div>
              )}
            </div>
            {erRedusert && (
              <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-1.5">
                Gjenværende løpetid er beregnet fra restgjeld ({fmt(restgjeld)}), terminbeløp og rente — og avviker fra opprinnelig løpetid.
              </p>
            )}
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-blue-500 hover:text-blue-600 transition-colors"
        >
          {expanded ? "▲ Skjul detaljer" : "▼ Vis amortisering"}
        </button>
      </div>

      {/* Amortiseringstabell (mini) */}
      {expanded && loan.interest_rate && terminbelop && restgjeld > 0 && (
        <div className="border-t border-gray-100 p-4">
          <div className="text-xs text-gray-500 mb-2 font-medium">
            Neste 12 terminer
            {gjenTerminer != null && isFinite(gjenTerminer) && gjenTerminer <= 12 && (
              <span className="ml-2 text-blue-600">(fullt nedbetalt i løpet av denne perioden)</span>
            )}
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400">
                <th className="text-left pb-1">Mnd</th>
                <th className="text-right pb-1">Renter</th>
                <th className="text-right pb-1">Avdrag</th>
                <th className="text-right pb-1">Restgjeld</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rows = [];
                const r = (loan.interest_rate!) / 100 / (loan.installments_per_year ?? DEFAULT_INSTALLMENTS);
                let balance = restgjeld;
                const now = new Date();
                for (let i = 0; i < 12 && balance > 0; i++) {
                  const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                  const interest = Math.round(balance * r);
                  const principal = Math.min(Math.round(terminbelop - interest), balance);
                  balance = Math.max(0, balance - principal);
                  rows.push(
                    <tr key={i} className={i % 2 === 0 ? "" : "bg-gray-50"}>
                      <td className="py-0.5">{d.getMonth() + 1}/{d.getFullYear()}</td>
                      <td className="text-right text-red-500">{interest.toLocaleString("nb-NO")}</td>
                      <td className="text-right text-green-600">{principal.toLocaleString("nb-NO")}</td>
                      <td className="text-right text-gray-600">{balance.toLocaleString("nb-NO")}</td>
                    </tr>
                  );
                }
                return rows;
              })()}
            </tbody>
          </table>
          {totalRenter != null && totalBetalt != null && (
            <div className="mt-3 text-xs text-gray-400 text-right space-y-0.5">
              <div>Gjenstående rentekostnader: <span className="text-red-500 font-medium">{fmt(totalRenter)}</span></div>
              <div>Gjenstående totalt betalt: <span className="text-gray-600 font-medium">{fmt(totalBetalt)}</span></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Låneskjema ───────────────────────────────────────────────────────────────

function LoanForm({ form, setForm, assets }: { form: LoanForm; setForm: (f: LoanForm) => void; assets?: Asset[] }) {
  return (
    <div className="space-y-3 mb-5">
      <Field label="Navn *">
        <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder='F.eks. "Huslån DNB"' />
      </Field>
      <Field label="Type">
        <Select value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={LOAN_TYPES} />
      </Field>
      <Field label="Leverandør *">
        <Input value={form.provider} onChange={(v) => setForm({ ...form, provider: v })} placeholder='F.eks. "DNB"' />
      </Field>

      {assets && assets.length > 0 && (
        <Field label="Knyttet til eiendel (valgfritt)">
          <select
            value={form.asset_id}
            onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
            className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Ingen eiendel</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </Field>
      )}

      <div className="border-t border-gray-100 pt-3">
        <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Lånedetaljer</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lånebeløp (kr)">
            <Input type="number" value={form.loan_amount} onChange={(v) => setForm({ ...form, loan_amount: v })} placeholder="3 500 000" />
          </Field>
          <Field label="Restgjeld (kr)">
            <Input type="number" value={form.remaining_debt} onChange={(v) => setForm({ ...form, remaining_debt: v })} placeholder="3 200 000" />
          </Field>
          <Field label="Nominell rente (%)">
            <Input type="number" step="0.01" value={form.interest_rate} onChange={(v) => setForm({ ...form, interest_rate: v })} placeholder="5.29" />
          </Field>
          <Field label="Nedbetalingstid (år)">
            <Input type="number" value={form.repayment_years} onChange={(v) => setForm({ ...form, repayment_years: v })} placeholder="25" />
          </Field>
          <Field label="Terminer pr år">
            <Input type="number" value={form.installments_per_year} onChange={(v) => setForm({ ...form, installments_per_year: v })} placeholder="12" />
          </Field>
          <Field label="Termingebyr (kr)">
            <Input type="number" value={form.installment_fee} onChange={(v) => setForm({ ...form, installment_fee: v })} placeholder="0" />
          </Field>
        </div>
      </div>

      {/* Live kalkulering */}
      <LoanCalc form={form} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Sluttdato">
          <Input type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
        </Field>
      </div>
      <Field label="Notater">
        <Input value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Valgfritt" />
      </Field>
    </div>
  );
}

// ─── Hovedkomponent ───────────────────────────────────────────────────────────

export default function LanView({ loans: initLoans, assets = [], embedded = false }: Props) {
  const [loans, setLoans] = useState<Loan[]>(initLoans);
  const [showAdd, setShowAdd] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [form, setForm] = useState<LoanForm>({ ...emptyForm });
  const [editForm, setEditForm] = useState<LoanForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // ─── Budget sync helpers ─────────────────────────────────────────────────────

  const createLinkedBudgetItem = async (loanId: string, name: string, terminbelop: number, loanAmount: number | null) => {
    const { data: loanCat } = await supabase
      .from("budget_categories")
      .select("id")
      .eq("type", "loan")
      .maybeSingle();
    if (!loanCat) return;
    const { data: newItem } = await supabase
      .from("budget_items")
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

  // ─── Beregn terminbeløp fra form ────────────────────────────────────────────

  const calcTermin = (f: LoanForm): number => {
    const la = parseFloat(f.loan_amount) || 0;
    const r = parseFloat(f.interest_rate) || 0;
    const y = parseFloat(f.repayment_years) || 0;
    const t = parseInt(f.installments_per_year) || DEFAULT_INSTALLMENTS;
    const g = parseFloat(f.installment_fee) || 0;
    if (la > 0 && r > 0 && y > 0) return beregnTermin(la, r, y, t, g);
    return 0;
  };

  // ─── Save handlers ───────────────────────────────────────────────────────────

  const saveLoan = async () => {
    if (!form.name.trim() || !form.provider.trim()) return;
    setSaving(true);

    const terminbelop = calcTermin(form);
    const loanAmount = form.loan_amount ? parseInt(form.loan_amount) : null;

    const { data } = await supabase.from("loans").insert({
      name: form.name.trim(), type: form.type, provider: form.provider.trim(),
      loan_amount: loanAmount,
      remaining_debt: form.remaining_debt ? parseInt(form.remaining_debt) : loanAmount,
      interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : null,
      repayment_years: form.repayment_years ? parseInt(form.repayment_years) : null,
      installments_per_year: parseInt(form.installments_per_year) || DEFAULT_INSTALLMENTS,
      installment_fee: form.installment_fee ? parseFloat(form.installment_fee) : 0,
      monthly_payment: terminbelop || null,
      end_date: form.end_date || null,
      notes: form.notes.trim() || null,
      asset_id: form.asset_id || null,
    }).select().single();

    if (data) {
      const budgetItemId = terminbelop
        ? await createLinkedBudgetItem(data.id, form.name.trim(), terminbelop, loanAmount)
        : undefined;
      setLoans((p) => [...p, { ...data as Loan, budget_item_id: budgetItemId ?? null }]);
      setForm({ ...emptyForm });
      setShowAdd(false);
    }
    setSaving(false);
  };

  const updateLoan = async () => {
    if (!editingLoan || !editForm.name.trim() || !editForm.provider.trim()) return;
    setSaving(true);

    const terminbelop = calcTermin(editForm);
    const loanAmount = editForm.loan_amount ? parseInt(editForm.loan_amount) : null;

    const { data } = await supabase.from("loans").update({
      name: editForm.name.trim(), type: editForm.type, provider: editForm.provider.trim(),
      loan_amount: loanAmount,
      remaining_debt: editForm.remaining_debt ? parseInt(editForm.remaining_debt) : loanAmount,
      interest_rate: editForm.interest_rate ? parseFloat(editForm.interest_rate) : null,
      repayment_years: editForm.repayment_years ? parseInt(editForm.repayment_years) : null,
      installments_per_year: parseInt(editForm.installments_per_year) || DEFAULT_INSTALLMENTS,
      installment_fee: editForm.installment_fee ? parseFloat(editForm.installment_fee) : 0,
      monthly_payment: terminbelop || null,
      end_date: editForm.end_date || null,
      notes: editForm.notes.trim() || null,
      asset_id: editForm.asset_id || null,
    }).eq("id", editingLoan.id).select().single();

    if (data) {
      if (editingLoan.budget_item_id && terminbelop) {
        await syncBudgetItem(editingLoan.budget_item_id, editForm.name.trim(), terminbelop, loanAmount);
      } else if (!editingLoan.budget_item_id && terminbelop) {
        const budgetItemId = await createLinkedBudgetItem(editingLoan.id, editForm.name.trim(), terminbelop, loanAmount);
        (data as Loan).budget_item_id = budgetItemId ?? null;
      }
      setLoans((p) => p.map((l) => l.id === editingLoan.id ? data as Loan : l));
      setEditingLoan(null);
    }
    setSaving(false);
  };

  const deleteLoan = async (l: Loan) => {
    if (!confirm("Slett dette lånet? Tilknyttet budsjettpost slettes også.")) return;
    if (l.budget_item_id) await supabase.from("budget_items").delete().eq("id", l.budget_item_id);
    await supabase.from("loans").delete().eq("id", l.id);
    setLoans((p) => p.filter((x) => x.id !== l.id));
  };

  const totalRestgjeld = loans.reduce((s, l) => s + (l.remaining_debt ?? 0), 0);

  return (
    <main className={embedded ? "text-gray-900 p-6" : "min-h-screen bg-gray-50 text-gray-900 p-6"}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          {!embedded && <h1 className="text-lg font-semibold">Lån</h1>}
          {embedded && <div />}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nytt lån
          </button>
        </div>

        <div className="space-y-3">
          {loans.length === 0 && (
            <p className="text-center text-gray-400 py-10 text-sm">Ingen lån lagt til ennå.</p>
          )}
          {loans.map((l) => (
            <LoanCard
              key={l.id}
              loan={l}
              assetName={assets.find((a) => a.id === l.asset_id)?.name}
              onEdit={() => { setEditingLoan(l); setEditForm(loanToForm(l)); }}
              onDelete={() => deleteLoan(l)}
            />
          ))}
          {loans.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-right text-gray-500">
              Total restgjeld: <span className="text-gray-900 font-semibold">{fmt(totalRestgjeld)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Nytt lån ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Nytt lån</h2>
            <LoanForm form={form} setForm={setForm} assets={assets} />
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Avbryt</button>
              <button onClick={saveLoan} disabled={saving || !form.name.trim() || !form.provider.trim()}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white">
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
            <LoanForm form={editForm} setForm={setEditForm} assets={assets} />
            {editingLoan.budget_item_id && (
              <p className="text-xs text-green-600 bg-green-50 p-2 rounded-lg mb-3">Endringer synkroniseres automatisk til budsjettet.</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setEditingLoan(null)} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Avbryt</button>
              <button onClick={updateLoan} disabled={saving}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white">
                {saving ? "Lagrer…" : "Lagre endringer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
