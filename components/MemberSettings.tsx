"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { FamilyMember } from "@/lib/types";

const COLORS = [
  { label: "Blå", value: "bg-blue-500" },
  { label: "Grønn", value: "bg-green-500" },
  { label: "Lilla", value: "bg-purple-500" },
  { label: "Rosa", value: "bg-pink-500" },
  { label: "Oransje", value: "bg-orange-500" },
  { label: "Teal", value: "bg-teal-500" },
  { label: "Rød", value: "bg-red-500" },
  { label: "Indigo", value: "bg-indigo-500" },
];

const ROLES = [
  { value: "parent", label: "Forelder" },
  { value: "child", label: "Barn" },
  { value: "grandmother", label: "Bestemor" },
  { value: "grandfather", label: "Bestefar" },
  { value: "uncle", label: "Onkel" },
  { value: "aunt", label: "Tante" },
  { value: "trusted", label: "Tillitsperson" },
  { value: "other", label: "Annet" },
];

type EditForm = {
  name: string;
  role: string;
  color: string;
  birth_date: string;
  phone: string;
  email: string;
  permission_level: string;
  pin: string;
  pin_confirm: string;
};

type Props = {
  members: FamilyMember[];
};

export default function MemberSettings({ members: initialMembers }: Props) {
  const [members, setMembers] = useState<FamilyMember[]>(initialMembers);

  // --- Legg til nytt medlem ---
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("parent");
  const [saving, setSaving] = useState(false);

  // --- Redigering ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "", role: "", color: "", birth_date: "",
    phone: "", email: "", permission_level: "member", pin: "", pin_confirm: "",
  });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // --- Slett ---
  const [deleting, setDeleting] = useState<string | null>(null);

  const startEdit = (member: FamilyMember) => {
    setEditingId(member.id);
    setEditForm({
      name: member.name,
      role: member.role,
      color: member.color,
      birth_date: member.birth_date ?? "",
      phone: member.phone ?? "",
      email: member.email ?? "",
      permission_level: member.permission_level ?? "member",
      pin: "",
      pin_confirm: "",
    });
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editForm.name.trim()) { setEditError("Navn er påkrevd"); return; }

    // Valider PIN hvis admin
    if (editForm.permission_level === "admin") {
      if (editForm.pin && editForm.pin !== editForm.pin_confirm) {
        setEditError("PIN-kodene stemmer ikke overens");
        return;
      }
      if (editForm.pin && editForm.pin.length < 4) {
        setEditError("PIN må være minst 4 siffer");
        return;
      }
    }

    setEditSaving(true);
    setEditError("");

    // Finn eksisterende member for å beholde gammel PIN hvis ikke endret
    const existing = members.find((m) => m.id === editingId);

    const updateData: Partial<FamilyMember> = {
      name: editForm.name.trim(),
      role: editForm.role,
      color: editForm.color,
      birth_date: editForm.birth_date || null,
      phone: editForm.phone.trim() || null,
      email: editForm.email.trim() || null,
      permission_level: editForm.permission_level,
    };

    // Oppdater PIN kun hvis ny er angitt; null ut hvis member endres til ikke-admin
    if (editForm.permission_level === "admin") {
      if (editForm.pin) {
        updateData.pin = editForm.pin;
      } else {
        updateData.pin = existing?.pin ?? null; // behold gammel
      }
    } else {
      updateData.pin = null; // fjern PIN for ikke-admin
    }

    const { error } = await supabase
      .from("family_members")
      .update(updateData)
      .eq("id", editingId);

    if (error) {
      setEditError("Feil ved lagring: " + error.message);
    } else {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editingId ? { ...m, ...updateData } : m
        )
      );
      setEditingId(null);
    }
    setEditSaving(false);
  };

  const addMember = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("family_members")
      .insert({
        name: newName.trim(),
        role: newRole,
        color: COLORS[members.length % COLORS.length].value,
        permission_level: "member",
      })
      .select()
      .single();

    if (error) {
      alert("Feil: " + error.message);
    } else if (data) {
      setMembers((prev) => [...prev, data as FamilyMember]);
      setNewName("");
      setNewRole("parent");
    }
    setSaving(false);
  };

  const deleteMember = async (id: string) => {
    if (!confirm("Er du sikker? Dette sletter også alle aktiviteter for dette medlemmet.")) return;
    setDeleting(id);
    const { error } = await supabase.from("family_members").delete().eq("id", id);
    if (error) {
      alert("Feil: " + error.message);
    } else {
      setMembers((prev) => prev.filter((m) => m.id !== id));
    }
    setDeleting(null);
  };

  const roleLabel = (val: string) => ROLES.find((r) => r.value === val)?.label ?? val;

  return (
    <div className="max-w-lg">
      {/* Eksisterende medlemmer */}
      {members.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-3">Familiemedlemmer</h2>
          <div className="space-y-3">
            {members.map((member) =>
              editingId === member.id ? (
                // --- Redigeringsskjema ---
                <div key={member.id} className="bg-white rounded-xl p-5 border-2 border-blue-200">
                  <h3 className="font-semibold mb-4 text-blue-700">Rediger {member.name}</h3>

                  <div className="space-y-3">
                    {/* Navn */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Navn *</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full p-2 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    {/* Rolle */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Familierelasjon</label>
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                        className="w-full p-2 rounded-lg bg-gray-100 outline-none text-sm"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Farge */}
                    <div>
                      <label className="text-xs text-gray-500 mb-2 block">Farge</label>
                      <div className="flex flex-wrap gap-2">
                        {COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setEditForm((f) => ({ ...f, color: c.value }))}
                            className={`w-8 h-8 rounded-full ${c.value} transition-transform ${
                              editForm.color === c.value
                                ? "scale-125 ring-2 ring-offset-2 ring-gray-400"
                                : "hover:scale-110"
                            }`}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Fødselsdato */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Fødselsdato</label>
                      <input
                        type="date"
                        value={editForm.birth_date}
                        onChange={(e) => setEditForm((f) => ({ ...f, birth_date: e.target.value }))}
                        className="w-full p-2 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    {/* Telefon + E-post */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Telefon</label>
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="123 45 678"
                          className="w-full p-2 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">E-post</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                          placeholder="navn@epost.no"
                          className="w-full p-2 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>

                    {/* Tilgangsnivå */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tilgangsnivå</label>
                      <select
                        value={editForm.permission_level}
                        onChange={(e) => setEditForm((f) => ({ ...f, permission_level: e.target.value, pin: "", pin_confirm: "" }))}
                        className="w-full p-2 rounded-lg bg-gray-100 outline-none text-sm"
                      >
                        <option value="member">👤 Familiemedlem – Aktiviteter og Innkjøp</option>
                        <option value="admin">🔐 Super Bruker – Full tilgang</option>
                      </select>
                    </div>

                    {/* PIN – kun for admin */}
                    {editForm.permission_level === "admin" && (
                      <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                        <p className="text-xs text-blue-600 font-medium">
                          {member.pin ? "Endre PIN (la stå tomt for å beholde nåværende)" : "Sett PIN for Super Bruker"}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Ny PIN</label>
                            <input
                              type="password"
                              inputMode="numeric"
                              value={editForm.pin}
                              onChange={(e) => setEditForm((f) => ({ ...f, pin: e.target.value }))}
                              placeholder="Min. 4 siffer"
                              className="w-full p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Bekreft PIN</label>
                            <input
                              type="password"
                              inputMode="numeric"
                              value={editForm.pin_confirm}
                              onChange={(e) => setEditForm((f) => ({ ...f, pin_confirm: e.target.value }))}
                              placeholder="Gjenta PIN"
                              className="w-full p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Feil */}
                    {editError && (
                      <p className="text-red-500 text-sm">{editError}</p>
                    )}

                    {/* Knapper */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={cancelEdit}
                        className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
                      >
                        Avbryt
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={editSaving}
                        className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white transition-colors text-sm font-medium"
                      >
                        {editSaving ? "Lagrer..." : "Lagre"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // --- Visningskort ---
                <div key={member.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full ${member.color} flex items-center justify-center text-white font-bold text-base flex-shrink-0`}
                    >
                      {member.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <span>{roleLabel(member.role)}</span>
                        {member.birth_date && (
                          <span>· 🎂 {new Date(member.birth_date + "T00:00:00").toLocaleDateString("nb-NO", { day: "numeric", month: "long" })}</span>
                        )}
                        {member.phone && <span>· 📞 {member.phone}</span>}
                      </div>
                      <div className="text-xs mt-0.5">
                        {member.permission_level === "admin" ? (
                          <span className="text-blue-500">🔐 Super Bruker</span>
                        ) : (
                          <span className="text-gray-400">👤 Familiemedlem</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(member)}
                      className="text-gray-400 hover:text-blue-500 transition-colors text-sm px-2 py-1"
                    >
                      Rediger
                    </button>
                    <button
                      onClick={() => deleteMember(member.id)}
                      disabled={deleting === member.id}
                      className="text-gray-400 hover:text-red-500 transition-colors text-sm px-2 py-1 disabled:opacity-50"
                    >
                      {deleting === member.id ? "Sletter..." : "Slett"}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Legg til nytt medlem */}
      {editingId === null && (
        <div>
          <h2 className="text-lg font-medium mb-3">Legg til familiemedlem</h2>
          <div className="bg-white p-4 rounded-xl">
            <input
              type="text"
              placeholder="Navn"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMember()}
              className="w-full mb-2 p-2 rounded bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full mb-3 p-2 rounded bg-gray-100 outline-none text-sm"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button
              onClick={addMember}
              disabled={saving || !newName.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 p-2 rounded font-medium transition-colors text-white text-sm"
            >
              {saving ? "Lagrer..." : "Legg til"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
